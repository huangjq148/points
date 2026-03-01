'use client';

import React, { ButtonHTMLAttributes } from 'react';

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
    font-semibold
    rounded-2xl
    cursor-pointer
    transition-all
    duration-300
    ease-[cubic-bezier(0.4,0,0.2,1)]
    border-none
    outline-none
    relative
    overflow-hidden
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:hover:translate-y-0
    disabled:hover:shadow-none
  `;

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-blue-500/95 to-blue-600/95
      backdrop-blur-md
      text-white
      border border-white/20
      shadow-[0_4px_20px_rgba(59,130,246,0.35),0_2px_8px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]
      hover:shadow-[0_8px_30px_rgba(59,130,246,0.45),0_4px_12px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]
      hover:scale-[1.02]
      hover:-translate-y-0.5
      active:scale-[0.98]
      active:translate-y-0
    `,
    secondary: `
      bg-white/70
      backdrop-blur-md
      text-blue-600
      border border-white/60
      shadow-[0_4px_16px_rgba(59,130,246,0.12),0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]
      hover:bg-white/90
      hover:shadow-[0_8px_24px_rgba(59,130,246,0.18),0_4px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]
      hover:scale-[1.02]
      hover:-translate-y-0.5
      active:scale-[0.98]
      active:translate-y-0
    `,
    success: `
      bg-gradient-to-r from-green-500/95 to-green-600/95
      backdrop-blur-md
      text-white
      border border-white/20
      shadow-[0_4px_20px_rgba(34,197,94,0.35),0_2px_8px_rgba(34,197,94,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]
      hover:shadow-[0_8px_30px_rgba(34,197,94,0.45),0_4px_12px_rgba(34,197,94,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]
      hover:scale-[1.02]
      hover:-translate-y-0.5
      active:scale-[0.98]
      active:translate-y-0
    `,
    warning: `
      bg-gradient-to-r from-amber-500/95 to-amber-600/95
      backdrop-blur-md
      text-white
      border border-white/20
      shadow-[0_4px_20px_rgba(245,158,11,0.35),0_2px_8px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]
      hover:shadow-[0_8px_30px_rgba(245,158,11,0.45),0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]
      hover:scale-[1.02]
      hover:-translate-y-0.5
      active:scale-[0.98]
      active:translate-y-0
    `,
    error: `
      bg-gradient-to-r from-red-500/95 to-red-600/95
      backdrop-blur-md
      text-white
      border border-white/20
      shadow-[0_4px_20px_rgba(239,68,68,0.35),0_2px_8px_rgba(239,68,68,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]
      hover:shadow-[0_8px_30px_rgba(239,68,68,0.45),0_4px_12px_rgba(239,68,68,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]
      hover:scale-[1.02]
      hover:-translate-y-0.5
      active:scale-[0.98]
      active:translate-y-0
    `,
    default: `
      bg-white/80
      backdrop-blur-md
      text-gray-700
      border border-white/60
      shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]
      hover:bg-white/95
      hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_4px_10px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]
      hover:scale-[1.02]
      hover:-translate-y-0.5
      active:scale-[0.98]
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
        width: fullWidth ? '100%' : 'auto',
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
