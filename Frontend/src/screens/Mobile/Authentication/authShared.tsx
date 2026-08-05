import { useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type TextInputProps
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { type DocumentPickerAsset } from "expo-document-picker";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import { z } from "zod";


// Configuration
const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

export const API_BASE = runtime.process?.env?.EXPO_PUBLIC_ATLETA_API ?? "";
export const AUTH_TOKEN_KEY = runtime.process?.env?.EXPO_PUBLIC_AUTH_TOKEN_KEY ?? "";
export const AUTH_ROLE_KEY = runtime.process?.env?.EXPO_PUBLIC_AUTH_ROLE_KEY ?? "";
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;

// Types
export type BannerTone = "error" | "success" | "info";
export type AuthRole = "athlete" | "coach";
export type AuthStep = 1 | 2 | 3;
export type StoredUpload = Pick<DocumentPickerAsset, "name" | "uri" | "mimeType" | "size">;

// Data Validation
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    "Enter a valid email address."
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Password must include at least 1 uppercase letter.")
  .regex(/[@$!%*?&]/, "Password must include at least 1 special symbol (@$!%*?&).");

export const contactSchema = z
  .string()
  .trim()
  .min(1, "Contact number is required.")
  .regex(/^09\d{9}$/, "Contact number must be 11 digits starting (09xxxxxxxxx).");

export const athleteSignupSchema = z.object({
  role: z.literal("athlete"),
  first_name: z.string().trim().min(1, "First name is required.").max(255, "First name is too long."),
  last_name: z.string().trim().min(1, "Last name is required.").max(255, "Last name is too long."),
  email: emailSchema,
  password: passwordSchema,
  contact_number: contactSchema,
  birthdate: z.string().trim().min(1, "Birthdate is required.").refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Birthdate must use the YYYY-MM-DD format."
  }),
  gender: z.enum(["Male", "Female"], {
    errorMap: () => ({ message: "Select a gender." })
  }),
  province: z.string().trim().min(1, "Province is required.").max(255, "Province is too long."),
  sport_type: z.enum(["Basketball", "Swimming", "Track and Field"], {
    errorMap: () => ({ message: "Select a sport type." })
  }),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service and Privacy Protocol."
  })
});

export const coachSignupSchema = z.object({
  role: z.literal("coach"),
  first_name: z.string().trim().min(1, "First name is required.").max(255, "First name is too long."),
  last_name: z.string().trim().min(1, "Last name is required.").max(255, "Last name is too long."),
  email: emailSchema,
  password: passwordSchema,
  contact_number: contactSchema,
  certification_license_num: z.string().trim().max(100, "License number is too long.").optional().or(z.literal("")),
  years_of_experience: z.coerce.number({ invalid_type_error: "Years of experience is required." }).int().min(0).max(60),
  current_institution: z.string().trim().min(1, "Current institution is required.").max(255, "Current institution is too long."),
  eligible_documents: z
    .object({
      name: z.string().optional(),
      uri: z.string(),
      mimeType: z.string().optional().nullable(),
      size: z.number().optional().nullable()
    })
    .nullable()
    .refine((value) => Boolean(value), {
      message: "Please upload an eligible document."
    }),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service and Privacy Protocol."
  })
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const resetSchema = z.object({
  email: emailSchema
});

export type AthleteSignupValues = z.infer<typeof athleteSignupSchema>;
export type CoachSignupValues = z.infer<typeof coachSignupSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ResetValues = z.infer<typeof resetSchema>;

// Error Handling
const AUTH_ERROR_MAP: Record<number, string> = {
  400: "Validation failed. Check the highlighted fields and try again.",
  401: "Unauthorized. Please verify your email and password.",
  409: "An account already exists for that email address."
};

export function authErrorMessage(status: number | undefined, fallback: string) {
  return (status && AUTH_ERROR_MAP[status]) || fallback;
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
  const message = error instanceof Error ? error.message : fallback;
  return authErrorMessage(status, message);
}

// This lets users to stay logged in when reopenning the app
export async function storeAuthToken(token: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

// This keeps the role of the user when reopening the app
export async function storeAuthRole(role: AuthRole) {
  await SecureStore.setItemAsync(AUTH_ROLE_KEY, role);
}

export async function getStoredAuthRole(): Promise<AuthRole | null> {
  const role = await SecureStore.getItemAsync(AUTH_ROLE_KEY).catch(() => null);
  return role === "coach" || role === "athlete" ? role : null;
}

export function extractAuthToken(payload: Record<string, unknown>) {
  const token = payload.token ?? payload.access_token ?? payload.jwt;
  return typeof token === "string" && token.length > 0 ? token : null;
}

export function extractAuthRole(payload: Record<string, unknown>, emailFallback?: string): AuthRole {
  const role = payload.role ?? (payload.user as { role?: string } | undefined)?.role;
  if (role === "athlete" || role === "coach") return role;
  return emailFallback?.toLowerCase().includes("coach") ? "coach" : "athlete";
}

// API Request (change this if backend api is ready)
function mockAuthResponse(path: string) {
  const isAuth = path.includes("login") || path.includes("register");
  return {
    ...(isAuth ? { token: "local-dev-token" } : {}),
    message: "Local frontend auth mode. Set EXPO_PUBLIC_ATLETA_API to use the backend."
  };
}

async function withRequestTimeout<T>(request: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The API request timed out. Check your backend URL and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchApi(path: string, options: RequestInit) {
  if (!API_BASE) return mockAuthResponse(path);

  const response = await withRequestTimeout((signal) =>
    fetch(`${API_BASE}${path}`, { ...options, signal })
  );

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const error = new Error((payload.message as string | undefined) ?? "Something went wrong.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload;
}

// Handles json requests
export function requestJson(path: string, body: unknown) {
  return fetchApi(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

// Handles file upload requests
export function requestMultipart(path: string, body: FormData) {
  return fetchApi(path, {
    method: "POST",
    headers: { Accept: "application/json" },
    body
  });
}

// UI Components
export function Banner({ tone, message }: { tone: BannerTone; message?: string | null }) {
  if (!message) return null;
  return (
    <View style={[bannerStyles.banner, bannerStyles[tone]]}>
      <Text style={bannerStyles.text}>{message}</Text>
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  helperText?: string;
  error?: string;
  rightAccessory?: ReactNode;
};

export function Field({ label, helperText, error, rightAccessory, style, ...props }: FieldProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputWrap, error ? fieldStyles.inputError : undefined]}>
        <TextInput
          ref={inputRef}
          placeholderTextColor="#9aa2b8"
          style={[fieldStyles.input, rightAccessory ? fieldStyles.inputWithAccessory : undefined, style]}
          {...props}
        />
        {rightAccessory ? (
          <Pressable accessibilityRole="button" onPress={() => inputRef.current?.focus()} style={fieldStyles.rightAccessory}>
            {rightAccessory}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : helperText ? <Text style={fieldStyles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

type FormFieldProps<T extends FieldValues> = Omit<FieldProps, "value" | "onChangeText" | "onBlur"> & {
  control: Control<T>;
  name: Path<T>;
};

export function FormField<T extends FieldValues>({ control, name, ...props }: FormFieldProps<T>) {
  const { field } = useController({ control, name });

  return (
    <Field
      {...props}
      value={field.value === null || field.value === undefined ? "" : String(field.value)}
      onBlur={field.onBlur}
      onChangeText={field.onChange}
    />
  );
}

export function MinimalistCalendarIcon({ size = 22, color = "#141c3a" }: { size?: number; color?: string }) {
  const width = size;
  const height = Math.round(size * 1.05);
  const ringHeight = Math.round(size * 0.22);
  const ringWidth = 2.2;
  const borderWidth = 1.8;
  const borderRadius = 4;
  const dotSize = Math.max(2.5, Math.round(size * 0.13));

  return (
    <View style={{ width, height, justifyContent: "flex-end", alignItems: "center" }}>
      <View style={[calendarStyles.ringRow, { left: width * 0.12, right: width * 0.12 }]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ width: ringWidth, height: ringHeight, backgroundColor: color, borderRadius: ringWidth / 2 }} />
        ))}
      </View>

      <View style={{ width, height: height * 0.88, borderWidth, borderColor: color, borderRadius, overflow: "hidden" }}>
        <View style={{ height: Math.round(height * 0.2), borderBottomWidth: borderWidth, borderBottomColor: color, width: "100%" }} />
        <View style={calendarStyles.dotGrid}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={calendarStyles.dotRow}>
              {[0, 1, 2].map((col) => (
                <View key={col} style={{ width: dotSize, height: dotSize, backgroundColor: color, borderRadius: 0.5 }} />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  icon?: ImageSourcePropType;
};

export function Button({ label, onPress, loading = false, variant = "primary", icon }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        buttonStyles.base,
        buttonStyles[variant],
        pressed && !loading && buttonStyles.pressed,
        loading && buttonStyles.disabled
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#16203f" : "#fff"} />
      ) : (
        <View style={buttonStyles.contentRow}>
          {icon ? <Image source={icon} style={buttonStyles.icon} /> : null}
          <Text style={[buttonStyles.text, variant === "secondary" && buttonStyles.secondaryText, variant === "ghost" && buttonStyles.ghostText]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function RolePill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[pillStyles.pill, selected && pillStyles.selected]}>
      <Text style={[pillStyles.text, selected && pillStyles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={titleStyles.wrap}>
      <Text style={titleStyles.title}>{title}</Text>
      {subtitle ? <Text style={titleStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function StepBadge({ step, label, active }: { step: number; label: string; active: boolean }) {
  return (
    <View style={[stepStyles.badge, active && stepStyles.badgeActive]}>
      <Text style={[stepStyles.step, active && stepStyles.stepActive]}>{step}</Text>
      <Text style={[stepStyles.label, active && stepStyles.labelActive]}>{label}</Text>
    </View>
  );
}

export function FullScreenOverlay({ label }: { label: string }) {
  return (
    <View style={overlayStyles.overlay}>
      <ActivityIndicator size="large" color="#d6def8" />
      <Text style={overlayStyles.text}>{label}</Text>
    </View>
  );
}

type CheckboxProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  error?: string;
};

export function Checkbox({ value, onValueChange, label, error }: CheckboxProps) {
  return (
    <View style={checkboxStyles.wrap}>
      <Pressable
        onPress={() => onValueChange(!value)}
        style={({ pressed }) => [
          checkboxStyles.container,
          pressed && checkboxStyles.pressed
        ]}
      >
        <View style={[checkboxStyles.box, value && checkboxStyles.boxChecked, error ? checkboxStyles.boxError : undefined]}>
          {value ? <Text style={checkboxStyles.checkmark}>✓</Text> : null}
        </View>
        <Text style={checkboxStyles.label}>{label}</Text>
      </Pressable>
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function AuthHeader() {
  return (
    <>
      <Text style={authScreenStyles.brand}>ATLETA</Text>
      <View style={authScreenStyles.rule} />
    </>
  );
}

// Styles
export const authScreenStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    paddingBottom: 36
  },
  shell: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 72
  },
  brand: {
    color: "#141c3a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.3
  },
  rule: {
    backgroundColor: "#141c3a",
    height: 1,
    marginVertical: 28,
    opacity: 0.8
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 18
  },
  divider: {
    backgroundColor: "#e5d2d2",
    flex: 1,
    height: 1
  },
  or: {
    color: "#6b7280",
    fontSize: 14,
    marginHorizontal: 18
  },
  spacer: {
    height: 12
  },
  footer: {
    color: "#6b7280",
    fontSize: 16,
    marginTop: 22,
    textAlign: "center"
  },
  footerLink: {
    color: "#141c3a",
    fontWeight: "800"
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6
  }
});

const bannerStyles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  error: {
    backgroundColor: "#fff1f2",
    borderColor: "#ef4444"
  },
  success: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981"
  },
  info: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb"
  },
  text: {
    color: "#16203f",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  }
});

const fieldStyles = StyleSheet.create({
  group: {
    marginBottom: 14
  },
  label: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6
  },
  input: {
    color: "#1f2937",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    flex: 1,
    backgroundColor: "#fff"
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#a3a3a3",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 54
  },
  inputWithAccessory: {
    paddingRight: 8
  },
  inputError: {
    borderColor: "#ef4444"
  },
  rightAccessory: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  helperText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 6
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6
  }
});

const calendarStyles = StyleSheet.create({
  ringRow: {
    position: "absolute",
    top: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 2
  },
  dotGrid: {
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 1
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "68%"
  }
});

const buttonStyles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18
  },
  contentRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center"
  },
  icon: {
    height: 22,
    marginRight: 10,
    resizeMode: "contain",
    width: 22
  },
  primary: {
    backgroundColor: "#141c3a"
  },
  secondary: {
    backgroundColor: "#fff",
    borderColor: "#141c3a",
    borderWidth: 1
  },
  ghost: {
    backgroundColor: "transparent"
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.68
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  secondaryText: {
    color: "#141c3a"
  },
  ghostText: {
    color: "#141c3a"
  }
});

const pillStyles = StyleSheet.create({
  pill: {
    borderColor: "#cbd5e1",
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10
  },
  selected: {
    backgroundColor: "#141c3a",
    borderColor: "#141c3a"
  },
  text: {
    color: "#141c3a",
    fontSize: 14,
    fontWeight: "800"
  },
  selectedText: {
    color: "#fff"
  }
});

const titleStyles = StyleSheet.create({
  wrap: {
    marginBottom: 18
  },
  title: {
    color: "#141c3a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 6
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20
  }
});

const stepStyles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  badgeActive: {
    backgroundColor: "#e0e7ff"
  },
  step: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    marginRight: 10
  },
  stepActive: {
    color: "#141c3a"
  },
  label: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700"
  },
  labelActive: {
    color: "#141c3a"
  }
});

const overlayStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.74)",
    justifyContent: "center",
    zIndex: 50
  },
  text: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12
  }
});

const checkboxStyles = StyleSheet.create({
  wrap: {
    marginVertical: 14
  },
  container: {
    alignItems: "flex-start",
    flexDirection: "row"
  },
  pressed: {
    opacity: 0.8
  },
  box: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#a3a3a3",
    borderRadius: 4,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
    width: 22
  },
  boxChecked: {
    backgroundColor: "#141c3a",
    borderColor: "#141c3a"
  },
  boxError: {
    borderColor: "#ef4444"
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900"
  },
  label: {
    color: "#4b5563",
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19
  }
});
