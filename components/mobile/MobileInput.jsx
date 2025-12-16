"use client";

import React, { forwardRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, AlertCircle, Calendar, Search } from "lucide-react";
import { DatePicker } from "@/components/local-ui/DatePicker";
import { format, isDateObjValid } from "date-fns";

const MobileInput = forwardRef(
  (
    {
      className,
      type = "text",
      label,
      error,
      required = false,
      disabled = false,
      placeholder,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      minDate,
      maxDate,
      showPasswordToggle = false,
      showSearchIcon = false,
      ...props
    },
    ref
  ) => {
    const [inputType, setInputType] = useState(type);
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
      if (type === "password") {
        setInputType(showPassword ? "text" : "password");
      }
    }, [showPassword, type]);

    const handleFocus = (e) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const togglePassword = () => {
      setShowPassword(!showPassword);
    };

    const baseClasses = [
      "w-full",
      "min-h-[48px]",
      "px-4",
      "py-3",
      "text-base",
      "bg-background",
      "border-2",
      "rounded-lg",
      "transition-all",
      "duration-150",
      "ease-in-out",
      "focus:outline-none",
      "focus:ring-2",
      "focus:ring-primary/20",
      "focus:border-primary",
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
      "placeholder:text-muted-foreground",
    ];

    const stateClasses = [
      error
        ? "border-destructive focus:ring-destructive/20"
        : isFocused
        ? "border-primary"
        : "border-input",
    ];

    const iconPadding = showPasswordToggle || showSearchIcon ? "pr-12" : "";

    if (type === "date") {
      const DatePickerCustomInput = forwardRef(({ value, onClick }, ref) => (
        <div
          ref={ref}
          onClick={onClick}
          className={cn(
            ...baseClasses,
            ...stateClasses,
            iconPadding,
            "flex items-center justify-between cursor-pointer",
            className
          )}
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {isDateObjValid(value)
              ? format(value, "dd MMM yyyy")
              : placeholder || "Select date"}
          </span>
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
      ));

      DatePickerCustomInput.displayName = "DatePickerCustomInput";

      return (
        <div className="relative w-full">
          {label && (
            <label className="block text-sm font-medium text-foreground mb-2">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          <DatePicker
            customInput={<DatePickerCustomInput />}
            date={value || defaultValue}
            minDate={minDate}
            maxDate={maxDate}
            setDate={(selected) => {
              const dateStr = selected
                ? new Date(selected).toLocaleString("en-CA", {
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })
                : "";
              onChange?.({ target: { value: dateStr, name: props.name } });
            }}
          />
          {error && (
            <div className="flex items-center gap-1 mt-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-2">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {showSearchIcon && (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          )}
          
          <input
            ref={ref}
            type={inputType}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              ...baseClasses,
              ...stateClasses,
              iconPadding,
              showSearchIcon && "pl-12",
              className
            )}
            {...props}
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {showPasswordToggle && type === "password" && (
              <button
                type="button"
                onClick={togglePassword}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            )}
            
            {error && (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-1 mt-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

MobileInput.displayName = "MobileInput";

export { MobileInput };