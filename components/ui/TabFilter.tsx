"use client";

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
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [indicatorStyle, setIndicatorStyle] = React.useState<{ width: number; x: number } | null>(null);
  const isMobileNav = className.includes("fixed") || className.includes("bg-transparent");

  React.useLayoutEffect(() => {
    if (isMobileNav) return;

    const updateIndicator = () => {
      const activeIndex = items.findIndex((tab) => tab.key === activeKey);
      const container = containerRef.current;
      const activeButton = buttonRefs.current[activeIndex];

      if (!container || !activeButton) {
        setIndicatorStyle(null);
        return;
      }

      setIndicatorStyle({
        width: activeButton.offsetWidth,
        x: activeButton.offsetLeft,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(() => {
      updateIndicator();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    buttonRefs.current.forEach((button) => {
      if (button) {
        resizeObserver.observe(button);
      }
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeKey, isMobileNav, items]);

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
      ref={containerRef}
      className={`relative inline-flex items-center gap-1.5 p-1 ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_SUBTLE_CLASS} ${className}`}
      style={{ height: CONTROL_HEIGHT_PX, minHeight: CONTROL_HEIGHT_PX }}
    >
      {indicatorStyle && (
        <div
          aria-hidden
          className={`${CONTROL_PRIMARY_GRADIENT_CLASS} ${CONTROL_PRIMARY_SHADOW_CLASS} absolute inset-y-1 left-0 ${CONTROL_INNER_RADIUS_CLASS} transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
          style={{
            width: indicatorStyle.width,
            transform: `translateX(${indicatorStyle.x}px)`,
          }}
        />
      )}
      {items.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            ref={(node) => {
              const index = items.findIndex((item) => item.key === tab.key);
              buttonRefs.current[index] = node;
            }}
            onClick={() => onFilterChange(tab.key)}
            style={{ height: CONTROL_HEIGHT_PX - 8 }}
            className={`
              relative z-10 inline-flex items-center justify-center px-4 py-0 align-middle text-sm font-semibold leading-none whitespace-nowrap transition-[color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${CONTROL_INNER_RADIUS_CLASS}
              ${
                isActive
                  ? "text-white"
                  : "text-slate-500 hover:-translate-y-px hover:bg-white hover:text-slate-900 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
              }
            `}
          >
            <span className="block leading-none translate-y-[-0.5px]">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TabFilter;
