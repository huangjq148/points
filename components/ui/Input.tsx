import React, {
  InputHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_FRAME_CLASS,
  CONTROL_HEIGHT_CLASS,
  CONTROL_HEIGHT_PX,
  CONTROL_RADIUS_CLASS,
  CONTROL_WRAPPER_RADIUS_CLASS,
} from './controlStyles';

type InputSize = 'sm' | 'md' | 'lg';
type LabelPosition = 'top' | 'left';
type InputVariant = 'default' | 'filled' | 'ghost';
type InputStatus = 'default' | 'error' | 'success' | 'warning';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'prefix'
> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;

  labelPosition?: LabelPosition;
  size?: InputSize;
  variant?: InputVariant;
  status?: InputStatus;

  isSearch?: boolean;
  allowClear?: boolean;
  loading?: boolean;
  hideClearWhenLoading?: boolean;

  debounce?: boolean;
  debounceDelay?: number;

  fullWidth?: boolean;

  onValueChange?: (value: string) => void;
  onClear?: () => void;

  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;

  /**
   * 兼容旧参数
   */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  rightElement?: React.ReactNode;

  containerClassName?: string;
  inputWrapperClassName?: string;
  labelClassName?: string;
  helperTextClassName?: string;
}

const SearchIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
    aria-hidden='true'
  >
    <circle cx='11' cy='11' r='8' />
    <path d='m21 21-4.35-4.35' />
  </svg>
);

const ClearIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
    aria-hidden='true'
  >
    <path d='M18 6 6 18' />
    <path d='m6 6 12 12' />
  </svg>
);

const LoadingIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    className={`${className} animate-spin`}
    aria-hidden='true'
  >
    <circle
      cx='12'
      cy='12'
      r='9'
      stroke='currentColor'
      strokeWidth='2'
      opacity='0.25'
    />
    <path
      d='M21 12a9 9 0 0 0-9-9'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
);

const CheckIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
    aria-hidden='true'
  >
    <path d='M20 6 9 17l-5-5' />
  </svg>
);

const WarningIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
    aria-hidden='true'
  >
    <path d='M12 9v4' />
    <path d='M12 17h.01' />
    <path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z' />
  </svg>
);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const sizeClassMap: Record<
  InputSize,
  {
    input: string;
    leftPadding: string;
    rightPaddingBase: number;
    label: string;
    helper: string;
    icon: string;
    clearBtn: string;
  }
> = {
  sm: {
    input: 'text-sm pl-3 pr-3',
    leftPadding: 'pl-9',
    rightPaddingBase: 36,
    label: 'text-sm',
    helper: 'text-xs',
    icon: 'w-4 h-4',
    clearBtn: 'p-0',
  },
  md: {
    input: 'text-sm pl-4 pr-4',
    leftPadding: 'pl-10',
    rightPaddingBase: 40,
    label: 'text-sm',
    helper: 'text-xs',
    icon: 'w-4 h-4',
    clearBtn: 'p-0',
  },
  lg: {
    input: 'text-base pl-4 pr-4',
    leftPadding: 'pl-11',
    rightPaddingBase: 44,
    label: 'text-base',
    helper: 'text-sm',
    icon: 'w-5 h-5',
    clearBtn: 'p-0',
  },
};

function getVariantClasses(variant: InputVariant) {
  if (variant === 'filled') {
    return 'bg-white/92';
  }

  if (variant === 'ghost') {
    return 'bg-transparent backdrop-blur-sm hover:bg-white/78';
  }

  return 'bg-white/88 backdrop-blur-sm';
}

function getStatusClasses(status: InputStatus, disabled?: boolean) {
  if (disabled) {
    return {
      border: 'border-slate-200',
      focus: 'focus:ring-slate-300/20 focus:border-slate-300',
      text: 'text-slate-500',
      helper: 'text-slate-400',
      icon: 'text-slate-400',
    };
  }

  switch (status) {
    case 'error':
      return {
        border: 'border-red-400 hover:border-red-500',
        focus:
          'focus:outline-none focus:ring-4 focus:ring-red-500/12 focus:border-red-500 focus:shadow-[0_16px_32px_rgba(239,68,68,0.16),inset_0_1px_0_rgba(255,255,255,0.88)]',
        text: 'text-gray-900',
        helper: 'text-red-500',
        icon: 'text-red-500',
      };
    case 'success':
      return {
        border: 'border-green-400 hover:border-green-500',
        focus:
          'focus:outline-none focus:ring-4 focus:ring-green-500/12 focus:border-green-500 focus:shadow-[0_16px_32px_rgba(34,197,94,0.16),inset_0_1px_0_rgba(255,255,255,0.88)]',
        text: 'text-gray-900',
        helper: 'text-green-600',
        icon: 'text-green-600',
      };
    case 'warning':
      return {
        border: 'border-amber-400 hover:border-amber-500',
        focus:
          'focus:outline-none focus:ring-4 focus:ring-amber-500/12 focus:border-amber-500 focus:shadow-[0_16px_32px_rgba(245,158,11,0.16),inset_0_1px_0_rgba(255,255,255,0.88)]',
        text: 'text-gray-900',
        helper: 'text-amber-600',
        icon: 'text-amber-600',
      };
    default:
      return {
        border: 'border-slate-200/90 hover:border-slate-300/90',
        focus: CONTROL_FOCUS_CLASS,
        text: 'text-slate-900',
        helper: 'text-slate-500',
        icon: 'text-slate-400',
      };
  }
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      className = '',
      labelPosition = 'top',
      size = 'md',
      variant = 'default',
      status = 'default',
      isSearch = false,
      allowClear = false,
      loading = false,
      hideClearWhenLoading = true,
      debounce = false,
      debounceDelay = 300,
      fullWidth = true,
      onValueChange,
      onClear,
      startAdornment,
      endAdornment,
      prefix,
      suffix,
      rightElement,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      disabled,
      id,
      type = 'text',
      style,
      containerClassName = '',
      inputWrapperClassName = '',
      labelClassName = '',
      helperTextClassName = '',
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const inputRef = useRef<HTMLInputElement | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isControlled = value !== undefined;
    const styles = sizeClassMap[size];

    const mergedStatus: InputStatus = error ? 'error' : status;

    const [uncontrolledValue, setUncontrolledValue] = useState<string>(() => {
      if (defaultValue == null) return '';
      return String(defaultValue);
    });

    const currentValue = isControlled ? String(value ?? '') : uncontrolledValue;
    const hasValue = currentValue.length > 0;

    const variantClasses = getVariantClasses(variant);
    const statusClasses = getStatusClasses(mergedStatus, disabled);

    const mergedStartAdornment = isSearch ? (
      <SearchIcon className={styles.icon} />
    ) : (
      (startAdornment ?? prefix)
    );

    const showClear =
      allowClear &&
      !disabled &&
      hasValue &&
      (!loading || !hideClearWhenLoading);

    const mergedEndAdornment: React.ReactNode[] = [];


    if (loading) {
      mergedEndAdornment.push(
        <span
          key='loading'
          className='flex items-center justify-center text-gray-400'
          aria-label='加载中'
        >
          <LoadingIcon className={styles.icon} />
        </span>,
      );
    }

    if (showClear) {
      mergedEndAdornment.push(
        <button
          key='clear'
          type='button'
          tabIndex={-1}
          aria-label='清空输入内容'
          onClick={handleClear}
          className={cx(
            'flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors',
            styles.clearBtn,
          )}
        >
          <ClearIcon className={styles.icon} />
        </button>,
      );
    }

    if (endAdornment) {
      mergedEndAdornment.push(
        <span key='endAdornment' className='flex items-center'>
          {endAdornment}
        </span>,
      );
    }

    if (suffix) {
      mergedEndAdornment.push(
        <span key='suffix' className='flex items-center'>
          {suffix}
        </span>,
      );
    }

    if (rightElement) {
      mergedEndAdornment.push(
        <span key='rightElement' className='flex items-center'>
          {rightElement}
        </span>,
      );
    }

    if (!loading && mergedStatus === 'success') {
      mergedEndAdornment.push(
        <span key='success' className='flex items-center text-green-600'>
          <CheckIcon className={styles.icon} />
        </span>,
      );
    }

    if (!loading && mergedStatus === 'warning') {
      mergedEndAdornment.push(
        <span key='warning' className='flex items-center text-amber-600'>
          <WarningIcon className={styles.icon} />
        </span>,
      );
    }

    const hasLeftSection = !!mergedStartAdornment;
    const hasRightSection = mergedEndAdornment.length > 0;

    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const setMergedRef = (node: HTMLInputElement | null) => {
      inputRef.current = node;

      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const emitValueChange = (nextValue: string, immediate = false) => {
      if (!onValueChange) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!debounce || immediate) {
        onValueChange(nextValue);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        onValueChange(nextValue);
      }, debounceDelay);
    };

    const handleClear = () => {
      if (disabled) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!isControlled) {
        setUncontrolledValue('');
      }

      const node = inputRef.current;

      if (node) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set;

        nativeSetter?.call(node, '');

        const inputEvent = new Event('input', { bubbles: true });
        node.dispatchEvent(inputEvent);
        node.focus();
      }

      emitValueChange('', true);
      onClear?.();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target.value;

      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      onChange?.(e);
      emitValueChange(nextValue);
    };

    const finalEndNodes = mergedEndAdornment;

    const rightPadding = hasRightSection
      ? Math.max(styles.rightPaddingBase, finalEndNodes.length * 28 + 16)
      : undefined;

    const describedBy =
      [error ? errorId : '', !error && helperText ? helperId : '']
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <div
        className={cx(
          fullWidth ? 'w-full' : 'w-auto',
          labelPosition === 'left' && 'flex items-center gap-3',
          containerClassName,
        )}
      >
        {label && (
          <label
            htmlFor={inputId}
            className={cx(
              'font-medium text-slate-700 cursor-text',
              styles.label,
              labelPosition === 'top' ? 'block mb-1' : 'shrink-0',
              labelClassName,
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cx(labelPosition === 'left' ? 'flex-1 min-w-0' : 'w-full')}
        >
          <div
            className={cx(
              'relative',
              CONTROL_WRAPPER_RADIUS_CLASS,
              'overflow-hidden',
              inputWrapperClassName,
            )}
          >
            {hasLeftSection && (
              <div
                className={cx(
                  'absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center pointer-events-none',
                  statusClasses.icon,
                )}
              >
                {mergedStartAdornment}
              </div>
            )}

            <input
              {...props}
              id={inputId}
              ref={setMergedRef}
              type={type}
              value={currentValue}
              onChange={handleChange}
              onBlur={onBlur}
              onFocus={onFocus}
              disabled={disabled}
              aria-invalid={mergedStatus === 'error'}
              aria-describedby={describedBy}
              className={cx(
                'relative z-0 w-full border transition-all duration-200',
                CONTROL_HEIGHT_CLASS,
                CONTROL_RADIUS_CLASS,
                CONTROL_FRAME_CLASS,
                'disabled:bg-slate-100 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none',
                'placeholder:text-slate-400',
                variantClasses,
                statusClasses.border,
                statusClasses.focus,
                statusClasses.text,
                styles.input,
                hasLeftSection && styles.leftPadding,
                className,
              )}
              style={{
                minHeight: CONTROL_HEIGHT_PX,
                height: CONTROL_HEIGHT_PX,
                paddingRight: rightPadding,
                ...style,
              }}
            />

            {hasRightSection && (
              <div className='absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2'>
                {finalEndNodes}
              </div>
            )}
          </div>

          {error ? (
            <p
              id={errorId}
              className={cx(
                'mt-1',
                styles.helper,
                'text-red-500',
                helperTextClassName,
              )}
            >
              {error}
            </p>
          ) : helperText ? (
            <p
              id={helperId}
              className={cx(
                'mt-1',
                styles.helper,
                statusClasses.helper,
                helperTextClassName,
              )}
            >
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
