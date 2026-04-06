import React, { useState } from 'react';
import Input, { InputProps } from './Input';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightElement={
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="rounded-full p-1 text-[var(--ui-text-soft)] transition-all hover:bg-[var(--ui-surface-3)] hover:text-[var(--ui-text-secondary)] focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        }
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
