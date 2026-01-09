"use client";

import { InputHTMLAttributes, ReactNode, forwardRef, useState, useEffect } from "react";
import { Checkbox as ChakraCheckbox } from "@chakra-ui/react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "color"> {
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  colorScheme?: string;
  opacity?: number | string;
  cursor?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ 
    children, 
    size = "md", 
    colorScheme, 
    defaultChecked, 
    checked, 
    onChange, 
    id,
    name,
    disabled,
    opacity,
    cursor,
    ...props 
  }, ref) {
    // Map size to Chakra UI v3 size prop
    const sizeMap = {
      sm: "sm" as const,
      md: "md" as const,
      lg: "lg" as const,
    };

    // Use internal state for both controlled and uncontrolled
    // This ensures the UI updates immediately on click
    const [internalChecked, setInternalChecked] = useState<boolean>(
      checked !== undefined ? checked : (defaultChecked ?? false)
    );

    // Determine if controlled or uncontrolled
    const isControlled = checked !== undefined;
    
    // Sync internal state when controlled checked prop changes from parent
    useEffect(() => {
      if (isControlled && checked !== undefined) {
        setInternalChecked(checked);
      }
    }, [checked, isControlled]);

    const handleChange = (newChecked: boolean) => {
      setInternalChecked(newChecked);
      
      if (onChange) {
        const syntheticEvent = {
          target: {
            checked: newChecked,
            value: newChecked ? "on" : "off",
          } as HTMLInputElement,
          currentTarget: {
            checked: newChecked,
            value: newChecked ? "on" : "off",
          } as HTMLInputElement,
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
    };

    return (
      <ChakraCheckbox.Root
        size={sizeMap[size]}
        colorPalette={colorScheme}
        disabled={disabled}
        opacity={opacity}
        cursor={cursor}
        checked={internalChecked}
        onCheckedChange={(details) => {
          const newChecked = details.checked === true;
          handleChange(newChecked);
        }}
      >
        <ChakraCheckbox.HiddenInput 
          ref={ref} 
          id={id} 
          name={name}
          value="on"
        />
        <ChakraCheckbox.Control
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Manually trigger the state change since onCheckedChange might not be called reliably
            const newChecked = !internalChecked;
            handleChange(newChecked);
          }}
        >
          <ChakraCheckbox.Indicator />
        </ChakraCheckbox.Control>
        {children && <ChakraCheckbox.Label>{children}</ChakraCheckbox.Label>}
      </ChakraCheckbox.Root>
    );
  }
);
