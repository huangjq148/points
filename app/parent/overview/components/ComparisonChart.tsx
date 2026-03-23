"use client";

import { useMemo } from "react";
import { BarChart3, Target, Clock, Star } from "lucide-react";

interface ChildComparisonData {
  childId: string;
  name: string;
  avatar?: string;
  approvedTasks: number;
  pointsEarned: number;
  onTimeRate: number;
}

interface ComparisonChartProps {
  data?: ChildComparisonData[];
  loading?: boolean;
}

export default function ComparisonChart({ data, loading }: ComparisonChartProps) {
  const metrics = useMemo(
    () => [
      { key: "approvedTasks" as const, label: "完成任务", icon: Target, color: "bg-blue-500" },
      { key: "pointsEarned" as const, label: "获得积分", icon: Star, color: "bg-yellow-500" },
      { key: "onTimeRate" as const, label: "按时率", icon: Clock, color: "bg-green-500" },
    ],
    []
  );

  const normalizedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 归一化数据用于雷达图展示
    const maxValues = {
      approvedTasks: Math.max(...data.map((d) => d.approvedTasks), 1),
      pointsEarned: Math.max(...data.map((d) => d.pointsEarned), 1),
      onTimeRate: 100,
    };

    return data.map((child) => ({
      ...child,
      normalized: {
        approvedTasks: (child.approvedTasks / maxValues.approvedTasks) * 100,
        pointsEarned: (child.pointsEarned / maxValues.pointsEarned) * 100,
        onTimeRate: child.onTimeRate,
      },
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold text-slate-800 mb-4">孩子表现对比</h3>
        <div className="text-center py-8 text-slate-500">
          <BarChart3 size={40} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">暂无对比数据</p>
        </div>
      </div>
    );
  }

  // 只有一个孩子时不显示对比
  if (data.length === 1) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold text-slate-800 mb-4">孩子表现对比</h3>
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">添加更多孩子后可以查看对比分析</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-500" />
          孩子表现对比
        </h3>
        <span className="text-xs text-slate-500">{data.length}个孩子</span>
      </div>

      {/* 指标对比条形图 */}
      <div className="space-y-5">
        {metrics.map((metric) => {
          const maxValue = Math.max(...data.map((d) => d[metric.key]), 1);

          return (
            <div key={metric.key}>
              <div className="flex items-center gap-2 mb-2">
                <metric.icon size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  {metric.label}
                </span>
              </div>
              <div className="space-y-2">
                {normalizedData.map((child) => {
                  const value = child[metric.key];
                  const percentage = (value / maxValue) * 100;

                  return (
                    <div key={child.childId} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-20 shrink-0">
                        <span className="text-sm">{child.avatar || "👶"}</span>
                        <span className="text-xs text-slate-600 truncate">
                          {child.name}
                        </span>
                      </div>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${metric.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {metric.key === "onTimeRate"
                              ? `${value}%`
                              : value}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 排名卡片 */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">综合排名</h4>
        <div className="space-y-2">
          {[...normalizedData]
            .sort(
              (a, b) =>
                b.normalized.approvedTasks +
                b.normalized.pointsEarned +
                b.normalized.onTimeRate -
                (a.normalized.approvedTasks +
                  a.normalized.pointsEarned +
                  a.normalized.onTimeRate)
            )
            .slice(0, 3)
            .map((child, index) => (
              <div
                key={child.childId}
                className="flex items-center gap-3 p-2 rounded-xl bg-slate-50"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : index === 1
                      ? "bg-slate-100 text-slate-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-lg">{child.avatar || "👶"}</span>
                <span className="flex-1 font-medium text-slate-800">
                  {child.name}
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700">
                    {child.approvedTasks}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">任务</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
