"use client";

import React, { useEffect, useState, useRef, memo } from "react";
import DatePicker, { registerLocale, DatePickerProps } from "react-datepicker";
import { zhCN } from "date-fns/locale";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("zh-CN", zhCN);

export interface CustomDatePickerProps extends Omit<DatePickerProps, 'onChange' | 'className'> {
  onChange: (date: Date | null, event?: React.SyntheticEvent<unknown> | undefined) => void;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const CustomDatePicker = memo(({
  className = "",
  icon = <Calendar size={18} />,
  iconPosition = 'right',
  locale = "zh-CN",
  dateFormat = "yyyy-MM-dd",
  isClearable = true,
  placeholderText = "选择日期",
  wrapperClassName = "w-full",
  ...props
}: CustomDatePickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldUsePortal, setShouldUsePortal] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const isInModal = !!containerRef.current.closest(".modal-content");
      setShouldUsePortal(isInModal);
    }
  }, []);

  const defaultClassName = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 backdrop-blur outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-sm";
  
  // 组合样式
  const combinedClassName = `
    ${defaultClassName}
    ${icon && iconPosition === 'left' ? "pl-10" : ""}
    ${icon && iconPosition === 'right' ? "pr-10" : ""}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div ref={containerRef} className={`relative w-full group ${icon && iconPosition === 'right' ? 'has-right-icon' : ''}`}>
      {icon && (
        <div className={`
          absolute top-1/2 -translate-y-1/2 text-gray-400 z-10 transition-colors group-focus-within:text-blue-500
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
        portalId={shouldUsePortal ? "datepicker-portal" : undefined}
        popperProps={shouldUsePortal ? { strategy: "fixed" } : undefined}
        popperPlacement={shouldUsePortal ? "bottom-start" : undefined}
        {...(props as any)}
        className={combinedClassName}
        wrapperClassName={wrapperClassName}
      />
    </div>
  );
});

CustomDatePicker.displayName = "DatePicker";

export default CustomDatePicker;
