import React from "react";
import { Home, Gift, FileText, Star, Ticket, Users, UserCog, BarChart3 } from "lucide-react";
import { CONTROL_HEIGHT_PX, CONTROL_PANEL_RADIUS_CLASS } from "./controlStyles";

const iconMap: Record<string, React.ElementType> = {
  home: Home,
  overview: BarChart3,
  audit: FileText,
  tasks: Star,
  orders: Ticket,
  rewards: Gift,
  family: Users,
  users: UserCog,
};

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
  const isMobileNav = className.includes("fixed") || className.includes("bg-transparent");

  if (isMobileNav) {
    return (
      <div className={`flex justify-between items-center gap-1 ${className}`}>
        {items.map((tab) => {
          const isActive = activeKey === tab.key;
          const IconComponent = iconMap[tab.key] || Home;
          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`
                flex-1 flex flex-col items-center justify-center py-3 px-1 text-xs font-bold rounded-2xl whitespace-nowrap transition-all duration-200 min-h-[64px]
                ${
                  isActive
                    ? "text-blue-600 bg-gradient-to-b from-blue-50 to-blue-100 shadow-inner"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }
              `}
            >
              <IconComponent
                size={22}
                className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 ${CONTROL_PANEL_RADIUS_CLASS} border border-slate-200/90 bg-white/88 p-0.5 shadow-[0_10px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-sm ${className}`}
      style={{ height: CONTROL_HEIGHT_PX, minHeight: CONTROL_HEIGHT_PX }}
    >
      {items.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            style={{ height: CONTROL_HEIGHT_PX - 4 }}
            className={`
              relative rounded-[12px] px-4 py-0 text-sm font-semibold whitespace-nowrap transition-all duration-200
              ${
                isActive
                  ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
                  : "text-slate-500 hover:-translate-y-px hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_20px_rgba(15,23,42,0.10)]"
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
