import { ButtonHTMLAttributes, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] focus:ring-[var(--accent-primary)]",
    secondary: "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-light)] hover:bg-[var(--bg-tertiary)] focus:ring-[var(--border-medium)]",
    ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus:ring-[var(--border-medium)]",
    danger: "bg-[var(--accent-error)] text-white hover:opacity-90 focus:ring-[var(--accent-error)]",
    success: "bg-[var(--accent-success)] text-white hover:opacity-90 focus:ring-[var(--accent-success)]",
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;
  const iconClasses = children ? (iconPosition === "left" ? "mr-2" : "ml-2") : "";
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {Icon && iconPosition === "left" && (
        <Icon size={iconSize} className={iconClasses} />
      )}
      {children}
      {Icon && iconPosition === "right" && (
        <Icon size={iconSize} className={iconClasses} />
      )}
    </button>
  );
}

