import React, { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', rightElement, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`
            w-full px-4 py-2 rounded-xl border transition-all duration-200
            bg-white/50 backdrop-blur-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            placeholder:text-gray-400
            ${error ? 'border-red-500' : 'border-gray-200 hover:border-blue-300'}
            ${rightElement ? 'pr-10' : ''}
            ${className}
          `}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center z-10">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
