import { ReactNode } from "react";
import { Container as ChakraContainer, ContainerProps } from "@chakra-ui/react";

interface ContainerPropsCustom extends Omit<ContainerProps, "children"> {
  children: ReactNode;
}

export function Container({ children, ...props }: ContainerPropsCustom) {
  return (
    <ChakraContainer
      maxW="container.xl"
      px={{ base: 4, sm: 6 }}
      {...props}
    >
      {children}
    </ChakraContainer>
  );
}
