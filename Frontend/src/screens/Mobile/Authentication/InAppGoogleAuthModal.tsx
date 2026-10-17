import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

function getWebView() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnw = require('react-native-webview');
    return rnw ? rnw.WebView : null;
  } catch {
    return null;
  }
}

function runtimeProcessEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[key];
}

export interface InAppSocialAuthModalProps {
  visible: boolean;
  provider?: 'google' | 'facebook';
  onClose: () => void;
  onSuccess: (tokens: { idToken?: string; accessToken?: string }) => void;
  onError: (error: string) => void;
}

export type InAppGoogleAuthModalProps = InAppSocialAuthModalProps;

const CHROME_USER_AGENT_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const SAFARI_USER_AGENT_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export const InAppGoogleAuthModal: React.FC<InAppGoogleAuthModalProps> = ({
  visible,
  provider = 'google',
  onClose,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const WebViewComp = useMemo(() => {
    if (!visible) return null;
    return getWebView();
  }, [visible]);

  const googleClientId = useMemo(() => {
    return (
      runtimeProcessEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID') ||
      '203586668533-uii0i4gjqcm2cmj4ssvrdq70a2efhmnf.apps.googleusercontent.com'
    ).trim();
  }, []);

  const facebookAppId = useMemo(() => {
    return (
      runtimeProcessEnv('EXPO_PUBLIC_FACEBOOK_APP_ID') ||
      runtimeProcessEnv('FACEBOOK_APP_ID') ||
      (Constants.expoConfig as any)?.facebookAppId ||
      (Constants.expoConfig as any)?.extra?.facebookAppId ||
      (Constants as any).manifest2?.extra?.expoClient?.facebookAppId ||
      (Constants as any).manifest?.facebookAppId ||
      '1478346524097898'
    ).trim();
  }, []);

  const redirectUri = 'https://atleta-v1.firebaseapp.com/__/auth/handler';

  const authUrl = useMemo(() => {
    const nonce = Math.random().toString(36).substring(2, 15);
    const state = Math.random().toString(36).substring(2, 15);

    if (provider === 'facebook') {
      const params = new URLSearchParams({
        client_id: facebookAppId,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'email,public_profile',
        state,
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    }

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'id_token token',
      scope: 'openid profile email',
      nonce,
      state,
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, [googleClientId, facebookAppId, provider, visible]);

  const extractTokens = (url: string) => {
    let params: URLSearchParams;
    const hashIdx = url.indexOf('#');
    const queryIdx = url.indexOf('?');

    if (hashIdx !== -1) {
      params = new URLSearchParams(url.substring(hashIdx + 1));
    } else if (queryIdx !== -1) {
      params = new URLSearchParams(url.substring(queryIdx + 1));
    } else {
      return { idToken: null, accessToken: null, error: null };
    }

    return {
      idToken: params.get('id_token'),
      accessToken: params.get('access_token'),
      error: params.get('error') || params.get('error_description'),
    };
  };

  const handleInterceptUrl = (url: string): boolean => {
    if (!url) return false;

    // Only intercept when redirected to our redirectUri or Firebase callback
    if (url.startsWith(redirectUri) || (url.includes('atleta-v1.firebaseapp.com') && (url.includes('access_token=') || url.includes('id_token=')))) {
      const { idToken, accessToken, error } = extractTokens(url);

      if (idToken || accessToken) {
        onSuccess({
          idToken: idToken || undefined,
          accessToken: accessToken || undefined,
        });
        onClose();
        return true;
      }

      if (error) {
        onError(error.replace(/_/g, ' '));
        onClose();
        return true;
      }
    }

    // Intercept explicit Facebook OAuth error landing page
    if (url.includes('facebook.com/oauth/error') || url.includes('PLATFORM__INVALID_APP_ID')) {
      onError(`Facebook returned: Invalid App ID (${facebookAppId}). The app ID must be active on developers.facebook.com.`);
      onClose();
      return true;
    }

    return false;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#070D19" />

        {/* Modal In-App Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <View style={[styles.googleIconBadge, provider === "facebook" && { backgroundColor: "rgba(24, 119, 242, 0.15)", borderColor: "rgba(24, 119, 242, 0.3)" }]}>
              <Ionicons
                name={provider === "facebook" ? "logo-facebook" : "logo-google"}
                size={16}
                color={provider === "facebook" ? "#1877F2" : "#4285F4"}
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>{provider === "facebook" ? "Facebook Sign-In" : "Google Sign-In"}</Text>
              <Text style={styles.headerSubtitle}>Sign in securely inside Atleta</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.loadingText}>Connecting to {provider === "facebook" ? "Facebook" : "Google"}...</Text>
          </View>
        )}

        {/* In-App WebView (User never leaves the application) */}
        {WebViewComp ? (
          <WebViewComp
            source={{ uri: authUrl }}
            userAgent={Platform.OS === 'ios' ? SAFARI_USER_AGENT_IOS : CHROME_USER_AGENT_ANDROID}
            originWhitelist={['*']}
            mixedContentMode="always"
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            javaScriptCanOpenWindowsAutomatically={true}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={true}
            incognito={false}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(navState: any) => {
              handleInterceptUrl(navState.url);
            }}
            onShouldStartLoadWithRequest={(request: any) => {
              const intercepted = handleInterceptUrl(request.url);
              return !intercepted;
            }}
            renderError={(errorName: any) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#070D19' }}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                  Unable to load {provider === 'facebook' ? 'Facebook' : 'Google'}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  {errorName || 'Connection error. Please check your network or try again.'}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{ backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                >
                  <Text style={{ color: '#38BDF8', fontWeight: '700', fontSize: 14 }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
            onError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              if (!handleInterceptUrl(nativeEvent.url)) {
                console.warn("WebView auth error:", nativeEvent);
              }
            }}
            style={styles.webview}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#070D19' }}>
            <Ionicons name="globe-outline" size={48} color="#38BDF8" style={{ marginBottom: 12 }} />
            <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
              Sign in with {provider === 'facebook' ? 'Facebook' : 'Google'}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const res = await WebBrowser.openAuthSessionAsync(authUrl, 'atleta://');
                  if (res.type === 'success' && res.url) {
                    handleInterceptUrl(res.url);
                  }
                } catch (e) {
                  console.warn("WebBrowser error:", e);
                }
              }}
              style={{ backgroundColor: '#0284C7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 12 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Open Sign-In Browser</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#94A3B8', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    gap: 8,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
