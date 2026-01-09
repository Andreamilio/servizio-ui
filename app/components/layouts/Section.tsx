import { ReactNode } from "react";
import { Box, BoxProps, Heading, Divider } from "@chakra-ui/react";

interface SectionProps extends Omit<BoxProps, "children"> {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  showDivider?: boolean;
}

export function Section({ title, subtitle, children, showDivider = false, ...props }: SectionProps) {
  return (
    <Box {...props}>
      {(title || subtitle) && (
        <Box mb={4}>
          {title && (
            <Heading as="h2" size="lg" fontWeight="semibold" mb={subtitle ? 1 : 0}>
              {title}
            </Heading>
          )}
          {subtitle && (
            <Box fontSize="xs" opacity={0.6}>
              {subtitle}
            </Box>
          )}
        </Box>
      )}
      {showDivider && <Divider mb={4} borderColor="var(--border-light)" />}
      {children}
    </Box>
  );
}
