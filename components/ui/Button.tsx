'use client';

import React, { ButtonHTMLAttributes } from 'react';
import {
  CONTROL_DISABLED_CLASS,
  CONTROL_FRAME_CLASS,
  CONTROL_HEIGHT_CLASS,
  CONTROL_HEIGHT_PX,
  CONTROL_RADIUS_CLASS,
  CONTROL_SURFACE_CLASS,
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
    ${CONTROL_FRAME_CLASS}
    border
    relative
    overflow-hidden
    whitespace-nowrap
    focus-visible:outline-none
    focus-visible:ring-4
    focus-visible:ring-blue-500/15
    ${CONTROL_DISABLED_CLASS}
  `;

  const sizeStyles = {
    sm: 'px-4 text-sm',
    md: 'px-5 text-sm',
    lg: 'px-6 text-base',
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-blue-500/95 via-sky-500/95 to-indigo-600/95
      backdrop-blur-md
      text-white
      border border-white/20
      hover:brightness-[1.03]
      active:translate-y-0
    `,
    secondary: `
      ${CONTROL_SURFACE_CLASS}
      text-blue-600
      hover:text-blue-700
      active:translate-y-0
    `,
    success: `
      bg-gradient-to-r from-emerald-500/95 via-green-500/95 to-teal-600/95
      backdrop-blur-md
      text-white
      border border-white/20
      hover:brightness-[1.03]
      active:translate-y-0
    `,
    warning: `
      bg-gradient-to-r from-amber-400/95 via-orange-500/95 to-rose-500/95
      backdrop-blur-md
      text-white
      border border-white/20
      hover:brightness-[1.03]
      active:translate-y-0
    `,
    error: `
      bg-gradient-to-r from-rose-500/95 via-red-500/95 to-pink-600/95
      backdrop-blur-md
      text-white
      border border-white/20
      hover:brightness-[1.03]
      active:translate-y-0
    `,
    default: `
      ${CONTROL_SURFACE_CLASS}
      text-slate-700
      hover:text-slate-900
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
