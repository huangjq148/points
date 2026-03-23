"use client";

import Select, { GroupBase, StylesConfig } from "react-select";
import { useEffect, useState, useRef } from "react";

export type SelectOption = {
  value: string | number;
  label: string | number;
};

const customSelectStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(226, 232, 240, 1)",
    borderRadius: "18px",
    minHeight: "44px",
    padding: "1px 4px",
    boxShadow: "none",
    cursor: "pointer",
    transition: "all 160ms ease",
    "&:hover": {
      borderColor: "rgba(148, 163, 184, 1)",
      backgroundColor: "rgba(255, 255, 255, 1)",
    },
    "&:focus-within": {
      borderColor: "rgba(59, 130, 246, 1)",
      boxShadow: "0 0 0 4px rgba(96, 165, 250, 0.16)",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    paddingLeft: 8,
    paddingRight: 4,
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
    paddingLeft: 6,
    paddingRight: 8,
    transition: "all 160ms ease",
    "&:hover": {
      color: "#3b82f6",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: "20px",
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
