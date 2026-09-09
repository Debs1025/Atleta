import { useEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
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
  promptFacebookOAuthAsync,
  promptGoogleOAuthAsync,
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
let NativeGoogleSignin: any = null;
try {
  NativeGoogleSignin = require("@react-native-google-signin/google-signin")?.GoogleSignin;
} catch (e) {
  // Native module not linked in current binary
}

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

  const googleClientId = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID") ?? "").trim();

  useEffect(() => {
    if (googleClientId && NativeGoogleSignin) {
      try {
        NativeGoogleSignin.configure({
          webClientId: googleClientId,
          offlineAccess: true
        });
      } catch (e) {
        //
      }
    }
  }, [googleClientId]);

  const handleSocialAuthWithToken = async (provider: "google" | "facebook", idToken: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const endpoint = provider === "google" ? "/users/google-login" : "/users/facebook-login";
      const payload = provider === "google"
        ? { id_token: idToken, idToken, token: idToken, credential: idToken, provider }
        : { access_token: idToken, accessToken: idToken, id_token: idToken, idToken, provider };

      const result = await requestJson(endpoint, payload);
      const token = extractAuthToken(result);
      const role = extractAuthRole(result) || "athlete";

      if (token) await storeAuthToken(token);
      await storeAuthRole(role);

      onAuthenticated?.(role);
    } catch (error: any) {
      const msg = getAuthErrorMessage(error, `Unable to authenticate with ${provider}.`);
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("exist")) {
        setFeedback({
          tone: "info",
          message: `No existing account found for this ${provider === "google" ? "Google" : "Facebook"} account. Please tap Sign Up to create your account.`
        });
      } else {
        setFeedback({
          tone: "error",
          message: msg
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInPress = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      if (Platform.OS !== "web" && NativeGoogleSignin && typeof NativeGoogleSignin.hasPlayServices === "function") {
        await NativeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await NativeGoogleSignin.signIn();
        const idToken = (signInResult as any)?.data?.idToken || (signInResult as any)?.idToken;

        if (idToken) {
          await handleSocialAuthWithToken("google", idToken);
          return;
        }
      }
    } catch (nativeError: any) {
      if (nativeError?.code === "SIGN_IN_CANCELLED" || nativeError?.code === "12501") {
        setLoading(false);
        return;
      }
    }

    try {
      const res = await promptGoogleOAuthAsync();
      if (res.type === "success" && (res.idToken || res.accessToken)) {
        await handleSocialAuthWithToken("google", (res.idToken || res.accessToken)!);
      } else if (res.type === "error") {
        setLoading(false);
        setFeedback({
          tone: "error",
          message: res.error || "Google sign-in failed."
        });
      } else {
        setLoading(false);
      }
    } catch (e: any) {
      setLoading(false);
      setFeedback({
        tone: "error",
        message: e?.message || "Google sign-in failed."
      });
    }
  };

  const handleFacebookSignInPress = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const res = await promptFacebookOAuthAsync();
      if (res.type === "success" && (res.accessToken || res.idToken)) {
        await handleSocialAuthWithToken("facebook", (res.accessToken || res.idToken)!);
      } else if (res.type === "error") {
        setLoading(false);
        setFeedback({
          tone: "error",
          message: res.error || "Facebook sign-in failed."
        });
      } else {
        setLoading(false);
      }
    } catch (e: any) {
      setLoading(false);
      setFeedback({
        tone: "error",
        message: e?.message || "Facebook sign-in failed."
      });
    }
  };

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
        message: getAuthErrorMessage(error, "Invalid login credentials.")
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScrollView contentContainerStyle={authScreenStyles.content} keyboardShouldPersistTaps="handled">
      <View style={authScreenStyles.shell}>
        <AuthHeader />
        <SectionTitle title="Log In" subtitle="Access your ATLETA dashboard using your credentials or social account." />
        <Banner tone={feedback?.tone ?? "info"} message={feedback?.message} />

        <FormField control={form.control} name="email" label="Email Address" placeholder="athlete@domain.com" />
        <FormField control={form.control} name="password" label="Password" placeholder="••••••••" secureTextEntry />

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
          onPress={handleGoogleSignInPress}
        />
        <View style={authScreenStyles.spacer} />
        <Button
          label="Login with Facebook"
          variant="secondary"
          icon={require("../../../assets/facebook.png")}
          onPress={handleFacebookSignInPress}
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


