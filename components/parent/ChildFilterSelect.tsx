"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import FilterSelect, { FilterSelectOption } from "@/components/ui/FilterSelect";

export interface ChildFilterOption {
  id: string;
  username: string;
  avatar?: string;
}

interface ChildFilterSelectProps {
  childList: ChildFilterOption[];
  selectedChildId: string | null;
  onChange: (childId: string | null) => void;
  allLabel?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export default function ChildFilterSelect({
  childList,
  selectedChildId,
  onChange,
  allLabel = "全部孩子",
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
}: ChildFilterSelectProps) {
  const options: FilterSelectOption[] = useMemo(
    () => [
      { value: "all", label: allLabel, icon: <Users size={14} /> },
      ...childList.map((child) => ({
        value: child.id,
        label: child.username,
        avatar: child.avatar || "👶",
      })),
    ],
    [allLabel, childList],
  );

  return (
    <div className={className}>
      <FilterSelect
        options={options}
        value={selectedChildId ?? "all"}
        onChange={(value) => onChange(value === "all" ? null : String(value))}
        wrapperClassName={`rounded-[18px] ${dropdownClassName}`.trim()}
        className={buttonClassName}
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuPosition={typeof document !== "undefined" ? "fixed" : "absolute"}
      />
    </div>
  );
}
