import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthEntry } from "./screens/Mobile/Authentication/AuthEntry";

export function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthEntry />
    </SafeAreaProvider>
  );
}