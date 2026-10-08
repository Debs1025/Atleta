import { StyleSheet } from "react-native";

export const authScreenStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    paddingBottom: 36
  },
  shell: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 72
  },
  brand: {
    color: "#141c3a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.3
  },
  rule: {
    backgroundColor: "#141c3a",
    height: 1,
    marginVertical: 28,
    opacity: 0.8
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 18
  },
  divider: {
    backgroundColor: "#e5d2d2",
    flex: 1,
    height: 1
  },
  or: {
    color: "#6b7280",
    fontSize: 14,
    marginHorizontal: 18
  },
  spacer: {
    height: 12
  },
  footer: {
    color: "#6b7280",
    fontSize: 16,
    marginTop: 22,
    textAlign: "center"
  },
  footerLink: {
    color: "#141c3a",
    fontWeight: "800"
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6
  }
});

export const bannerStyles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  error: {
    backgroundColor: "#fff1f2",
    borderColor: "#ef4444"
  },
  success: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981"
  },
  info: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb"
  },
  text: {
    color: "#16203f",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  }
});

export const fieldStyles = StyleSheet.create({
  group: {
    marginBottom: 14
  },
  label: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6
  },
  input: {
    color: "#1f2937",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    flex: 1,
    backgroundColor: "#fff"
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#a3a3a3",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 54
  },
  inputWithAccessory: {
    paddingRight: 8
  },
  inputError: {
    borderColor: "#ef4444"
  },
  rightAccessory: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  helperText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 6
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6
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
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18
  },
  contentRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center"
  },
  icon: {
    height: 22,
    marginRight: 10,
    resizeMode: "contain",
    width: 22
  },
  primary: {
    backgroundColor: "#141c3a"
  },
  secondary: {
    backgroundColor: "#fff",
    borderColor: "#141c3a",
    borderWidth: 1
  },
  ghost: {
    backgroundColor: "transparent"
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.68
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  secondaryText: {
    color: "#141c3a"
  },
  ghostText: {
    color: "#141c3a"
  }
});

export const pillStyles = StyleSheet.create({
  pill: {
    borderColor: "#cbd5e1",
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10
  },
  selected: {
    backgroundColor: "#141c3a",
    borderColor: "#141c3a"
  },
  text: {
    color: "#141c3a",
    fontSize: 14,
    fontWeight: "800"
  },
  selectedText: {
    color: "#fff"
  }
});

export const titleStyles = StyleSheet.create({
  wrap: {
    marginBottom: 18
  },
  title: {
    color: "#141c3a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 6
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20
  }
});

export const stepStyles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  badgeActive: {
    backgroundColor: "#e0e7ff"
  },
  step: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    marginRight: 10
  },
  stepActive: {
    color: "#141c3a"
  },
  label: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700"
  },
  labelActive: {
    color: "#141c3a"
  }
});

export const overlayStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.74)",
    justifyContent: "center",
    zIndex: 50
  },
  text: {
    color: "#e2e8f0",
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
    backgroundColor: "#fff",
    borderColor: "#a3a3a3",
    borderRadius: 4,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
    width: 22
  },
  boxChecked: {
    backgroundColor: "#141c3a",
    borderColor: "#141c3a"
  },
  boxError: {
    borderColor: "#ef4444"
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900"
  },
  label: {
    color: "#4b5563",
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19
  }
});
