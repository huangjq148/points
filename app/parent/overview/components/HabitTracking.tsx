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
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!habits || habits.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center min-h-[200px]">
        <div className="text-center text-gray-500">
          <Target size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">暂无习惯数据</p>
          <p className="text-xs text-gray-400 mt-1">坚持21天养成一个好习惯</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">习惯养成</h3>
        <span className="text-xs text-gray-500">{stats?.totalHabits}个习惯</span>
      </div>

      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
            <div className="flex items-center gap-2 text-orange-700 mb-1">
              <Flame size={16} />
              <span className="text-xs font-medium">最长连续</span>
            </div>
            <p className="text-2xl font-bold text-orange-800">{stats.bestStreak}</p>
            <p className="text-xs text-orange-600">天</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs font-medium">平均完成率</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{stats.avgCompletionRate}%</p>
            <p className="text-xs text-blue-600">{stats.avgStreak}天平均连续</p>
          </div>
        </div>
      )}

      {/* 习惯列表 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">习惯排行</h4>
        {sortedHabits.slice(0, 5).map((habit) => (
          <div
            key={habit.id}
            className="p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{habit.icon || "📝"}</span>
                <span className="font-medium text-gray-800">{habit.name}</span>
              </div>
              <div className="flex items-center gap-1 text-orange-600">
                <Flame size={14} />
                <span className="font-bold">{habit.streakDays}</span>
                <span className="text-xs">天</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
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
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full transition-all"
                style={{ width: `${Math.min(habit.completionRate, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 21天法则提示 */}
      <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
        <p className="text-xs text-purple-700">
          <span className="font-semibold">💡 21天法则：</span>
          连续坚持21天就能养成一个习惯，继续保持！
        </p>
      </div>
    </div>
  );
}
