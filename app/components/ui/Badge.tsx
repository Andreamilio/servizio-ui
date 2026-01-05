import { ReactNode, HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Badge({ variant = "default", size = "md", className = "", children, ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-full";
  
  const variantClasses = {
    default: "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-light)]",
    success: "bg-[var(--pastel-green)] text-[var(--accent-success)]",
    warning: "bg-[var(--pastel-amber)] text-[var(--accent-warning)]",
    error: "bg-red-100 dark:bg-red-900/30 text-[var(--accent-error)]",
    info: "bg-[var(--pastel-blue)] text-[var(--accent-info)]",
  };
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </span>
  );
}
