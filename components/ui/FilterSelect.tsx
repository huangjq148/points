"use client";

import React from "react";
import Select, { GroupBase, StylesConfig } from "react-select";
import {
  CONTROL_BOX_SHADOW,
  CONTROL_BOX_SHADOW_FOCUS,
  CONTROL_BOX_SHADOW_HOVER,
  CONTROL_BORDER_COLOR,
  CONTROL_BORDER_COLOR_FOCUS,
  CONTROL_BORDER_COLOR_HOVER,
  CONTROL_HEIGHT_PX,
  CONTROL_PANEL_BG,
  CONTROL_RADIUS_PX,
  CONTROL_RING,
  CONTROL_SURFACE_BG,
  CONTROL_SURFACE_BG_HOVER,
} from "./controlStyles";

export type FilterSelectOption = {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  avatar?: string;
  description?: string;
};

const selectStyles: StylesConfig<FilterSelectOption, false, GroupBase<FilterSelectOption>> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? CONTROL_SURFACE_BG_HOVER : CONTROL_SURFACE_BG,
    borderColor: state.isFocused ? CONTROL_BORDER_COLOR_FOCUS : CONTROL_BORDER_COLOR,
    borderRadius: `${CONTROL_RADIUS_PX}px`,
    minHeight: `${CONTROL_HEIGHT_PX}px`,
    height: `${CONTROL_HEIGHT_PX}px`,
    padding: "0px 4px",
    boxShadow: state.isFocused
      ? `${CONTROL_RING}, ${CONTROL_BOX_SHADOW_FOCUS}`
      : CONTROL_BOX_SHADOW,
    cursor: "pointer",
    transition: "all 180ms ease",
    backdropFilter: "blur(10px)",
    transform: state.isFocused ? "translateY(-1px)" : undefined,
    "&:hover": {
      borderColor: state.isFocused ? CONTROL_BORDER_COLOR_FOCUS : CONTROL_BORDER_COLOR_HOVER,
      backgroundColor: CONTROL_SURFACE_BG_HOVER,
      boxShadow: state.isFocused
        ? `${CONTROL_RING}, ${CONTROL_BOX_SHADOW_FOCUS}`
        : CONTROL_BOX_SHADOW_HOVER,
      transform: "translateY(-1px)",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    minHeight: `${CONTROL_HEIGHT_PX - 2}px`,
    paddingLeft: 10,
    paddingRight: 4,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "var(--ui-text-muted)",
    fontWeight: 500,
    fontSize: "14px",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--ui-text-primary)",
    fontWeight: 500,
    fontSize: "14px",
  }),
  input: (provided) => ({
    ...provided,
    color: "var(--ui-text-primary)",
    fontSize: "14px",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused ? "var(--ui-focus)" : "var(--ui-text-soft)",
    paddingLeft: 8,
    paddingRight: 8,
    transition: "all 180ms ease",
    "&:hover": {
      color: "#3b82f6",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: CONTROL_PANEL_BG,
    borderRadius: `${CONTROL_RADIUS_PX + 4}px`,
    border: `1px solid ${CONTROL_BORDER_COLOR}`,
    boxShadow: "var(--ui-shadow-md)",
    overflow: "hidden",
    zIndex: "var(--z-dropdown)",
    marginTop: 8,
    padding: 6,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: "var(--z-select-menu)",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--ui-option-selected-bg, rgba(59, 130, 246, 0.09))"
      : state.isFocused
        ? "var(--ui-option-hover-bg, rgba(59, 130, 246, 0.06))"
        : "transparent",
    color: state.isSelected ? "var(--ui-focus)" : "var(--ui-text-secondary)",
    cursor: "pointer",
    borderRadius: "14px",
    marginBottom: 2,
    padding: "10px 12px",
    fontWeight: state.isSelected ? 600 : 500,
    fontSize: "14px",
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    height: `${CONTROL_HEIGHT_PX - 2}px`,
  }),
};

interface FilterSelectProps {
  options: FilterSelectOption[];
  value: string | number | null | undefined;
  onChange: (value: string | number | undefined) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  isClearable?: boolean;
  isSearchable?: boolean;
  menuPortalTarget?: HTMLElement | null;
  menuPosition?: "absolute" | "fixed";
  noOptionsMessage?: () => string;
}

const renderOptionContent = (option: FilterSelectOption, context: "menu" | "value") => (
  <div className="flex min-w-0 items-center gap-2">
    {option.avatar ? (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ui-surface-2)] text-sm">
        {option.avatar}
      </span>
    ) : option.icon ? (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--ui-text-soft)]">
        {option.icon}
      </span>
    ) : null}
    <span className="min-w-0 truncate">{option.label}</span>
    {context === "menu" && option.description ? (
      <span className="ml-auto shrink-0 text-xs text-[var(--ui-text-soft)]">{option.description}</span>
    ) : null}
  </div>
);

export default function FilterSelect({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  wrapperClassName = "rounded-[14px]",
  isClearable = false,
  isSearchable = false,
  menuPortalTarget,
  menuPosition,
  noOptionsMessage = () => "暂无选项",
}: FilterSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value) || null;

  return (
    <div className={wrapperClassName}>
      <Select<FilterSelectOption, false, GroupBase<FilterSelectOption>>
        options={options}
        value={selectedOption}
        onChange={(newValue) => {
          onChange(newValue?.value);
        }}
        placeholder={placeholder}
        styles={selectStyles}
        className={`react-select-container select-surface ${className}`}
        classNamePrefix="react-select"
        isSearchable={isSearchable}
        isClearable={isClearable}
        blurInputOnSelect
        menuPortalTarget={menuPortalTarget}
        menuPosition={menuPosition}
        noOptionsMessage={noOptionsMessage}
        formatOptionLabel={(option, meta) => renderOptionContent(option, meta.context)}
        theme={(theme) => ({
          ...theme,
          colors: {
            ...theme.colors,
            primary: "#3b82f6",
            primary25: "rgba(59, 130, 246, 0.06)",
            primary50: "rgba(59, 130, 246, 0.1)",
          },
        })}
      />
    </div>
  );
}
