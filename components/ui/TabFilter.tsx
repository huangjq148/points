import React from "react";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
}

interface TabFilterProps<T extends string = string> {
  items: readonly TabItem<T>[] | TabItem<T>[];
  activeKey: T;
  onFilterChange: (key: T) => void;
  className?: string;
}

export const TabFilter = <T extends string>({
  items,
  activeKey,
  onFilterChange,
  className = "",
}: TabFilterProps<T>) => {
  return (
    <div className={`flex p-1 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl w-fit shadow-sm ${className}`}>
      {items.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`
              relative px-6 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-300
              ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-500 hover:text-blue-600 hover:bg-blue-50/50"
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default TabFilter;
