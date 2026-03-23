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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(226, 232, 240, 1)",
    borderRadius: "14px",
    minHeight: "40px",
    padding: "2px 4px",
    boxShadow: "none",
    "&:hover": {
      borderColor: "rgba(148, 163, 184, 1)",
    },
    "&:focus-within": {
      borderColor: "rgba(15, 23, 42, 1)",
      boxShadow: "0 0 0 3px rgba(148, 163, 184, 0.18)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid rgba(226, 232, 240, 1)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
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
      ? "rgba(15, 23, 42, 0.06)"
      : state.isFocused
        ? "rgba(15, 23, 42, 0.04)"
        : "transparent",
    color: state.isSelected ? "#0f172a" : "#334155",
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
