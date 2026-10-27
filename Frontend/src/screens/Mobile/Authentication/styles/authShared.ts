import { StyleSheet } from "react-native";

export const authScreenStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: "#070D19",
    paddingBottom: 24
  },
  shell: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 20,
    justifyContent: "space-between"
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2,
    includeFontPadding: false
  },
  rule: {
    height: 0
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 28,
    marginBottom: 20
  },
  divider: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    flex: 1,
    height: 1
  },
  or: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginHorizontal: 16,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    includeFontPadding: false
  },
  spacer: {
    height: 14
  },
  footer: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 36,
    marginBottom: 12,
    textAlign: "center",
    includeFontPadding: false
  },
  footerLink: {
    color: "#00C8FF",
    fontWeight: "800"
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6
  }
});

export const bannerStyles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  error: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.4)"
  },
  success: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.4)"
  },
  info: {
    backgroundColor: "rgba(0, 200, 255, 0.12)",
    borderColor: "rgba(0, 200, 255, 0.4)"
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  }
});

export const fieldStyles = StyleSheet.create({
  group: {
    marginBottom: 18
  },
  label: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.2,
    includeFontPadding: false
  },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    height: 54,
    paddingHorizontal: 16,
    paddingVertical: 0,
    includeFontPadding: false,
    flex: 1,
    backgroundColor: "transparent"
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 54,
    overflow: "hidden"
  },
  inputWithAccessory: {
    paddingRight: 4
  },
  inputError: {
    borderColor: "#EF4444"
  },
  rightAccessory: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 6
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600"
  }
});

export const calendarStyles = StyleSheet.create({
  ringRow: {
    position: "absolute",
    top: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 2
  },
  dotGrid: {
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 1
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "68%"
  }
});

export const buttonStyles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    height: 54,
    paddingHorizontal: 20
  },
  contentRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center"
  },
  icon: {
    height: 20,
    marginRight: 12,
    resizeMode: "contain",
    width: 20
  },
  primary: {
    backgroundColor: "#00C8FF",
    shadowColor: "#00C8FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  secondary: {
    backgroundColor: "#0F172A",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1.5
  },
  ghost: {
    backgroundColor: "transparent"
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.5
  },
  text: {
    color: "#070D19",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    includeFontPadding: false
  },
  secondaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textTransform: "none",
    letterSpacing: 0.3,
    includeFontPadding: false
  },
  ghostText: {
    color: "#00C8FF",
    fontSize: 14,
    fontWeight: "700",
    includeFontPadding: false
  }
});

export const pillStyles = StyleSheet.create({
  pill: {
    backgroundColor: "#0F172A",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 999,
    borderWidth: 1.5,
    marginRight: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 10
  },
  selected: {
    backgroundColor: "#00C8FF",
    borderColor: "#00C8FF",
    shadowColor: "#00C8FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4
  },
  text: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700"
  },
  selectedText: {
    color: "#070D19",
    fontWeight: "900"
  }
});

export const titleStyles = StyleSheet.create({
  wrap: {
    marginBottom: 24
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: 6,
    includeFontPadding: false
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false
  }
});

export const stepStyles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  badgeActive: {
    backgroundColor: "rgba(0, 200, 255, 0.12)",
    borderColor: "#00C8FF"
  },
  step: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
    marginRight: 10
  },
  stepActive: {
    color: "#00C8FF"
  },
  label: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700"
  },
  labelActive: {
    color: "#FFFFFF"
  }
});

export const overlayStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#070D19",
    justifyContent: "center",
    zIndex: 50
  },
  text: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12
  }
});

export const checkboxStyles = StyleSheet.create({
  wrap: {
    marginVertical: 14
  },
  container: {
    alignItems: "flex-start",
    flexDirection: "row"
  },
  pressed: {
    opacity: 0.8
  },
  box: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
    width: 22
  },
  boxChecked: {
    backgroundColor: "#00C8FF",
    borderColor: "#00C8FF"
  },
  boxError: {
    borderColor: "#EF4444"
  },
  checkmark: {
    color: "#070D19",
    fontSize: 13,
    fontWeight: "900"
  },
  label: {
    color: "#CBD5E1",
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19
  }
});
