import React from "react";
import { Home, Gift, FileText, Star, Ticket, Trophy, Users, UserCog, BarChart3 } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  home: Home,
  overview: BarChart3,
  audit: FileText,
  tasks: Star,
  orders: Ticket,
  rewards: Gift,
  achievements: Trophy,
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
