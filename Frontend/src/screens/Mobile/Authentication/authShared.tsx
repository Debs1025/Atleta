import { useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type TextInputProps
} from "react-native";
import {
  authScreenStyles,
  bannerStyles,
  buttonStyles,
  calendarStyles,
  checkboxStyles,
  fieldStyles,
  overlayStyles,
  pillStyles,
  stepStyles,
  titleStyles,
} from "./styles/authShared";
import * as SecureStore from "expo-secure-store";
import { type DocumentPickerAsset } from "expo-document-picker";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import { z } from "zod";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const rawApiBase = (runtime.process?.env?.EXPO_PUBLIC_ATLETA_API ?? "").trim().replace(/\/+$/, "");
export const API_BASE = rawApiBase
  ? rawApiBase.endsWith("/api/v1")
    ? rawApiBase
    : `${rawApiBase}/api/v1`
  : "";
export const AUTH_TOKEN_KEY = (runtime.process?.env?.EXPO_PUBLIC_AUTH_TOKEN_KEY ?? "").trim().replace(/[^a-zA-Z0-9._-]/g, "_");
export const AUTH_ROLE_KEY = (runtime.process?.env?.EXPO_PUBLIC_AUTH_ROLE_KEY ?? "").trim().replace(/[^a-zA-Z0-9._-]/g, "_");
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
  400: "Validation failed. Check if your details are correct and try again.",
  401: "Unauthorized. Please verify your email and password.",
  409: "An account already exists for that email address."
};

export function sanitizeUserErrorMessage(message: string): string {
  if (!message) return "An unexpected error occurred. Please try again.";
  
  if (
    message.includes("initializeApp") ||
    message.includes("Google OAuth2") ||
    message.includes("default credentials") ||
    message.includes("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("EXPO_PUBLIC")
  ) {
    return "Authentication service is temporarily unavailable. Please try again later.";
  }
  if (message.includes("Internal server error")) {
    return "Something went wrong on our server. Please try again later.";
  }
  return message;
}

export function authErrorMessage(status: number | undefined, fallback: string) {
  return (status && AUTH_ERROR_MAP[status]) || fallback;
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message && error.message !== "Something went wrong.") {
    return sanitizeUserErrorMessage(error.message);
  }
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
  return authErrorMessage(status, fallback);
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
  const rawRole = (payload.role ?? (payload.user as { role?: string } | undefined)?.role) as string | undefined;
  if (typeof rawRole === "string") {
    const lower = rawRole.toLowerCase();
    if (lower === "coach") return "coach";
    if (lower === "athlete") return "athlete";
  }
  return emailFallback?.toLowerCase().includes("coach") ? "coach" : "athlete";
}

async function withRequestTimeout<T>(request: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request Timeout, Try Again Later.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchApi(path: string, options: RequestInit) {
  const response = await withRequestTimeout((signal) =>
    fetch(`${API_BASE}${path}`, { ...options, signal })
  );

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    let serverMessage: string | undefined = typeof payload.error === "string" ? payload.error : typeof payload.message === "string" ? payload.message : undefined;
    if (serverMessage === "Internal server error." && typeof payload.details === "string") {
      serverMessage = `Internal server error: ${payload.details}`;
    }
    if (!serverMessage && Array.isArray(payload.errors) && payload.errors.length > 0) {
      serverMessage = (payload.errors[0] as { message?: string }).message;
    }
    const error = new Error(serverMessage ?? "Something went wrong.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload;
}


export async function getStoredAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY).catch(() => null);
}

// Handles authenticated JSON requests with Authorization Bearer header
export async function requestAuthenticatedJson(path: string, method: string = "GET", body?: unknown) {
  const token = await getStoredAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return fetchApi(path, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
}

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

export {
  authScreenStyles,
  bannerStyles,
  buttonStyles,
  calendarStyles,
  checkboxStyles,
  fieldStyles,
  overlayStyles,
  pillStyles,
  stepStyles,
  titleStyles,
};

