import { ReactNode } from "react";
import { Box, BoxProps, VStack, Divider } from "@chakra-ui/react";

interface SidebarProps extends Omit<BoxProps, "children"> {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function Sidebar({ header, footer, children, ...props }: SidebarProps) {
  return (
    <Box
      borderRadius="2xl"
      bg="var(--bg-card)"
      border="1px solid"
      borderColor="var(--border-light)"
      overflow="hidden"
      {...props}
    >
      {header && (
        <>
          <Box p={4} borderBottom="1px solid" borderColor="var(--border-light)">
            {header}
          </Box>
        </>
      )}
      <Box p={4}>{children}</Box>
      {footer && (
        <>
          <Divider borderColor="var(--border-light)" />
          <Box p={4} fontSize="xs" opacity={0.6}>
            {footer}
          </Box>
        </>
      )}
    </Box>
  );
}
