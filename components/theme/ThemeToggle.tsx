'use client';

import { Moon, Sun } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ThemeMode } from '@/lib/theme';

type ThemeToggleVariant = 'pill' | 'menu' | 'tile';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  variant: ThemeToggleVariant;
  className?: string;
  style?: CSSProperties;
}

function getThemeLabel(theme: ThemeMode) {
  return theme === 'dark' ? '深色' : '浅色';
}

function getThemeSubtitle(theme: ThemeMode) {
  return `当前为${getThemeLabel(theme)}主题，点击切换`;
}

export default function ThemeToggle({ theme, onToggle, variant, className = '', style }: ThemeToggleProps) {
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;

  if (variant === 'menu') {
    return (
      <button
        type="button"
        className={`desktop-user-menu-item ${className}`.trim()}
        onClick={onToggle}
        style={style}
      >
        <div className="desktop-user-menu-icon desktop-user-menu-icon-purple">
          <Icon size={16} />
        </div>
        <div className="desktop-user-menu-copy">
          <div className="desktop-user-menu-title">主题切换</div>
          <div className="desktop-user-menu-subtitle">{getThemeSubtitle(theme)}</div>
        </div>
      </button>
    );
  }

  if (variant === 'tile') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${className}`.trim()}
        style={style}
      >
        <Icon size={20} className={isDark ? 'text-sky-400' : 'text-amber-600'} />
        <p className="mt-3 text-sm font-bold text-slate-800">主题</p>
        <p className="mt-1 text-[11px] text-slate-500">{getThemeLabel(theme)}</p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${className}`.trim()}
      style={style}
    >
      <Icon size={16} />
      {theme === 'dark' ? '浅色' : '深色'}
    </button>
  );
}
