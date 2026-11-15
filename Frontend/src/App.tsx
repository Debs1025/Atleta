import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthEntry } from "./screens/Mobile/Authentication/AuthEntry";
import { AccountProvider } from "./context/AccountContext";
import { CustomAlertModal } from "./components/CustomAlertModal";

LogBox.ignoreAllLogs(true);

export function App() {
  return (
    <SafeAreaProvider>
      <AccountProvider>
        <StatusBar style="light" />
        <AuthEntry />
        <CustomAlertModal />
      </AccountProvider>
    </SafeAreaProvider>
  );
}
