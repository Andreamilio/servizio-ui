"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { Button as ChakraButton, ButtonProps as ChakraButtonProps } from "@chakra-ui/react";
import { LucideIcon } from "lucide-react";
import { useTheme } from "@/app/lib/theme";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  children: ReactNode;
  asChild?: boolean;
  leftIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  fullWidth = false,
  children,
  leftIcon: propLeftIcon,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Map our variants to ChakraUI button styles
  const getButtonStyles = (): ChakraButtonProps => {
    const baseStyles: ChakraButtonProps = {
      borderRadius: "xl",
      fontWeight: "semibold",
      transition: "all 0.2s",
      width: fullWidth ? "100%" : undefined,
    };

    switch (variant) {
      case "primary":
        return {
          ...baseStyles,
          bg: "var(--accent-primary)",
          color: "white",
          _hover: { bg: "var(--accent-primary-hover)" },
          _focus: { ring: "2px", ringColor: "var(--accent-primary)", ringOffset: "2px" },
        };
      case "secondary":
        return {
          ...baseStyles,
          bg: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: "1px solid",
          borderColor: "var(--border-light)",
          _hover: { bg: "var(--bg-tertiary)" },
          _focus: { ring: "2px", ringColor: "var(--border-medium)", ringOffset: "2px" },
        };
      case "ghost":
        return {
          ...baseStyles,
          bg: "transparent",
          color: "var(--text-primary)",
          _hover: { bg: "var(--bg-secondary)" },
          _focus: { ring: "2px", ringColor: "var(--border-medium)", ringOffset: "2px" },
        };
      case "danger":
        return {
          ...baseStyles,
          bg: "var(--accent-error)",
          color: "white",
          _hover: { opacity: 0.9 },
          _focus: { ring: "2px", ringColor: "var(--accent-error)", ringOffset: "2px" },
        };
      case "success":
        return {
          ...baseStyles,
          bg: "var(--accent-success)",
          color: "white",
          _hover: { opacity: 0.9 },
          _focus: { ring: "2px", ringColor: "var(--accent-success)", ringOffset: "2px" },
        };
      default:
        return baseStyles;
    }
  };

  const sizeMap = {
    sm: "sm" as const,
    md: "md" as const,
    lg: "lg" as const,
  };

  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;

  // ChakraUI Button uses leftIcon and rightIcon props
  const leftIcon = propLeftIcon || (Icon && iconPosition === "left" ? <Icon size={iconSize} /> : undefined);
  const rightIcon = Icon && iconPosition === "right" ? <Icon size={iconSize} /> : undefined;

  return (
    <ChakraButton
      size={sizeMap[size]}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      asChild={props.asChild}
      {...getButtonStyles()}
      {...(props as ChakraButtonProps)}
    >
      {children}
    </ChakraButton>
  );
}
