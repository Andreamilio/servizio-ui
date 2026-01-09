"use client";

import { ReactNode, HTMLAttributes } from "react";
import { Badge as ChakraBadge, BadgeProps as ChakraBadgeProps } from "@chakra-ui/react";

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Badge({ variant = "default", size = "md", children, ...props }: BadgeProps) {
  const getVariantStyles = (): ChakraBadgeProps => {
    const baseStyles: ChakraBadgeProps = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "semibold",
      borderRadius: "full",
    };

    switch (variant) {
      case "default":
        return {
          ...baseStyles,
          bg: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: "1px solid",
          borderColor: "var(--border-light)",
        };
      case "success":
        return {
          ...baseStyles,
          bg: "var(--pastel-green)",
          color: "var(--accent-success)",
        };
      case "warning":
        return {
          ...baseStyles,
          bg: "var(--pastel-amber)",
          color: "var(--accent-warning)",
        };
      case "error":
        return {
          ...baseStyles,
          bg: "rgba(239, 68, 68, 0.1)",
          color: "var(--accent-error)",
        };
      case "info":
        return {
          ...baseStyles,
          bg: "var(--pastel-blue)",
          color: "var(--accent-info)",
        };
      default:
        return baseStyles;
    }
  };

  const sizeMap = {
    sm: { px: 2, py: 0.5, fontSize: "xs" },
    md: { px: 2.5, py: 1, fontSize: "sm" },
    lg: { px: 3, py: 1.5, fontSize: "base" },
  };

  return (
    <ChakraBadge {...getVariantStyles()} {...sizeMap[size]} {...(props as ChakraBadgeProps)}>
      {children}
    </ChakraBadge>
  );
}
