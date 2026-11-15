import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertData {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
}

type Listener = (alert: AlertData | null) => void;
const listeners = new Set<Listener>();

export function showAlert(alert: AlertData) {
  listeners.forEach((cb) => cb(alert));
}

export function hideAlert() {
  listeners.forEach((cb) => cb(null));
}

// Override React Native's native Alert.alert globally so that
// every Alert.alert(...) in the entire app renders this sleek Atleta dark modal
// instead of the bright white native system dialog.
if (Alert && Alert.alert) {
  Alert.alert = (title?: string, message?: string, buttons?: AlertButton[]) => {
    showAlert({ title, message, buttons });
  };
}

export function CustomAlertModal() {
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);

  useEffect(() => {
    const handler: Listener = (data) => setCurrentAlert(data);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  if (!currentAlert) return null;

  const titleText = currentAlert.title || '';
  const messageText = currentAlert.message || '';
  const rawButtons = currentAlert.buttons && currentAlert.buttons.length > 0
    ? currentAlert.buttons
    : [{ text: 'OK', style: 'default' as const }];

  // Determine icon type based on title/message content
  const lower = `${titleText} ${messageText}`.toLowerCase();
  const isDestructive = lower.includes('error') || lower.includes('fail') || lower.includes('discard') || lower.includes('delete') || lower.includes('declined') || lower.includes('dq');
  const isSuccess = lower.includes('success') || lower.includes('saved') || lower.includes('updated') || lower.includes('granted') || lower.includes('certified');

  let iconName: any = 'information-circle-outline';
  let iconColor = '#00D2FF';
  let badgeBg = 'rgba(0, 210, 255, 0.12)';

  if (isDestructive) {
    iconName = 'alert-circle-outline';
    iconColor = '#EF4444';
    badgeBg = 'rgba(239, 68, 68, 0.15)';
  } else if (isSuccess) {
    iconName = 'checkmark-circle-outline';
    iconColor = '#10B981';
    badgeBg = 'rgba(16, 185, 129, 0.15)';
  }

  const handleButtonPress = (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      setTimeout(() => {
        try {
          btn.onPress!();
        } catch (err) {
          console.warn('Alert onPress handler error:', err);
        }
      }, 50);
    }
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          {titleText ? <Text style={styles.title}>{titleText}</Text> : null}
          {messageText ? <Text style={styles.message}>{messageText}</Text> : null}

          <View style={[styles.buttonContainer, rawButtons.length > 2 && styles.buttonContainerStacked]}>
            {rawButtons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDanger = btn.style === 'destructive';
              const isPrimary = !isCancel && !isDanger;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.button,
                    isCancel && styles.cancelButton,
                    isDanger && styles.dangerButton,
                    isPrimary && styles.primaryButton,
                    rawButtons.length > 2 && { width: '100%', marginBottom: 8 },
                  ]}
                  onPress={() => handleButtonPress(btn)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.cancelButtonText,
                      isDanger && styles.dangerButtonText,
                      isPrimary && styles.primaryButtonText,
                    ]}
                  >
                    {btn.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  card: {
    width: Math.min(width - 48, 380),
    backgroundColor: '#0F172A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 10,
  },
  buttonContainerStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#00D2FF',
  },
  primaryButtonText: {
    color: '#070D19',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  cancelButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelButtonText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
