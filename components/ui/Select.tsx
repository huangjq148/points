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
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: "16px",
    padding: "4px",
    boxShadow: "none",
    "&:hover": {
      borderColor: "rgba(59, 130, 246, 0.5)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    overflow: "hidden",
    zIndex: 100,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 100,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "rgba(59, 130, 246, 0.1)"
      : state.isFocused
        ? "rgba(59, 130, 246, 0.05)"
        : "transparent",
    color: state.isSelected ? "#2563eb" : "#1e3a5f",
    cursor: "pointer",
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
        className="react-select-container"
        classNamePrefix="react-select"
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
      />
    </div>
  );
}
