import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import styles from "./styles/PasswordResetScreen";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AuthHeader,
  authScreenStyles,
  Banner,
  Button,
  FormField,
  getAuthErrorMessage,
  passwordSchema,
  requestJson,
  resetSchema,
  SectionTitle,
  type BannerTone,
  type ResetValues
} from "./authShared";

const changePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

type PasswordResetScreenProps = {
  onGoLogin: () => void;
};

export function PasswordResetScreen({ onGoLogin }: PasswordResetScreenProps) {
  const [step, setStep] = useState<"request" | "change" | "success">("request");
  const [feedback, setFeedback] = useState<{ tone: BannerTone; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const requestForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" }
  });

  const changeForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" }
  });

  const handleRequestReset = requestForm.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      await requestJson("/users/forgot-password", values);
      setFeedback({ tone: "success", message: "A password recovery link has been sent to your email address." });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getAuthErrorMessage(error, "Unable to send recovery link right now.")
      });
    } finally {
      setLoading(false);
    }
  });

  const handleChangePassword = changeForm.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      await requestJson("/users/password-reset", { new_password: values.password }, "PATCH");
      setFeedback({ tone: "success", message: "Password updated successfully!" });
      setStep("success");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getAuthErrorMessage(error, "Failed to change password. Try again.")
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScrollView contentContainerStyle={authScreenStyles.content} keyboardShouldPersistTaps="handled">
      <View style={authScreenStyles.shell}>
        <AuthHeader />

        {step === "request" && (
          <>
            <SectionTitle title="Reset password" subtitle="Enter your registered email address to receive a secure recovery link." />
            <Banner tone={feedback?.tone ?? "info"} message={feedback?.message ?? ""} />

            <View style={styles.card}>
              <FormField
                control={requestForm.control}
                name="email"
                label="Email Address"
                placeholder="coach@gmail.com"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                error={requestForm.formState.errors.email?.message}
              />
              <Button label="Send Recovery Link" loading={loading} onPress={handleRequestReset} />
            </View>
          </>
        )}

        {step === "change" && (
          <>
            <SectionTitle title="Set new password" subtitle="Enter and confirm your new password below." />
            <Banner tone={feedback?.tone ?? "info"} message={feedback?.message ?? ""} />

            <View style={styles.card}>
              <FormField
                control={changeForm.control}
                name="password"
                label="New Password"
                placeholder="••••••••"
                secureTextEntry
                error={changeForm.formState.errors.password?.message}
              />
              <FormField
                control={changeForm.control}
                name="confirmPassword"
                label="Confirm New Password"
                placeholder="••••••••"
                secureTextEntry
                error={changeForm.formState.errors.confirmPassword?.message}
              />
              <Button label="Update Password" loading={loading} onPress={handleChangePassword} />
            </View>
          </>
        )}

        {step === "success" && (
          <>
            <SectionTitle title="Password Changed" subtitle="Your password has been reset successfully." />
            <Banner tone="success" message={feedback?.message ?? "You can now sign in with your new password."} />
            <Button label="Go to Login" onPress={onGoLogin} />
          </>
        )}

        <Text style={styles.back} onPress={onGoLogin}>← Back to Login</Text>
      </View>
    </ScrollView>
  );
}


