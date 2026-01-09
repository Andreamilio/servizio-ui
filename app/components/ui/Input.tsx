"use client";

import { InputHTMLAttributes, ReactNode, useId } from "react";
import {
  Input as ChakraInput,
  InputProps as ChakraInputProps,
  Field,
} from "@chakra-ui/react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "color"> {
  label?: ReactNode;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  
  const inputStyles: ChakraInputProps = {
    width: "100%",
    borderRadius: "xl",
    bg: "var(--bg-secondary)",
    border: "1px solid",
    borderColor: error ? "var(--accent-error)" : "var(--border-light)",
    px: 4,
    py: 2.5,
    color: "var(--text-primary)",
    _placeholder: {
      color: "var(--text-tertiary)",
    },
    transition: "colors",
    _focus: {
      outline: "none",
      ring: "2px",
      ringColor: error ? "var(--accent-error)" : "var(--accent-primary)",
      borderColor: "transparent",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  };

  return (
    <Field.Root id={inputId} invalid={!!error} w="100%">
      {label && (
        <Field.Label
          fontSize="sm"
          fontWeight="medium"
          color="var(--text-primary)"
          mb={2}
        >
          {label}
        </Field.Label>
      )}
      <ChakraInput id={inputId} {...inputStyles} {...(props as ChakraInputProps)} />
      {error && (
        <Field.ErrorText mt={1.5} fontSize="sm" color="var(--accent-error)">
          {error}
        </Field.ErrorText>
      )}
      {helperText && !error && (
        <Field.HelperText mt={1.5} fontSize="sm" color="var(--text-secondary)">
          {helperText}
        </Field.HelperText>
      )}
    </Field.Root>
  );
}
