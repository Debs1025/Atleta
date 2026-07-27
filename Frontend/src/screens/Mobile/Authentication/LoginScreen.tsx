import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banner, Button, FormField, SectionTitle, authErrorMessage, extractAuthRole, extractAuthToken, loginSchema, requestJson, storeAuthRole, storeAuthToken, type AuthRole, type LoginValues } from "./authShared";

type LoginScreenProps = {
  onGoSignup: () => void;
  onGoReset: () => void;
  onAuthenticated?: (role: AuthRole) => void;
};

export function LoginScreen({ onGoSignup, onGoReset, onAuthenticated }: LoginScreenProps) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      const result = await requestJson("/api/auth/login", values);
      const token = extractAuthToken(result);
      const role = extractAuthRole(result, values.email);

      if (token) {
        await storeAuthToken(token);
      }
      await storeAuthRole(role);

      onAuthenticated?.(role);
      form.reset(values);
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
      const fallback = error instanceof Error ? error.message : "Unable to sign in right now.";

      setFeedback({
        tone: "error",
        message: authErrorMessage(status, fallback)
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <Text style={styles.brand}>ATLETA</Text>
        <View style={styles.rule} />

        <SectionTitle title="Welcome back" subtitle="Sign in to access your personalized athlete and coach features." />
        <Banner tone={feedback?.tone ?? "info"} message={feedback?.message ?? ""} />

        <FormField control={form.control} name="email" label="E-mail" placeholder="coach@gmail.com" autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" error={form.formState.errors.email?.message} />
        <FormField control={form.control} name="password" label="Password" placeholder="Password" secureTextEntry textContentType="password" error={form.formState.errors.password?.message} />

        <Button label="Login" loading={loading} onPress={submit} />

        <Text style={styles.link} onPress={onGoReset}>
          Forgot Password?
        </Text>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.or}>or</Text>
          <View style={styles.divider} />
        </View>

        <Button label="Login with Google" variant="secondary" icon={require("../../../assets/google.png")} onPress={() => setFeedback({ tone: "info", message: "Google sign-in is ready for your backend or Firebase OAuth flow." })} />
        <View style={styles.spacer} />
        <Button label="Login with Facebook" variant="secondary" icon={require("../../../assets/facebook.png")} onPress={() => setFeedback({ tone: "info", message: "Facebook sign-in can be connected to your auth provider later." })} />

        <Text style={styles.footer}>
          Don&apos;t have an account? <Text style={styles.footerLink} onPress={onGoSignup}>Sign Up</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  link: {
    color: "#16203f",
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 18,
    textAlign: "center"
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
  }
});
