"use client";

import { ReactNode } from "react";
import { Badge, BadgeProps, HStack, Box } from "@chakra-ui/react";

interface StatusPillProps {
  status: "online" | "offline" | "main" | "backup";
  children?: ReactNode;
}

export function StatusPill({ status, children }: StatusPillProps) {
  const getStatusStyles = (): BadgeProps => {
    const baseStyles: BadgeProps = {
      display: "inline-flex",
      alignItems: "center",
      gap: 2,
      borderRadius: "lg",
      border: "1px solid",
      px: 3,
      py: 2,
      fontSize: "xs",
      fontWeight: "semibold",
    };

    switch (status) {
      case "online":
        return {
          ...baseStyles,
          bg: "var(--pastel-green)",
          borderColor: "var(--border-light)",
          color: "var(--accent-success)",
        };
      case "offline":
        return {
          ...baseStyles,
          bg: "rgba(239, 68, 68, 0.1)",
          borderColor: "var(--border-light)",
          color: "var(--accent-error)",
        };
      case "main":
      case "backup":
        return {
          ...baseStyles,
          bg: "var(--bg-secondary)",
          borderColor: "var(--border-light)",
          color: "var(--text-primary)",
        };
      default:
        return baseStyles;
    }
  };

  const getDotColor = () => {
    switch (status) {
      case "online":
        return "#34d399"; // emerald-400
      case "offline":
        return "#f87171"; // red-400
      default:
        return "transparent";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "online":
        return "ONLINE";
      case "offline":
        return "OFFLINE";
      case "main":
        return "MAIN WAN";
      case "backup":
        return "BACKUP WAN";
      default:
        return "";
    }
  };

  return (
    <Badge {...getStatusStyles()}>
      {(status === "online" || status === "offline") && (
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg={getDotColor()}
        />
      )}
      {children || getLabel()}
    </Badge>
  );
}
