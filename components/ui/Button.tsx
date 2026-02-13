'use client';

import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
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
    ease-out
    border-none
    outline-none
    disabled:opacity-50
    disabled:cursor-not-allowed
  `;

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-blue-500 to-blue-600
      text-white
      shadow-lg shadow-blue-500/30
      hover:shadow-xl hover:shadow-blue-500/40
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
    secondary: `
      bg-white/80
      backdrop-blur-sm
      text-blue-600
      border-2 border-blue-200
      hover:bg-blue-50
      hover:border-blue-300
      hover:scale-[1.02]
    `,
    success: `
      bg-gradient-to-r from-green-500 to-green-600
      text-white
      shadow-lg shadow-green-500/30
      hover:shadow-xl hover:shadow-green-500/40
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
    warning: `
      bg-gradient-to-r from-amber-500 to-amber-600
      text-white
      shadow-lg shadow-amber-500/30
      hover:shadow-xl hover:shadow-amber-500/40
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
    error: `
      bg-gradient-to-r from-red-500 to-red-600
      text-white
      shadow-lg shadow-red-500/30
      hover:shadow-xl hover:shadow-red-500/40
      hover:scale-[1.02]
      active:scale-[0.98]
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
