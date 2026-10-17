import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  TouchableOpacity,
  Easing,
} from 'react-native';

interface AtletaAnimatedLogoProps {
  size?: 'small' | 'medium' | 'large' | number;
  showGlow?: boolean;
  pulse?: boolean;
  spinRing?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

const logoSource = require('../assets/atleta_logo.png');

export const AtletaAnimatedLogo: React.FC<AtletaAnimatedLogoProps> = ({
  size = 'medium',
  showGlow = true,
  pulse = true,
  spinRing = true,
  onPress,
  style,
  imageStyle,
}) => {
  // Numeric dimension
  const dimension = typeof size === 'number'
    ? size
    : size === 'small'
    ? 36
    : size === 'large'
    ? 110
    : 68;

  // Animation values
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.35)).current;
  const glowScale = useRef(new Animated.Value(0.95)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const counterRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial Entrance Animation (Fade + Spring Up)
    Animated.spring(entranceAnim, {
      toValue: 1,
      friction: 6,
      tension: 45,
      useNativeDriver: true,
    }).start();

    // 2. Continuous Ambient Glow & Float & Breathing Animation
    if (pulse) {
      // Breathing Scale Loop
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.06,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      // Radiant Aura Glow Pulse Loop
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glowOpacity, {
              toValue: 0.9,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowScale, {
              toValue: 1.3,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(glowOpacity, {
              toValue: 0.25,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowScale, {
              toValue: 0.92,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      // Smooth Gentle Float
      const floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -4,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 3,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

      // Smooth Rotation Rings
      const rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const counterRotateLoop = Animated.loop(
        Animated.timing(counterRotateAnim, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      pulseLoop.start();
      glowLoop.start();
      floatLoop.start();
      rotateLoop.start();
      counterRotateLoop.start();

      return () => {
        pulseLoop.stop();
        glowLoop.stop();
        floatLoop.stop();
        rotateLoop.stop();
        counterRotateLoop.stop();
      };
    }
  }, [pulse]);

  const handlePressIn = () => {
    Animated.spring(pulseScale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pulseScale, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = counterRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const ringSize = dimension * 1.38;
  const outerRingSize = dimension * 1.62;

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          width: Math.max(dimension, outerRingSize),
          height: Math.max(dimension, outerRingSize),
          opacity: entranceAnim,
          transform: [
            { scale: pulseScale },
            { translateY: pulse ? floatAnim : 0 },
          ],
        },
        style,
      ]}
    >
      {/* Outer Rotating Cyber Orbital Ring */}
      {showGlow && spinRing && dimension >= 48 && (
        <>
          <Animated.View
            style={[
              styles.outerRing,
              {
                width: outerRingSize,
                height: outerRingSize,
                borderRadius: outerRingSize / 2,
                transform: [{ rotate: counterSpin }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.innerRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                transform: [{ rotate: spin }],
              },
            ]}
          />
        </>
      )}

      {/* Radiant Cyan Ambient Glow Aura */}
      {showGlow && (
        <Animated.View
          style={[
            styles.glowAura,
            {
              width: dimension * 0.95,
              height: dimension * 0.95,
              borderRadius: (dimension * 0.95) / 2,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
      )}

      {/* Transparent High-Resolution Logo */}
      <Image
        source={logoSource}
        style={[
          styles.logoImage,
          {
            width: dimension,
            height: dimension,
          },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.88}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 200, 255, 0.4)',
    borderStyle: 'dashed',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    borderTopColor: '#00C8FF',
    borderBottomColor: '#00C8FF',
  },
  glowAura: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 200, 255, 0.45)',
    shadowColor: '#00C8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 24,
    elevation: 16,
  },
  logoImage: {
    backgroundColor: 'transparent',
  },
});

export default AtletaAnimatedLogo;
