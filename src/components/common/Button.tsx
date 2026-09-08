import React from "react";
import { Loader } from "./Loader";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "success" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-bold rounded-lg transition-all outline-none focus:ring-2 focus:ring-offset-1 ";
  
  const sizeClasses = {
    sm: "py-1.5 px-3 text-sm font-semibold",
    md: "py-2.5 px-5 text-sm font-semibold tracking-wide",
    lg: "py-3.5 px-7 text-base font-semibold tracking-wider",
  };

  const variantClasses = {
    primary: "bg-gradient-primary hover:opacity-95 text-white focus:ring-primary-teal shadow-md active:scale-[0.98]",
    secondary: "bg-secondary-cyan hover:opacity-90 text-white focus:ring-secondary-cyan shadow-soft",
    danger: "bg-error hover:opacity-90 text-white focus:ring-error shadow-soft",
    success: "bg-success hover:opacity-90 text-white focus:ring-success shadow-soft",
    outline: "bg-transparent border border-border-ui text-text-primary hover:bg-background focus:ring-primary-teal",
    ghost: "bg-transparent hover:bg-background text-text-primary focus:ring-primary-teal",
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? "w-full" : ""}
        ${isDisabled ? "opacity-70 cursor-not-allowed pointer-events-none" : ""}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? <span className="inline-flex items-center mr-2"><Loader size="sm" /></span> : null}
      <span className="inline-flex items-center">{children}</span>
    </button>
  );
};
