import React from "react";
import { Home, Gift, FileText, Star, Ticket, Users, UserCog, BarChart3 } from "lucide-react";
import {
  CONTROL_HEIGHT_PX,
  CONTROL_INNER_RADIUS_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
  CONTROL_PANEL_SUBTLE_CLASS,
  CONTROL_PRIMARY_GRADIENT_CLASS,
  CONTROL_PRIMARY_SHADOW_CLASS,
} from "./controlStyles";

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
                    ? `${CONTROL_PRIMARY_GRADIENT_CLASS} text-white ${CONTROL_PRIMARY_SHADOW_CLASS}`
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/70"
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
      className={`inline-flex items-center gap-1 p-0.5 ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_SUBTLE_CLASS} ${className}`}
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
              relative px-4 py-0 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${CONTROL_INNER_RADIUS_CLASS}
              ${
                isActive
                  ? `${CONTROL_PRIMARY_GRADIENT_CLASS} text-white ${CONTROL_PRIMARY_SHADOW_CLASS}`
                  : "text-slate-500 hover:-translate-y-px hover:bg-white hover:text-slate-900 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
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
