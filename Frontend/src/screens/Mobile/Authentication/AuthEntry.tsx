import { useEffect, useState } from "react";
import { View } from "react-native";
import styles from "./styles/AuthEntry";
import * as SecureStore from "expo-secure-store";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, FullScreenOverlay, getStoredAuthRole, type AuthRole } from "./authShared";
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

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [token, role] = await Promise.all([getStoredSessionToken(), getStoredAuthRole()]);
      if (mounted) {
        if (token) setActiveRole(role ?? "athlete");
        setBooting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================================
  // BACKEND LOGOUT:
  // - Clears stored tokens in SecureStore.
  // - OPTIONAL: Send POST `/api/auth/logout` to invalidate session/JWT on backend.
  // ============================================================================
  const handleLogout = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => null),
      SecureStore.deleteItemAsync(AUTH_ROLE_KEY).catch(() => null)
    ]);
    setActiveRole(null);
    setScreen("login");
  };

  if (booting) {
    return <FullScreenOverlay label="Preparing your secure ATLETA session..." />;
  }

  if (activeRole === "athlete") return <AthleteHomePage onLogout={handleLogout} />;
  if (activeRole === "coach") return <CoachMainPage onLogout={handleLogout} />;

  return (
    <View style={styles.container}>
      {screen === "login" && (
        <LoginScreen
          onGoSignup={() => setScreen("signup")}
          onGoReset={() => setScreen("reset")}
          onAuthenticated={setActiveRole}
        />
      )}
      {screen === "signup" && <SignupScreen onGoLogin={() => setScreen("login")} />}
      {screen === "reset" && <PasswordResetScreen onGoLogin={() => setScreen("login")} />}
    </View>
  );
}


