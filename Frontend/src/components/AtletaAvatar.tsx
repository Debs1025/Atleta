import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, Platform, StyleProp, ViewStyle, ImageStyle } from "react-native";

const fontBoldPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

const AVATAR_PALETTE = [
  { bg: "#00C8FF", text: "#070D19" }, // Atleta Cyan
  { bg: "#0284C7", text: "#FFFFFF" }, // Sky 600
  { bg: "#2563EB", text: "#FFFFFF" }, // Blue 600
  { bg: "#7C3AED", text: "#FFFFFF" }, // Violet 600
  { bg: "#059669", text: "#FFFFFF" }, // Emerald 600
  { bg: "#D97706", text: "#FFFFFF" }, // Amber 600
  { bg: "#0D9488", text: "#FFFFFF" }, // Teal 600
  { bg: "#4F46E5", text: "#FFFFFF" }, // Indigo 600
];

export function getInitialsFromName(name?: string | null, fallback = "AT"): string {
  if (!name || !name.trim()) return fallback;
  const trimmed = name.trim();
  if (/^arch(ie)?\b/i.test(trimmed) || trimmed.toLowerCase() === "archie lim") {
    return "AR";
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return `${first}${last}`.toUpperCase();
  }
  if (parts.length === 1) {
    const single = parts[0];
    return single.length >= 2 ? single.slice(0, 2).toUpperCase() : single.toUpperCase();
  }
  return fallback;
}

export function getAvatarColor(name?: string | null): { bg: string; text: string } {
  if (!name || !name.trim()) return AVATAR_PALETTE[0];
  const trimmed = name.trim();
  if (/^arch(ie)?\b/i.test(trimmed)) return AVATAR_PALETTE[0]; // Coach Archie gets Atleta Cyan
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export interface AtletaAvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  customInitials?: string;
  defaultBg?: string;
  defaultTextColor?: string;
}

export const AtletaAvatar: React.FC<AtletaAvatarProps> = ({
  url,
  name,
  size = 38,
  borderRadius,
  style,
  imageStyle,
  customInitials,
  defaultBg,
  defaultTextColor,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [url]);

  const radius = borderRadius !== undefined ? borderRadius : size / 2;
  const initials = customInitials || getInitialsFromName(name);
  const colorScheme = getAvatarColor(name);
  const bgColor = defaultBg || colorScheme.bg;
  const textColor = defaultTextColor || colorScheme.text;
  const fontSize = Math.max(10, Math.floor(size * 0.4));

  const validUri = Boolean(url && typeof url === "string" && url.trim().length > 0 && !hasError);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      {validUri ? (
        <Image
          source={{ uri: url! }}
          style={[
            styles.image,
            {
              width: "100%",
              height: "100%",
              borderRadius: radius,
            },
            imageStyle,
          ]}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              color: textColor,
              fontSize,
            },
          ]}
          numberOfLines={1}
        >
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
    textAlign: "center",
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
});

export default AtletaAvatar;

