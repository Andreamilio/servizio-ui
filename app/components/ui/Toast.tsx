// Toast system using ChakraUI's useToast hook
// This is a utility file, not a component
export { useToast, createToaster } from "@chakra-ui/react";

// Helper function to create toast notifications with our design system styles
export function createToastConfig(
  type: "success" | "error",
  title: string,
  description?: string
) {
  return {
    title,
    description,
    status: type,
    duration: 3000,
    isClosable: true,
    position: "top" as const,
    containerStyle: {
      bg: type === "success" ? "var(--toast-success-bg)" : "var(--toast-error-bg)",
      border: "1px solid",
      borderColor: type === "success" ? "var(--toast-success-border)" : "var(--toast-error-border)",
      color: type === "success" ? "var(--toast-success-text)" : "var(--toast-error-text)",
      borderRadius: "xl",
    },
  };
}
