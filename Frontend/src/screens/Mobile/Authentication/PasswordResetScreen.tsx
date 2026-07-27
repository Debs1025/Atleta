import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banner, Button, FormField, SectionTitle, authErrorMessage, requestJson, resetSchema, type ResetValues } from "./authShared";

type PasswordResetScreenProps = {
  onGoLogin: () => void;
};

export function PasswordResetScreen({ onGoLogin }: PasswordResetScreenProps) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: ""
    }
  });

  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      await requestJson("/api/auth/reset-password", values);
      setFeedback({ tone: "success", message: "If the account exists, a secure recovery link was sent." });
      form.reset(values);
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
      const fallback = error instanceof Error ? error.message : "Unable to send the recovery link right now.";
      setFeedback({ tone: "error", message: authErrorMessage(status, fallback) });
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <Text style={styles.brand}>ATLETA</Text>
        <View style={styles.rule} />

        <SectionTitle title="Reset password" subtitle="Enter your registered email address to receive a secure recovery link." />
        <Banner tone={feedback?.tone ?? "info"} message={feedback?.message ?? ""} />

        <View style={styles.card}>
          <FormField control={form.control} name="email" label="Email Address" placeholder="coach@gmail.com" autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" error={form.formState.errors.email?.message} />
          <Button label="Send Recovery Link" loading={loading} onPress={submit} />
        </View>

        <Text style={styles.back} onPress={onGoLogin}>← Back to Login</Text>
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
  card: {
    borderColor: "#141c3a",
    borderWidth: 1,
    padding: 20
  },
  back: {
    color: "#141c3a",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 18,
    textAlign: "center"
  }
});
