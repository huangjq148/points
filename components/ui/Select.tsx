import Select, { StylesConfig, SingleValue, ActionMeta } from "react-select";

type SelectOption = {
  value: string | number;
  label: string;
};

const customSelectStyles: StylesConfig = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(8px)",
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
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(16px)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: "0 10px 40px rgba(59, 130, 246, 0.15)",
    overflow: "hidden",
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
}: {
  options: SelectOption[];
  value: SingleValue<SelectOption>;
  onChange: (value: SingleValue<SelectOption>, actionMeta: ActionMeta<SelectOption>) => void;
  placeholder?: string;
  styles?: StylesConfig;
}) {
  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      styles={{ ...customSelectStyles, ...styles }}
    />
  );
}
