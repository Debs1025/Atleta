import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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

  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
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

        <Button
          label="Login with Google"
          variant="secondary"
          icon={require("../../../assets/google.png")}
          onPress={() => setFeedback({ tone: "info", message: "Google sign-in is ready for your backend or Firebase OAuth flow." })}
        />
        <View style={authScreenStyles.spacer} />
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

const styles = StyleSheet.create({
  link: {
    color: "#16203f",
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 18,
    textAlign: "center"
  }
});
