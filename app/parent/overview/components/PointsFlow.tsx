"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, Gift, Coins } from "lucide-react";

interface PointsFlowData {
  issuedThisWeek: number;
  issuedThisMonth: number;
  redeemedThisWeek: number;
  redeemedThisMonth: number;
  currentBalance: number;
  trend: { date: string; issued: number; redeemed: number }[];
  topTasksByPoints: { taskName: string; points: number; count: number }[];
}

interface PointsFlowProps {
  data?: PointsFlowData;
  loading?: boolean;
}

export default function PointsFlow({ data, loading }: PointsFlowProps) {
  const netFlow = useMemo(() => {
    if (!data) return 0;
    return data.issuedThisWeek - data.redeemedThisWeek;
  }, [data]);

  const isPositive = netFlow >= 0;

  if (loading) {
    return (
      <div className="card" data-overview-section="points-flow">
        <div className="animate-pulse">
          <div className="overview-skeleton-surface h-6 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                data-overview-skeleton="points-flow-metric"
                className="overview-skeleton-surface h-20 rounded-xl"
              ></div>
            ))}
          </div>
          <div className="overview-skeleton-surface h-32 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" data-overview-section="points-flow">
        <h3 className="text-lg font-bold text-slate-800 mb-4">积分流转</h3>
        <div className="text-center py-8 text-slate-500">
          <Coins size={48} className="mx-auto mb-3 text-slate-300" />
          <p>暂无积分数据</p>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: "本周发放",
      value: data.issuedThisWeek,
      icon: TrendingUp,
      tone: "success",
      surfaceName: "points-metric-issued",
    },
    {
      label: "本周消耗",
      value: data.redeemedThisWeek,
      icon: TrendingDown,
      tone: "danger",
      surfaceName: "points-metric-redeemed",
    },
    {
      label: "净流量",
      value: Math.abs(netFlow),
      icon: isPositive ? TrendingUp : TrendingDown,
      tone: isPositive ? "info" : "orange",
      surfaceName: "points-metric-net-flow",
      prefix: isPositive ? "+" : "-",
    },
    {
      label: "当前余额",
      value: data.currentBalance,
      icon: Wallet,
      tone: "accent",
      surfaceName: "points-metric-balance",
    },
  ];

  return (
    <div className="card" data-overview-section="points-flow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">积分流转</h3>
        <span className="text-xs text-slate-500">本周统计</span>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {metrics.map((item) => (
          <div
            key={item.label}
            data-overview-surface={item.surfaceName}
            className="overview-soft-surface p-3 rounded-xl"
          >
            <div
              className={`overview-icon-badge overview-icon-badge--${item.tone} w-8 h-8 rounded-xl flex items-center justify-center mb-2`}
            >
              <item.icon size={16} />
            </div>
            <p className="text-xl font-bold text-slate-800">
              {item.prefix || ""}{item.value}
            </p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      {/* 趋势图表 */}
      {data.trend.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">近7天趋势</h4>
          <div className="h-32 flex items-end gap-1 overflow-x-auto pb-2">
            {data.trend.map((day, index) => {
              const maxVal = Math.max(
                ...data.trend.map((d) => Math.max(d.issued, d.redeemed)),
                1
              );
              const issuedHeight = Math.max(10, (day.issued / maxVal) * 100);
              const redeemedHeight = Math.max(10, (day.redeemed / maxVal) * 100);
              const minWidth = data.trend.length > 14 ? "w-8" : data.trend.length > 7 ? "w-10" : "flex-1 min-w-[36px]";

              return (
                <div key={index} className={`${minWidth} shrink-0 flex flex-col items-center gap-1`}>
                  <div className="w-full flex gap-0.5 items-end h-24">
                    <div
                      className="flex-1 bg-emerald-400 rounded-t min-w-[8px]"
                      style={{ height: `${issuedHeight}%` }}
                      title={`发放: ${day.issued}`}
                    />
                    <div
                      className="flex-1 bg-rose-400 rounded-t min-w-[8px]"
                      style={{ height: `${redeemedHeight}%` }}
                      title={`消耗: ${day.redeemed}`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-400 rounded"></div>
              <span className="text-xs text-slate-500">发放</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-rose-400 rounded"></div>
              <span className="text-xs text-slate-500">消耗</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP任务 */}
      {data.topTasksByPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">积分价值TOP任务</h4>
          <div className="space-y-2">
            {data.topTasksByPoints.slice(0, 3).map((task, index) => (
              <div
                key={index}
                data-overview-surface="points-top-task"
                className="overview-soft-surface flex items-center justify-between p-2 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <Gift size={14} className="text-yellow-500" />
                  <span className="text-sm text-slate-700 truncate max-w-[150px]">
                    {task.taskName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="overview-accent-text overview-accent-text--success text-sm font-semibold">
                    +{task.points * task.count}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">
                    ({task.count}次)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
