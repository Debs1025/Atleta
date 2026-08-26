import { useEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import styles from "./styles/LoginScreen";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const googleAndroidId = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_ANDROID_ID") ?? "").trim();
  const googleIosId = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_IOS_ID") ?? "").trim();
  const googleRedirectUri = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_REDIRECT_URI") ?? "").trim();

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

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: googleClientId || undefined,
    androidClientId: googleAndroidId || undefined,
    iosClientId: googleIosId || undefined,
    webClientId: googleClientId || undefined,
    redirectUri: googleRedirectUri || undefined
  });

  const [facebookRequest, facebookResponse, promptFacebookAsync] = Facebook.useAuthRequest({
    clientId: (runtimeProcessEnv("EXPO_PUBLIC_FACEBOOK_APP_ID") ?? "").trim()
  });

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
          message: "No existing account found for this Google account. Please tap Sign Up to create your account."
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
    const hasGoogleId = !!(googleClientId || googleAndroidId || googleIosId);
    if (!hasGoogleId) {
      setFeedback({ tone: "error", message: "Google sign-in is currently unavailable on this device." });
      return;
    }

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

    if (googleRequest) {
      promptGoogleAsync();
    } else {
      setFeedback({ tone: "error", message: "Google sign-in is currently unavailable." });
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


