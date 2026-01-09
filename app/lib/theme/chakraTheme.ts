import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Light mode colors
const lightColors = {
  bg: {
    primary: "#ffffff",
    secondary: "#f8f9fa",
    tertiary: "#f1f3f5",
    card: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.4)",
  },
  text: {
    primary: "#1a1a1a",
    secondary: "#6b7280",
    tertiary: "#9ca3af",
    inverse: "#ffffff",
  },
  border: {
    light: "#e5e7eb",
    medium: "#d1d5db",
    strong: "#9ca3af",
  },
  accent: {
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    secondary: "#10b981",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#06b6d4",
  },
  pastel: {
    blue: "#dbeafe",
    green: "#d1fae5",
    purple: "#e9d5ff",
    pink: "#fce7f3",
    teal: "#ccfbf1",
    amber: "#fef3c7",
  },
  successButton: {
    bg: "#d1fae5",
    bgHover: "#a7f3d0",
    border: "#6ee7b7",
    text: "#065f46",
  },
  warning: {
    bg: "rgba(245, 158, 11, 0.1)",
    bgStrong: "#fef3c7",
    border: "rgba(245, 158, 11, 0.2)",
    borderStrong: "rgba(245, 158, 11, 0.3)",
    text: "#78350f",
    textIcon: "#92400e",
  },
  toast: {
    successBg: "rgba(16, 185, 129, 0.1)",
    successBorder: "rgba(16, 185, 129, 0.2)",
    successText: "#065f46",
    errorBg: "rgba(239, 68, 68, 0.1)",
    errorBorder: "rgba(239, 68, 68, 0.2)",
    errorText: "#991b1b",
  },
};

// Dark mode colors
const darkColors = {
  bg: {
    primary: "#0f172a",
    secondary: "#1e293b",
    tertiary: "#334155",
    card: "#1e293b",
    overlay: "rgba(0, 0, 0, 0.7)",
  },
  text: {
    primary: "#f1f5f9",
    secondary: "#cbd5e1",
    tertiary: "#94a3b8",
    inverse: "#0f172a",
  },
  border: {
    light: "#334155",
    medium: "#475569",
    strong: "#64748b",
  },
  accent: {
    primary: "#60a5fa",
    primaryHover: "#3b82f6",
    secondary: "#34d399",
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    info: "#22d3ee",
  },
  pastel: {
    blue: "#1e3a5f",
    green: "#1e3d2f",
    purple: "#3d2a4f",
    pink: "#4a2a3d",
    teal: "#1e3a36",
    amber: "#4a3d1e",
  },
  successButton: {
    bg: "#065f46",
    bgHover: "#047857",
    border: "#059669",
    text: "#a7f3d0",
  },
  warning: {
    bg: "rgba(251, 191, 36, 0.15)",
    bgStrong: "rgba(251, 191, 36, 0.2)",
    border: "rgba(251, 191, 36, 0.25)",
    borderStrong: "rgba(251, 191, 36, 0.3)",
    text: "#fde68a",
    textIcon: "#fbbf24",
  },
  toast: {
    successBg: "rgba(52, 211, 153, 0.15)",
    successBorder: "rgba(52, 211, 153, 0.25)",
    successText: "#6ee7b7",
    errorBg: "rgba(248, 113, 113, 0.15)",
    errorBorder: "rgba(248, 113, 113, 0.25)",
    errorText: "#fca5a5",
  },
};

// Shadows
const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "sm-dark": "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
  "md-dark": "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
  "lg-dark": "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)",
  "xl-dark": "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.5)",
};

// Border radius
const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
};

export const chakraTheme = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Map custom colors to ChakraUI color system
        // Using flat structure for now, will access via colorMode in components
        bgPrimary: { value: lightColors.bg.primary },
        bgSecondary: { value: lightColors.bg.secondary },
        bgTertiary: { value: lightColors.bg.tertiary },
        bgCard: { value: lightColors.bg.card },
        bgOverlay: { value: lightColors.bg.overlay },
        textPrimary: { value: lightColors.text.primary },
        textSecondary: { value: lightColors.text.secondary },
        textTertiary: { value: lightColors.text.tertiary },
        textInverse: { value: lightColors.text.inverse },
        borderLight: { value: lightColors.border.light },
        borderMedium: { value: lightColors.border.medium },
        borderStrong: { value: lightColors.border.strong },
        accentPrimary: { value: lightColors.accent.primary },
        accentPrimaryHover: { value: lightColors.accent.primaryHover },
        accentSecondary: { value: lightColors.accent.secondary },
        accentSuccess: { value: lightColors.accent.success },
        accentWarning: { value: lightColors.accent.warning },
        accentError: { value: lightColors.accent.error },
        accentInfo: { value: lightColors.accent.info },
        pastelBlue: { value: lightColors.pastel.blue },
        pastelGreen: { value: lightColors.pastel.green },
        pastelPurple: { value: lightColors.pastel.purple },
        pastelPink: { value: lightColors.pastel.pink },
        pastelTeal: { value: lightColors.pastel.teal },
        pastelAmber: { value: lightColors.pastel.amber },
        successButtonBg: { value: lightColors.successButton.bg },
        successButtonBgHover: { value: lightColors.successButton.bgHover },
        successButtonBorder: { value: lightColors.successButton.border },
        successButtonText: { value: lightColors.successButton.text },
        warningBg: { value: lightColors.warning.bg },
        warningBgStrong: { value: lightColors.warning.bgStrong },
        warningBorder: { value: lightColors.warning.border },
        warningBorderStrong: { value: lightColors.warning.borderStrong },
        warningText: { value: lightColors.warning.text },
        warningTextIcon: { value: lightColors.warning.textIcon },
        toastSuccessBg: { value: lightColors.toast.successBg },
        toastSuccessBorder: { value: lightColors.toast.successBorder },
        toastSuccessText: { value: lightColors.toast.successText },
        toastErrorBg: { value: lightColors.toast.errorBg },
        toastErrorBorder: { value: lightColors.toast.errorBorder },
        toastErrorText: { value: lightColors.toast.errorText },
      },
      shadows: {
        sm: { value: shadows.sm },
        md: { value: shadows.md },
        lg: { value: shadows.lg },
        xl: { value: shadows.xl },
      },
      radii: {
        sm: { value: radii.sm },
        md: { value: radii.md },
        lg: { value: radii.lg },
        xl: { value: radii.xl },
        full: { value: radii.full },
      },
    },
  },
});

// Create the system with the custom theme
export const system = createSystem(defaultConfig, chakraTheme);

// Export color values for direct use in components
export const colors = {
  light: lightColors,
  dark: darkColors,
};
