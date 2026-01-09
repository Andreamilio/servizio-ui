"use client";

import { ReactNode, HTMLAttributes } from "react";
import { Box, BoxProps } from "@chakra-ui/react";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  variant?: "default" | "elevated" | "outlined";
  children: ReactNode;
}

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  children: ReactNode;
}

interface CardBodyProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  children: ReactNode;
}

interface CardFooterProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  children: ReactNode;
}

export function Card({ variant = "default", children, ...props }: CardProps) {
  const getVariantStyles = (): BoxProps => {
    const baseStyles: BoxProps = {
      borderRadius: "2xl",
      bg: "var(--bg-card)",
      border: "1px solid",
      borderColor: "var(--border-light)",
      transition: "colors",
    };

    switch (variant) {
      case "default":
        return {
          ...baseStyles,
          boxShadow: "var(--shadow-sm)",
        };
      case "elevated":
        return {
          ...baseStyles,
          boxShadow: "var(--shadow-lg)",
        };
      case "outlined":
        return baseStyles;
      default:
        return baseStyles;
    }
  };

  return (
    <Box {...getVariantStyles()} {...(props as BoxProps)}>
      {children}
    </Box>
  );
}

export function CardHeader({ children, ...props }: CardHeaderProps) {
  return (
    <Box
      p={{ base: 5, lg: 6 }}
      borderBottom="1px solid"
      borderColor="var(--border-light)"
      {...(props as BoxProps)}
    >
      {children}
    </Box>
  );
}

export function CardBody({ children, ...props }: CardBodyProps) {
  return (
    <Box
      p={{ base: 5, lg: 6 }}
      {...(props as BoxProps)}
    >
      {children}
    </Box>
  );
}

export function CardFooter({ children, ...props }: CardFooterProps) {
  return (
    <Box
      p={{ base: 4, lg: 6 }}
      borderTop="1px solid"
      borderColor="var(--border-light)"
      {...(props as BoxProps)}
    >
      {children}
    </Box>
  );
}
