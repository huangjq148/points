"use client";

import { useMemo } from "react";
import { Flame, Target, Calendar, TrendingUp } from "lucide-react";

interface HabitData {
  id: string;
  name: string;
  streakDays: number;
  completionRate: number;
  totalCompletions: number;
  lastCompletedAt?: string;
  icon?: string;
}

interface HabitTrackingProps {
  habits?: HabitData[];
  loading?: boolean;
}

export default function HabitTracking({ habits, loading }: HabitTrackingProps) {
  const stats = useMemo(() => {
    if (!habits || habits.length === 0) return null;
    
    const totalHabits = habits.length;
    const avgStreak = Math.round(
      habits.reduce((sum, h) => sum + h.streakDays, 0) / totalHabits
    );
    const avgCompletionRate = Math.round(
      habits.reduce((sum, h) => sum + h.completionRate, 0) / totalHabits
    );
    const bestStreak = Math.max(...habits.map((h) => h.streakDays));
    
    return { totalHabits, avgStreak, avgCompletionRate, bestStreak };
  }, [habits]);

  const sortedHabits = useMemo(() => {
    if (!habits) return [];
    return [...habits].sort((a, b) => b.streakDays - a.streakDays);
  }, [habits]);

  if (loading) {
    return (
      <div className="card" data-overview-section="habit-tracking">
        <div className="animate-pulse">
          <div className="overview-skeleton-surface h-6 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                data-overview-skeleton="habit-tracking-stat"
                className="overview-skeleton-surface h-16 rounded-xl"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!habits || habits.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center min-h-[200px]" data-overview-section="habit-tracking">
        <div className="text-center text-slate-500">
          <Target size={40} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">暂无习惯数据</p>
          <p className="text-xs text-slate-400 mt-1">坚持21天养成一个好习惯</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" data-overview-section="habit-tracking">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">习惯养成</h3>
        <span className="text-xs text-slate-500">{stats?.totalHabits}个习惯</span>
      </div>

      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div
            data-overview-surface="habit-stat-best-streak"
            className="overview-status-card overview-status-card--warning p-3 rounded-xl"
          >
            <div className="overview-status-card__label flex items-center gap-2 mb-1">
              <Flame size={16} />
              <span className="text-xs font-medium">最长连续</span>
            </div>
            <p className="overview-status-card__value text-2xl font-bold">{stats.bestStreak}</p>
            <p className="overview-accent-text overview-accent-text--warning text-xs">天</p>
          </div>
          <div
            data-overview-surface="habit-stat-completion-rate"
            className="overview-status-card overview-status-card--info p-3 rounded-xl"
          >
            <div className="overview-status-card__label flex items-center gap-2 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs font-medium">平均完成率</span>
            </div>
            <p className="overview-status-card__value text-2xl font-bold">{stats.avgCompletionRate}%</p>
            <p className="overview-accent-text overview-accent-text--info text-xs">{stats.avgStreak}天平均连续</p>
          </div>
        </div>
      )}

      {/* 习惯列表 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">习惯排行</h4>
        {sortedHabits.slice(0, 5).map((habit) => (
          <div
            key={habit.id}
            data-overview-surface="habit-row"
            className="overview-soft-surface p-3 rounded-xl transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{habit.icon || "📝"}</span>
                <span className="font-medium text-slate-800">{habit.name}</span>
              </div>
              <div className="flex items-center gap-1 text-orange-600">
                <Flame size={14} />
                <span className="font-bold">{habit.streakDays}</span>
                <span className="text-xs">天</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Target size={12} />
                <span>完成率 {habit.completionRate}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>共完成 {habit.totalCompletions} 次</span>
              </div>
            </div>
            {/* 进度条 */}
            <div className="overview-track mt-2 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full transition-all"
                style={{ width: `${Math.min(habit.completionRate, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 21天法则提示 */}
      <div className="overview-note overview-note--accent mt-4 p-3 rounded-xl">
        <p className="text-xs">
          <span className="font-semibold">💡 21天法则：</span>
          连续坚持21天就能养成一个习惯，继续保持！
        </p>
      </div>
    </div>
  );
}
