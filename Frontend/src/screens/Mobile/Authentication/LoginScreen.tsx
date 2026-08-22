import { useEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import styles from "./styles/LoginScreen";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
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

  const googleAndroidId = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_ANDROID_ID") ?? "").trim();
  const googleIosId = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_IOS_ID") ?? "").trim();

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidId,
    iosClientId: googleIosId
  });

  const [facebookRequest, facebookResponse, promptFacebookAsync] = Facebook.useAuthRequest({
    clientId: (runtimeProcessEnv("EXPO_PUBLIC_FACEBOOK_APP_ID") ?? "").trim()
  });

  const handleSocialAuthWithToken = async (provider: "google" | "facebook", idToken: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const endpoint = provider === "google" ? "/users/google-login" : "/users/facebook-login";
      const result = await requestJson(endpoint, { id_token: idToken, idToken, provider, role: "Athlete" });
      const token = extractAuthToken(result);
      const role = extractAuthRole(result);

      if (token) await storeAuthToken(token);
      await storeAuthRole(role);

      onAuthenticated?.(role);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getAuthErrorMessage(error, `Unable to authenticate with ${provider}.`)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (idToken) {
        handleSocialAuthWithToken("google", idToken);
      }
    }
  }, [googleResponse]);

  useEffect(() => {
    if (facebookResponse?.type === "success") {
      const fbToken = facebookResponse.authentication?.accessToken || facebookResponse.params?.access_token;
      if (fbToken) {
        handleSocialAuthWithToken("facebook", fbToken);
      }
    }
  }, [facebookResponse]);

  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      const result = await requestJson("/users/login", values);
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
          onPress={() => {
            const hasGoogleId = !!(googleAndroidId || googleIosId);
            if (googleRequest && hasGoogleId) {
              promptGoogleAsync();
            } else {
              setFeedback({ tone: "error", message: "Google sign-in is currently unavailable on this device." });
            }
          }}
        />
        <View style={authScreenStyles.spacer} />
        <Button
          label="Login with Facebook"
          variant="secondary"
          icon={require("../../../assets/facebook.png")}
          onPress={() => {
            const hasFacebookId = !!runtimeProcessEnv("EXPO_PUBLIC_FACEBOOK_APP_ID")?.trim();
            if (facebookRequest && hasFacebookId) {
              promptFacebookAsync();
            } else {
              setFeedback({ tone: "error", message: "Facebook sign-in is currently unavailable on this device." });
            }
          }}
        />

        <Text style={authScreenStyles.footer}>
          Don&apos;t have an account? <Text style={authScreenStyles.footerLink} onPress={onGoSignup}>Sign Up</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

function runtimeProcessEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[key];
}


