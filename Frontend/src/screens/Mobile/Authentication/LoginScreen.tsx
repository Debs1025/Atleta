import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import styles from "./styles/LoginScreen";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AuthHeader,
  authScreenStyles,
  Banner,
  Button,
  FormField,
  getAuthErrorMessage,
  SectionTitle,
  extractAuthRole,
  extractAuthToken,
  loginSchema,
  requestJson,
  storeAuthRole,
  storeAuthToken,
  type AuthRole,
  type BannerTone,
  type LoginValues
} from "./authShared";

type LoginScreenProps = {
  onGoSignup: () => void;
  onGoReset: () => void;
  onAuthenticated?: (role: AuthRole) => void;
};

export function LoginScreen({ onGoSignup, onGoReset, onAuthenticated }: LoginScreenProps) {
  const [feedback, setFeedback] = useState<{ tone: BannerTone; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  // ============================================================================
  // BACKEND API CONNECTION: LOGIN
  // - API Endpoint: POST `${API_BASE}/api/auth/login`
  // - Request Payload: { email: string, password: string }
  // - Expected Response: { token: string, role?: "athlete" | "coach", user?: { id: string, role: string } }
  // - Error Statuses: 400 (Validation), 401 (Invalid Credentials)
  // ============================================================================
  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      // API call automatically routes to your backend when EXPO_PUBLIC_ATLETA_API is configured
      const result = await requestJson("/api/auth/login", values);
      const token = extractAuthToken(result);
      const role = extractAuthRole(result, values.email);

      if (token) await storeAuthToken(token);
      await storeAuthRole(role);

      onAuthenticated?.(role);
      form.reset(values);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getAuthErrorMessage(error, "Unable to sign in right now.")
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScrollView contentContainerStyle={authScreenStyles.content} keyboardShouldPersistTaps="handled">
      <View style={authScreenStyles.shell}>
        <AuthHeader />
        <SectionTitle title="Welcome back" subtitle="Sign in to access your personalized athlete and coach features." />
        <Banner tone={feedback?.tone ?? "info"} message={feedback?.message ?? ""} />

        <FormField
          control={form.control}
          name="email"
          label="E-mail"
          placeholder="coach@gmail.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={form.formState.errors.email?.message}
        />
        <FormField
          control={form.control}
          name="password"
          label="Password"
          placeholder="Password"
          secureTextEntry
          textContentType="password"
          error={form.formState.errors.password?.message}
        />

        <Button label="Login" loading={loading} onPress={submit} />

        <Text style={styles.link} onPress={onGoReset}>
          Forgot Password?
        </Text>

        <View style={authScreenStyles.dividerRow}>
          <View style={authScreenStyles.divider} />
          <Text style={authScreenStyles.or}>or</Text>
          <View style={authScreenStyles.divider} />
        </View>

        {/* 
          BACKEND OAUTH INTEGRATION PLACEHOLDER:
          When connecting Google OAuth with your backend / Firebase Auth / Expo AuthSession:
          1. Obtain idToken or accessToken from Google OAuth Provider SDK
          2. Call requestJson("/api/auth/google", { idToken })
        */}
        <Button
          label="Login with Google"
          variant="secondary"
          icon={require("../../../assets/google.png")}
          onPress={() => setFeedback({ tone: "info", message: "Google sign-in is ready for your backend or Firebase OAuth flow." })}
        />
        <View style={authScreenStyles.spacer} />
        {/* 
          BACKEND OAUTH INTEGRATION PLACEHOLDER:
          When connecting Facebook OAuth with your backend:
          1. Call requestJson("/api/auth/facebook", { accessToken })
        */}
        <Button
          label="Login with Facebook"
          variant="secondary"
          icon={require("../../../assets/facebook.png")}
          onPress={() => setFeedback({ tone: "info", message: "Facebook sign-in can be connected to your auth provider later." })}
        />

        <Text style={authScreenStyles.footer}>
          Don&apos;t have an account? <Text style={authScreenStyles.footerLink} onPress={onGoSignup}>Sign Up</Text>
        </Text>
      </View>
    </ScrollView>
  );
}


