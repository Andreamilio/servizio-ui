"use client";

import { SelectHTMLAttributes, ReactNode } from "react";
import { Box, BoxProps } from "@chakra-ui/react";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "style"> {
  children: ReactNode;
  // Chakra UI style props
  borderRadius?: string;
  bg?: string;
  border?: string;
  borderColor?: string;
  px?: number | string;
  py?: number | string;
  fontSize?: string;
  color?: string;
  _focus?: BoxProps["_focus"];
  _hover?: BoxProps["_hover"];
  transition?: string;
  cursor?: string;
  flex?: BoxProps["flex"];
  minW?: BoxProps["minW"];
  opacity?: number | string;
}

export function Select({ children, ...props }: SelectProps) {
  // Extract Chakra UI style props from props
  const {
    borderRadius,
    bg,
    border,
    borderColor,
    px,
    py,
    fontSize,
    color,
    _focus,
    _hover,
    transition,
    cursor,
    flex,
    minW,
    ...selectProps
  } = props as any;

  const selectStyles: BoxProps = {
    as: "select",
    borderRadius: borderRadius || "xl",
    bg: bg || "var(--bg-secondary)",
    border: border || "1px solid",
    borderColor: borderColor || "var(--border-light)",
    px: px || 4,
    py: py || 2.5,
    fontSize: fontSize || "sm",
    color: color || "var(--text-primary)",
    _focus: _focus || {
      outline: "none",
      ring: "2px",
      ringColor: "var(--accent-primary)",
      borderColor: "var(--accent-primary)",
    },
    _hover: _hover || {
      borderColor: "var(--border-medium)",
      bg: "var(--bg-tertiary)",
    },
    transition: transition || "all 0.2s",
    cursor: cursor || "pointer",
    flex,
    minW,
  };

  return (
    <Box {...selectStyles} {...(selectProps as any)}>
      {children}
    </Box>
  );
}
