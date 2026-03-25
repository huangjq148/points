"use client";

import Select, { GroupBase, StylesConfig } from "react-select";
import { useEffect, useState, useRef } from "react";
import {
  CONTROL_BOX_SHADOW,
  CONTROL_BOX_SHADOW_FOCUS,
  CONTROL_BOX_SHADOW_HOVER,
  CONTROL_HEIGHT_PX,
  CONTROL_RADIUS_PX,
  CONTROL_RING,
} from "./controlStyles";

export type SelectOption = {
  value: string | number;
  label: string | number;
};

const customSelectStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "rgba(255, 255, 255, 0.98)" : "rgba(255, 255, 255, 0.88)",
    borderColor: state.isFocused ? "rgba(59, 130, 246, 1)" : "rgba(226, 232, 240, 0.9)",
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
      borderColor: state.isFocused ? "rgba(59, 130, 246, 1)" : "rgba(148, 163, 184, 0.9)",
      backgroundColor: "rgba(255, 255, 255, 0.98)",
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
    color: "var(--color-slate-700)",
    fontWeight: 500,
    fontSize: "14px",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--color-slate-700)",
    fontWeight: 500,
    fontSize: "14px",
  }),
  input: (provided) => ({
    ...provided,
    color: "#0f172a",
    fontSize: "14px",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused ? "#3b82f6" : "#94a3b8",
    paddingLeft: 8,
    paddingRight: 8,
    transition: "all 180ms ease",
    "&:hover": {
      color: "#3b82f6",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: `${CONTROL_RADIUS_PX + 4}px`,
    border: "1px solid rgba(226, 232, 240, 1)",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.1)",
    overflow: "hidden",
    zIndex: 100,
    marginTop: 8,
    padding: 6,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 120,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "rgba(59, 130, 246, 0.09)"
      : state.isFocused
        ? "rgba(59, 130, 246, 0.06)"
        : "transparent",
    color: state.isSelected ? "#2563eb" : "var(--color-slate-700)",
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

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  styles,
  menuPortalTarget,
}: {
  options: SelectOption[];
  value: string | number | null | undefined;
  onChange: (value: string | number | undefined) => void;
  placeholder?: string;
  styles?: StylesConfig<SelectOption, false, GroupBase<SelectOption>>;
  menuPortalTarget?: HTMLElement | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldUsePortal, setShouldUsePortal] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      // 自动识别是否在 Modal 内部
      const isInModal = !!containerRef.current.closest(".modal-content");
      setShouldUsePortal(isInModal);
    }
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  return (
    <div ref={containerRef}>
      <Select<SelectOption, false, GroupBase<SelectOption>>
        options={options}
        value={selectedOption}
        onChange={(newValue) => {
          onChange(newValue?.value);
        }}
        placeholder={placeholder}
        styles={{ ...customSelectStyles, ...styles }}
        instanceId="custom-select"
        className="react-select-container select-surface"
        classNamePrefix="react-select"
        isSearchable={false}
        blurInputOnSelect
        menuPortalTarget={
          shouldUsePortal
            ? typeof document !== "undefined"
              ? menuPortalTarget !== undefined
                ? menuPortalTarget
                : document.body
              : null
            : null
        }
        menuPosition={shouldUsePortal ? "fixed" : "absolute"}
        noOptionsMessage={() => "暂无选项"}
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
