import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  clearAuthMicroCache,
  API_BASE,
  type AuthRole,
  type BannerTone,
  type LoginValues
} from "./authShared";
import { db, clearFirebaseClientCaches } from "../../../services/firebaseClient";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { InAppGoogleAuthModal } from "./InAppGoogleAuthModal";
let NativeGoogleSignin: any = null;
try {
  NativeGoogleSignin = require("@react-native-google-signin/google-signin")?.GoogleSignin;
} catch (e) {
  // Native module not linked in current binary
}

function parseJwtPayload(token?: string) {
  try {
    if (!token || !token.includes(".")) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    let decoded = "";
    if (typeof (globalThis as any).atob === "function") {
      decoded = (globalThis as any).atob(b64);
    } else if (typeof (globalThis as any).Buffer !== "undefined") {
      decoded = (globalThis as any).Buffer.from(b64, "base64").toString("utf8");
    }
    if (decoded) {
      return JSON.parse(decodeURIComponent(escape(decoded)));
    }
  } catch (_) {}
  return null;
}

export type SocialSignupPayload = {
  socialToken: { provider: "google" | "facebook"; idToken: string };
  initialData?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
};

type LoginScreenProps = {
  onGoSignup: (socialData?: SocialSignupPayload) => void;
  onGoReset: () => void;
  onAuthenticated?: (role: AuthRole) => void;
};

export function LoginScreen({ onGoSignup, onGoReset, onAuthenticated }: LoginScreenProps) {
  const [feedback, setFeedback] = useState<{ tone: BannerTone; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialModal, setSocialModal] = useState<{ visible: boolean; provider: 'google' | 'facebook' }>({ visible: false, provider: 'google' });

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

  const handleSocialAuthWithToken = async (
    provider: "google" | "facebook",
    idToken: string,
    fallbackUser?: { email?: string; givenName?: string; familyName?: string; photo?: string }
  ) => {
    setLoading(true);
    setFeedback(null);
    try {
      const jwtPayload = parseJwtPayload(idToken);
      let extractedEmail = (jwtPayload?.email || fallbackUser?.email || "").trim().toLowerCase();
      let extractedFirstName = jwtPayload?.given_name || fallbackUser?.givenName || (jwtPayload?.name ? jwtPayload.name.split(" ")[0] : "");
      let extractedLastName = jwtPayload?.family_name || fallbackUser?.familyName || (jwtPayload?.name ? jwtPayload.name.split(" ").slice(1).join(" ") : "");
      let extractedAvatar = jwtPayload?.picture || fallbackUser?.photo || "";

      const endpoint = provider === "google" ? "/users/google-login" : "/users/facebook-login";
      const payload = provider === "google"
        ? { id_token: idToken, idToken, token: idToken, credential: idToken, provider }
        : { access_token: idToken, accessToken: idToken, id_token: idToken, idToken, provider };

      let result: any = null;
      try {
        result = await requestJson(endpoint, payload);
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("not found") || msg.includes("exist") || msg.includes("sign up") || msg.includes("signup")) {
          // Route immediately to sign up
          onGoSignup?.({
            socialToken: { provider, idToken },
            initialData: {
              email: extractedEmail,
              first_name: extractedFirstName,
              last_name: extractedLastName,
              avatar_url: extractedAvatar,
            }
          });
          return;
        }
      }

      const resData = result as any;
      if (resData?.user?.email && !extractedEmail) extractedEmail = String(resData.user.email).toLowerCase().trim();
      if (resData?.user?.first_name && !extractedFirstName) extractedFirstName = resData.user.first_name;
      if (resData?.user?.last_name && !extractedLastName) extractedLastName = resData.user.last_name;
      if (resData?.user?.avatar_url && !extractedAvatar) extractedAvatar = resData.user.avatar_url;

      // Direct Firestore check: verify whether this user is actually registered and complete
      let isExistingFullyRegistered = false;
      let existingRole: AuthRole = "athlete";

      try {
        let userDocSnap: any = null;
        if (extractedEmail) {
          const q = query(collection(db, "Users"), where("email", "==", extractedEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            userDocSnap = snap.docs[0];
          }
        }
        if (!userDocSnap && resData?.user?.user_id) {
          const directDoc = await getDoc(doc(db, "Users", resData.user.user_id));
          if (directDoc.exists()) {
            userDocSnap = directDoc;
          }
        }

        if (userDocSnap && userDocSnap.exists()) {
          const uData = userDocSnap.data();
          const role = (uData.role || "").toLowerCase();
          const uid = userDocSnap.id;

          const hasCompleteFlag = uData.is_profile_complete === true;
          const notRequireSignup = uData.require_signup !== true;

          let hasRoleProfileDoc = false;
          if (role === "coach") {
            const [cp1, cp2] = await Promise.all([
              getDoc(doc(db, "Coach_Profiles", uid)).catch(() => null),
              getDoc(doc(db, "Coach_Profiles", `coach_${uid}`)).catch(() => null),
            ]);
            hasRoleProfileDoc = Boolean((cp1 && cp1.exists()) || (cp2 && cp2.exists()));
          } else if (role === "athlete") {
            const [ap1, ap2] = await Promise.all([
              getDoc(doc(db, "Athlete_Profiles", uid)).catch(() => null),
              getDoc(doc(db, "Athlete_Profiles", `ath_${uid}`)).catch(() => null),
            ]);
            hasRoleProfileDoc = Boolean((ap1 && ap1.exists()) || (ap2 && ap2.exists()));
          }

          if (hasCompleteFlag && notRequireSignup && hasRoleProfileDoc) {
            isExistingFullyRegistered = true;
            existingRole = role === "coach" ? "coach" : "athlete";
          }
        }
      } catch (e) {
        console.warn("Direct Firestore auth check note:", e);
      }

      // If user is new OR incomplete OR backend explicitly requested signup:
      // Route immediately to Sign Up wizard!
      if (!isExistingFullyRegistered || resData?.require_signup || resData?.is_new_user || !resData?.token) {
        onGoSignup?.({
          socialToken: { provider, idToken },
          initialData: {
            email: extractedEmail || resData?.user?.email || "",
            first_name: extractedFirstName || resData?.user?.first_name || "",
            last_name: extractedLastName || resData?.user?.last_name || "",
            avatar_url: extractedAvatar || resData?.user?.avatar_url || "",
          }
        });
        return;
      }

      const token = extractAuthToken(result);
      const role = existingRole || extractAuthRole(result) || "athlete";

      if (token) await storeAuthToken(token);
      await storeAuthRole(role);

      clearAuthMicroCache();
      clearFirebaseClientCaches();
      await AsyncStorage.multiRemove([
        "atleta_coach_dashboard_cache_v2",
        "atleta_offline_coach_profile_cache",
        "atleta_offline_athlete_profile_cache",
        "atleta_offline_teams_cache",
        "atleta_offline_matches_cache",
        "atleta_offline_athletes_cache",
        "atleta_offline_sports_cache",
        "atleta_coach_settings",
        "atleta_cached_user",
      ]).catch(() => null);

      onAuthenticated?.(role);
    } catch (error: any) {
      const msg = getAuthErrorMessage(error, `Unable to authenticate with ${provider}.`);
      if (
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("exist") ||
        msg.toLowerCase().includes("sign up") ||
        msg.toLowerCase().includes("signup") ||
        msg.toLowerCase().includes("register")
      ) {
        onGoSignup?.({
          socialToken: { provider, idToken },
        });
        return;
      }
      setFeedback({
        tone: "error",
        message: msg
      });
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
        const userObj = (signInResult as any)?.data?.user || (signInResult as any)?.user;

        if (idToken) {
          await handleSocialAuthWithToken("google", idToken, userObj);
          return;
        }
      }
    } catch (nativeError: any) {
      if (nativeError?.code === "SIGN_IN_CANCELLED" || nativeError?.code === "12501") {
        setLoading(false);
        return;
      }
    }

    // Fall back seamlessly to in-app Google Auth modal without leaving the app
    setLoading(false);
    setSocialModal({ visible: true, provider: "google" });
  };

  const handleFacebookSignInPress = () => {
    setLoading(false);
    setFeedback(null);
    setSocialModal({ visible: true, provider: "facebook" });
  };

  const submit = form.handleSubmit(
    async (values) => {
      setLoading(true);
      setFeedback(null);

      try {
        const payload = {
          email: values.email.trim().toLowerCase().replace(/%40/gi, "@"),
          password: values.password.trim()
        };
        const result = await requestJson("/users/login", payload);
        const token = extractAuthToken(result);
        const role = extractAuthRole(result, payload.email);

        if (token) await storeAuthToken(token);
        await storeAuthRole(role);

        clearAuthMicroCache();
        clearFirebaseClientCaches();
        await AsyncStorage.multiRemove([
          "atleta_coach_dashboard_cache_v2",
          "atleta_offline_coach_profile_cache",
          "atleta_offline_athlete_profile_cache",
          "atleta_offline_teams_cache",
          "atleta_offline_matches_cache",
          "atleta_offline_athletes_cache",
          "atleta_offline_sports_cache",
          "atleta_coach_settings",
          "atleta_cached_user",
        ]).catch(() => null);

        onAuthenticated?.(role);
        form.reset(values);
      } catch (error: any) {
        const rawMsg = error?.message || String(error);
        const errorMessage = getAuthErrorMessage(error, "Invalid email or password. Please check your credentials and try again.");
        const displayMsg = rawMsg && rawMsg !== "Something went wrong." && !rawMsg.includes("Invalid email")
          ? `${errorMessage} (${rawMsg})`
          : errorMessage;
        setFeedback({
          tone: "error",
          message: displayMsg
        });
        Alert.alert("Authentication Failed", `${displayMsg}\n\nServer: ${API_BASE}`);
      } finally {
        setLoading(false);
      }
    },
    (errors) => {
      const firstError = Object.values(errors)[0]?.message as string | undefined;
      const msg = firstError || "Please enter your email and password.";
      setFeedback({
        tone: "error",
        message: msg
      });
      Alert.alert("Authentication Failed", msg);
    }
  );

  return (
    <ScrollView contentContainerStyle={authScreenStyles.content} keyboardShouldPersistTaps="handled">
      <View style={authScreenStyles.shell}>
        <AuthHeader />
        <SectionTitle title="Log In" subtitle="Access your ATLETA dashboard using your credentials or social account." />
        <Banner tone={feedback?.tone ?? "info"} message={feedback?.message} />

        <FormField
          control={form.control}
          name="email"
          label="Email Address"
          placeholder="athlete@domain.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <FormField
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ marginTop: 6 }}>
          <Button label="Login" loading={loading} onPress={submit} />
        </View>

        <Text style={styles.link} onPress={onGoReset}>
          Forgot Password?
        </Text>

        <View style={[authScreenStyles.dividerRow, styles.dividerRow]}>
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
          Don&apos;t have an account? <Text style={authScreenStyles.footerLink} onPress={() => onGoSignup?.()}>Sign Up</Text>
        </Text>

        <InAppGoogleAuthModal
          visible={socialModal.visible}
          provider={socialModal.provider}
          onClose={() => setSocialModal((prev) => ({ ...prev, visible: false }))}
          onSuccess={(tokens) => {
            const token = tokens.idToken || tokens.accessToken;
            if (token) {
              handleSocialAuthWithToken(socialModal.provider, token);
            }
          }}
          onError={(err) => {
            setFeedback({
              tone: "error",
              message: err || `${socialModal.provider === "facebook" ? "Facebook" : "Google"} sign-in could not be completed.`
            });
          }}
        />
      </View>
    </ScrollView>
  );
}

function runtimeProcessEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[key];
}


