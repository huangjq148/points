'use client';

import React, { ButtonHTMLAttributes } from 'react';
import {
  CONTROL_DISABLED_CLASS,
  CONTROL_FRAME_CLASS,
  CONTROL_HEIGHT_CLASS,
  CONTROL_HEIGHT_PX,
  CONTROL_PRIMARY_BORDER_CLASS,
  CONTROL_PRIMARY_GRADIENT_CLASS,
  CONTROL_PRIMARY_SHADOW_CLASS,
  CONTROL_RADIUS_CLASS,
  CONTROL_SURFACE_CLASS,
  CONTROL_TEXT_CLASS,
} from './controlStyles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'default';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex
    items-center
    justify-center
    gap-2
    ${CONTROL_HEIGHT_CLASS}
    font-semibold
    ${CONTROL_RADIUS_CLASS}
    cursor-pointer
    border
    relative
    overflow-hidden
    whitespace-nowrap
    focus-visible:outline-none
    focus-visible:ring-4
    focus-visible:ring-blue-500/10
    ${CONTROL_DISABLED_CLASS}
  `;

  const sizeStyles = {
    sm: 'px-4 text-sm',
    md: 'px-5 text-sm',
    lg: 'px-6 text-base',
  };

  const variantStyles = {
    primary: `
      ${CONTROL_PRIMARY_GRADIENT_CLASS}
      text-white
      ${CONTROL_PRIMARY_BORDER_CLASS}
      ${CONTROL_PRIMARY_SHADOW_CLASS}
      transition-all duration-200 ease-out
      hover:-translate-y-px
      hover:brightness-[1.03]
      hover:shadow-[var(--ui-primary-shadow-hover)]
      active:translate-y-0
    `,
    secondary: `
      ${CONTROL_FRAME_CLASS}
      ${CONTROL_SURFACE_CLASS}
      ${CONTROL_TEXT_CLASS}
      hover:text-[var(--ui-text-primary)]
      active:translate-y-0
    `,
    success: `
      ${CONTROL_FRAME_CLASS}
      bg-[var(--ui-success-bg)]
      text-[var(--ui-success-text)]
      border border-[color:var(--ui-success-border)]
      hover:bg-[var(--ui-success-bg-hover)]
      hover:border-[color:var(--ui-success-border-hover)]
      active:translate-y-0
    `,
    warning: `
      ${CONTROL_FRAME_CLASS}
      bg-[var(--ui-warning-bg)]
      text-[var(--ui-warning-text)]
      border border-[color:var(--ui-warning-border)]
      hover:bg-[var(--ui-warning-bg-hover)]
      hover:border-[color:var(--ui-warning-border-hover)]
      active:translate-y-0
    `,
    error: `
      ${CONTROL_FRAME_CLASS}
      bg-[var(--ui-danger-bg)]
      text-[var(--ui-danger-text)]
      border border-[color:var(--ui-danger-border)]
      hover:bg-[var(--ui-danger-bg-hover)]
      hover:border-[color:var(--ui-danger-border-hover)]
      active:translate-y-0
    `,
    default: `
      ${CONTROL_FRAME_CLASS}
      ${CONTROL_SURFACE_CLASS}
      ${CONTROL_TEXT_CLASS}
      hover:text-[var(--ui-text-primary)]
      active:translate-y-0
    `,
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      style={{
        width: fullWidth ? '100%' : undefined,
        minHeight: CONTROL_HEIGHT_PX,
        height: CONTROL_HEIGHT_PX,
        ...style,
      }}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
