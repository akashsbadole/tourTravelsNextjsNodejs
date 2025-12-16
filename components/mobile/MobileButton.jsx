"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const MobileButton = forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "comfortable",
      loading = false,
      disabled = false,
      children,
      onClick,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      "mobile-button",
      "inline-flex",
      "items-center",
      "justify-center",
      "font-medium",
      "transition-all",
      "duration-150",
      "ease-in-out",
      "focus-visible:outline-none",
      "focus-visible:ring-2",
      "focus-visible:ring-offset-2",
      "focus-visible:ring-primary",
      "disabled:pointer-events-none",
      "disabled:opacity-50",
      "active:scale-95",
    ];

    const variantClasses = {
      primary: [
        "bg-primary",
        "text-primary-foreground",
        "border-2",
        "border-primary",
        "hover:bg-primary/90",
        "hover:border-primary/90",
      ],
      secondary: [
        "bg-secondary",
        "text-secondary-foreground",
        "border-2",
        "border-secondary",
        "hover:bg-secondary/80",
        "hover:border-secondary/80",
      ],
      outline: [
        "bg-transparent",
        "text-primary",
        "border-2",
        "border-primary",
        "hover:bg-primary",
        "hover:text-primary-foreground",
      ],
      ghost: [
        "bg-transparent",
        "text-primary",
        "border-2",
        "border-transparent",
        "hover:bg-primary/10",
      ],
      destructive: [
        "bg-destructive",
        "text-destructive-foreground",
        "border-2",
        "border-destructive",
        "hover:bg-destructive/90",
      ],
    };

    const sizeClasses = {
      compact: ["min-h-[44px]", "px-3", "py-2", "text-sm"],
      comfortable: ["min-h-[48px]", "px-4", "py-3", "text-base"],
      large: ["min-h-[52px]", "px-6", "py-4", "text-lg"],
    };

    const classes = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        onClick={onClick}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

MobileButton.displayName = "MobileButton";

export { MobileButton };