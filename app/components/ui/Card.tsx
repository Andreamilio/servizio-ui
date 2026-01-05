import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  children: ReactNode;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const baseClasses = "rounded-2xl bg-[var(--bg-card)] border transition-colors";
  
  const variantClasses = {
    default: "border-[var(--border-light)] shadow-sm",
    elevated: "border-[var(--border-light)] shadow-lg",
    outlined: "border-[var(--border-light)]",
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: CardHeaderProps) {
  return (
    <div className={`p-5 lg:p-6 border-b border-[var(--border-light)] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }: CardBodyProps) {
  return (
    <div className={`p-5 lg:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: CardFooterProps) {
  return (
    <div className={`p-4 lg:p-6 border-t border-[var(--border-light)] ${className}`} {...props}>
      {children}
    </div>
  );
}
