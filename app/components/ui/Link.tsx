"use client";

import { ReactNode, AnchorHTMLAttributes } from "react";
import { Link as ChakraLink, LinkProps as ChakraLinkProps } from "@chakra-ui/react";
import NextLink from "next/link";

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color"> {
  href: string;
  children: ReactNode;
  variant?: "default" | "nav";
  isExternal?: boolean;
}

export function Link({ href, children, variant = "default", isExternal = false, ...props }: LinkProps) {
  const linkStyles: ChakraLinkProps = {
    color: variant === "nav" ? "var(--text-secondary)" : "var(--accent-primary)",
    _hover: {
      color: variant === "nav" ? "var(--text-primary)" : "var(--accent-primary-hover)",
      textDecoration: "underline",
    },
    transition: "colors",
  };

  if (isExternal || href.startsWith("http")) {
    return (
      <ChakraLink href={href} {...linkStyles} {...(props as ChakraLinkProps)}>
        {children}
      </ChakraLink>
    );
  }

  return (
    <ChakraLink asChild {...linkStyles} {...(props as ChakraLinkProps)}>
      <NextLink href={href}>
        {children}
      </NextLink>
    </ChakraLink>
  );
}
