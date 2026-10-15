import { useEffect, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "./styles/AuthEntry";
import * as SecureStore from "expo-secure-store";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, FullScreenOverlay, getStoredAuthRole, clearAuthMicroCache, type AuthRole } from "./authShared";
import { clearFirebaseClientCaches } from "../../../services/firebaseClient";
import { LoginScreen } from "./LoginScreen";
import { PasswordResetScreen } from "./PasswordResetScreen";
import { SignupScreen } from "./SignupScreen";
import { AthleteHomePage } from "../Athlete/Dashboard/AthleteHomePage";
import { CoachMainPage } from "../Coach/Dashboard/CoachMainPage";

type ScreenMode = "login" | "signup" | "reset";

async function getStoredSessionToken() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      SecureStore.getItemAsync(AUTH_TOKEN_KEY).catch(() => null),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 1500);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function AuthEntry() {
  const [screen, setScreen] = useState<ScreenMode>("login");
  const [booting, setBooting] = useState(true);
  const [activeRole, setActiveRole] = useState<AuthRole | null>(null);
  const [socialSignupData, setSocialSignupData] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const startTime = Date.now();
      const [token, role] = await Promise.all([getStoredSessionToken(), getStoredAuthRole()]);
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      if (mounted) {
        if (token && role) setActiveRole(role);
        setBooting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    clearAuthMicroCache();
    clearFirebaseClientCaches();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const atletaKeys = allKeys.filter((k) => k.startsWith("atleta_") || k.startsWith("@atleta_"));
      if (atletaKeys.length > 0) {
        await AsyncStorage.multiRemove(atletaKeys);
      }
    } catch (_) {}
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => null),
      SecureStore.deleteItemAsync(AUTH_ROLE_KEY).catch(() => null),
    ]);
    setActiveRole(null);
    setScreen("login");
  };

  if (booting) {
    return <FullScreenOverlay />;
  }

  if (activeRole === "athlete") return <AthleteHomePage onLogout={handleLogout} />;
  if (activeRole === "coach") return <CoachMainPage onLogout={handleLogout} />;

  return (
    <View style={styles.container}>
      {screen === "login" && (
        <LoginScreen
          onGoSignup={(data) => {
            setSocialSignupData(data || null);
            setScreen("signup");
          }}
          onGoReset={() => setScreen("reset")}
          onAuthenticated={setActiveRole}
        />
      )}
      {screen === "signup" && (
        <SignupScreen
          onGoLogin={() => {
            setSocialSignupData(null);
            setScreen("login");
          }}
          initialSocialData={socialSignupData}
          onAuthenticated={setActiveRole}
        />
      )}
      {screen === "reset" && <PasswordResetScreen onGoLogin={() => setScreen("login")} />}
    </View>
  );
}


