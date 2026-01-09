"use client";

import { TextareaHTMLAttributes, useId } from "react";
import {
  Textarea as ChakraTextarea,
  TextareaProps as ChakraTextareaProps,
  Field,
} from "@chakra-ui/react";

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "color"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({ label, error, helperText, id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  
  const textareaStyles: ChakraTextareaProps = {
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
    resize: "none",
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
    <Field.Root id={textareaId} invalid={!!error} w="100%">
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
      <ChakraTextarea id={textareaId} {...textareaStyles} {...(props as ChakraTextareaProps)} />
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
