"use client";

import React, { useRef, memo } from "react";
import DatePicker, { registerLocale, DatePickerProps } from "react-datepicker";
import { zhCN } from "date-fns/locale";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_FRAME_CLASS,
  CONTROL_HEIGHT_CLASS,
  CONTROL_RADIUS_CLASS,
  CONTROL_SURFACE_CLASS,
  CONTROL_WRAPPER_RADIUS_CLASS,
} from "./controlStyles";

registerLocale("zh-CN", zhCN);

export interface CustomDatePickerProps extends Omit<DatePickerProps, 'onChange' | 'className'> {
  onChange: (date: Date | null, event?: React.SyntheticEvent<unknown> | undefined) => void;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  popperPlacement?: DatePickerProps['popperPlacement'];
  withPortal?: boolean;
}

const CustomDatePicker = memo(({
  className = "",
  icon = <Calendar size={18} />,
  iconPosition = 'right',
  popperPlacement = "bottom-start",
  withPortal = false,
  locale = "zh-CN",
  dateFormat = "yyyy-MM-dd",
  isClearable = true,
  placeholderText = "选择日期",
  wrapperClassName = "w-full",
  calendarClassName,
  popperClassName,
  ...props
}: CustomDatePickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultClassName = `
    relative
    z-0
    w-full
    px-4
    text-sm
    text-[var(--ui-text-primary)]
    placeholder:text-[var(--ui-text-soft)]
    ${CONTROL_HEIGHT_CLASS}
    ${CONTROL_RADIUS_CLASS}
    ${CONTROL_SURFACE_CLASS}
    ${CONTROL_FRAME_CLASS}
    ${CONTROL_FOCUS_CLASS}
  `.trim().replace(/\s+/g, " ");
  
  // 组合样式
  const combinedClassName = `
    ${defaultClassName}
    ${icon && iconPosition === 'left' ? "pl-10" : ""}
    ${icon && iconPosition === 'right' ? "pr-10" : ""}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const combinedCalendarClassName = `ui-datepicker-calendar ${calendarClassName ?? ""}`
    .trim()
    .replace(/\s+/g, " ");

  const combinedPopperClassName = `ui-datepicker-popper ${popperClassName ?? ""}`
    .trim()
    .replace(/\s+/g, " ");

  return (
    <div
      ref={containerRef}
      className={`relative w-full group ${CONTROL_WRAPPER_RADIUS_CLASS} ${icon && iconPosition === 'right' ? 'has-right-icon' : ''}`}
    >
      {icon && (
        <div className={`
          absolute top-1/2 -translate-y-1/2 text-[var(--ui-text-soft)] z-20 transition-colors group-focus-within:text-[var(--ui-focus)]
          ${iconPosition === 'left' ? "left-3" : "right-3"}
        `}>
          {icon}
        </div>
      )}
      <DatePicker
        locale={locale}
        dateFormat={dateFormat}
        isClearable={isClearable}
        placeholderText={placeholderText}
        popperProps={{ strategy: "fixed" }}
        popperPlacement={popperPlacement}
        withPortal={withPortal}
        calendarClassName={combinedCalendarClassName}
        popperClassName={combinedPopperClassName}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
        className={combinedClassName}
        wrapperClassName={wrapperClassName}
      />
    </div>
  );
});

CustomDatePicker.displayName = "DatePicker";

export default CustomDatePicker;
