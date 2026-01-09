import { ReactNode } from "react";
import { Box, BoxProps } from "@chakra-ui/react";

interface PageContainerProps extends Omit<BoxProps, "children"> {
  children: ReactNode;
}

export function PageContainer({ children, ...props }: PageContainerProps) {
  return (
    <Box
      mx="auto"
      w="100%"
      maxW="md"
      p={{ base: 5, sm: 6 }}
      {...props}
    >
      {children}
    </Box>
  );
}
