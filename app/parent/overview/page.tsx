"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ListChecks,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useOverviewData } from "./hooks/useOverviewData";
import TimeRangeFilter, { TimeRange } from "./components/TimeRangeFilter";
import ChildFilterSelect from "@/components/parent/ChildFilterSelect";
import PointsFlow from "./components/PointsFlow";
import HabitTracking from "./components/HabitTracking";
import ComparisonChart from "./components/ComparisonChart";

const pct = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
};

export default function OverviewPage() {
  const router = useRouter();
  const { childList } = useApp();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [customDates, setCustomDates] = useState<{ start: string; end: string } | undefined>();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data, loading, error, lastUpdated, refresh } = useOverviewData(childList, {
    timeRange,
    customDates,
    childId: selectedChildId,
  });

  const handleTimeRangeChange = (range: TimeRange, dates?: { start: string; end: string }) => {
    setTimeRange(range);
    if (dates) {
      setCustomDates(dates);
    } else if (range !== "custom") {
      setCustomDates(undefined);
    }
  };

  // 核心指标卡片
  const coreCards = data
    ? [
        {
          label: "家庭总任务",
          value: data.pulse.totalTasks,
          icon: ListChecks,
          color: "text-blue-600 bg-blue-100",
          href: "/parent/tasks",
        },
        {
          label: "待审核",
          value: data.pulse.submitted,
          icon: Clock,
          color: "text-amber-600 bg-amber-100",
          href: "/parent/audit",
        },
        {
          label: "待核销",
          value: data.pulse.pendingOrders,
          icon: Star,
          color: "text-indigo-600 bg-indigo-100",
          href: "/parent/orders?status=pending",
        },
        {
          label: "可用总积分",
          value: data.pulse.totalAvailablePoints,
          icon: Sparkles,
          color: "text-emerald-600 bg-emerald-100",
        },
      ]
    : [];

  // 计算派生指标
  const completionRate = data ? pct(data.pulse.approved, data.pulse.totalTasks) : 0;
  const onTimeRate = data ? pct(data.pulse.onTimeCount, data.pulse.approved) : 0;
  const approvalPressure = data ? data.pulse.submitted + data.pulse.pendingOrders : 0;
  const urgentLevel = approvalPressure >= 8 ? "高" : approvalPressure >= 3 ? "中" : "低";

  // 行动建议
  const actions = data
    ? [
        ...(data.pulse.submitted > 0
          ? [
              {
                text: `先处理 ${data.pulse.submitted} 条待审核任务，孩子反馈会更及时。`,
                href: "/parent/audit",
              },
            ]
          : []),
        ...(data.pulse.pendingOrders > 0
          ? [
              {
                text: `当前有 ${data.pulse.pendingOrders} 条待核销兑换，建议尽快完成核销。`,
                href: "/parent/orders?status=pending",
              },
            ]
          : []),
        ...(data.pulse.pending > data.pulse.approved
          ? [
              {
                text: "未完成任务多于已完成任务，可适当拆小任务或调整难度。",
                href: "/parent/tasks?status=uncompleted",
              },
            ]
          : []),
        ...(data.pulse.rejected > 0
          ? [
              {
                text: "存在被驳回任务，建议补充明确的完成标准，减少重复提交。",
                href: "/parent/tasks?status=rejected",
              },
            ]
          : []),
        ...(data.pulse.submitted === 0 &&
        data.pulse.pendingOrders === 0 &&
        data.pulse.pending <= data.pulse.approved &&
        data.pulse.rejected === 0
          ? [
              {
                text: "整体节奏稳定，建议给孩子增加一个挑战任务保持成长拉力。",
                href: "/parent/tasks",
              },
            ]
          : []),
      ]
    : [];

  // 空状态
  if (!loading && !data && !error) {
    return (
      <div className="card-parent text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ListChecks size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">暂无数据</h3>
        <p className="text-slate-500 mb-4">创建任务后即可查看概览数据</p>
        <button
          onClick={() => router.push("/parent/tasks")}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          创建任务
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选器和刷新 */}
      <div className="card-parent flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TimeRangeFilter
            value={timeRange}
            onChange={handleTimeRangeChange}
            customStartDate={customDates?.start}
            customEndDate={customDates?.end}
          />
          <ChildFilterSelect
            childList={childList.map((c) => ({
              id: c.id,
              username: c.username,
              avatar: c.avatar,
            }))}
            selectedChildId={selectedChildId}
            onChange={setSelectedChildId}
          />
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-slate-400">更新于 {lastUpdated.toLocaleTimeString()}</span>}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && <div className="p-4 bg-red-50/80 border border-red-100 rounded-2xl text-red-700 text-sm">{error}</div>}

      {/* 行动建议 */}
      <div className="card-parent">
        <h3 className="text-lg font-bold text-slate-800 mb-4">行动建议</h3>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        ) : actions.length > 0 ? (
          <div className="space-y-3">
            {actions.slice(0, 3).map((tip, index) => (
              <div
                key={index}
                className={`p-3 rounded-2xl border border-slate-100 bg-white/90 flex items-start gap-3 ${
                  tip.href ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""
                }`}
                onClick={() => tip.href && router.push(tip.href)}
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-700 leading-6">{tip.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">暂无建议</p>
        )}
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-10 w-10 bg-slate-200 rounded-xl mb-3"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-1"></div>
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))
          : coreCards.map((item) => (
              <div
                key={item.label}
                className={`card p-4 ${
                  item.href ? "cursor-pointer hover:scale-[1.01] transition-transform" : ""
                }`}
                onClick={() => item.href && router.push(item.href)}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color}`}
                >
                  <item.icon size={20} />
                </div>
                <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            ))}
      </div>

      {/* KPI指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? [1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
                <div className="h-10 bg-slate-200 rounded w-1/3 mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))
          : data && (
              <>
                <div className="card p-5">
                  <div className="flex items-center gap-2 text-slate-700 mb-3">
                    <Target size={18} className="text-blue-500" />
                    <span className="font-semibold">完成质量</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{completionRate}%</p>
                  <p className="text-xs text-slate-500 mt-1">
                    已完成 {data.pulse.approved} / 总任务 {data.pulse.totalTasks}
                  </p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-2 text-slate-700 mb-3">
                    <TrendingUp size={18} className="text-emerald-500" />
                    <span className="font-semibold">按时率</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{onTimeRate}%</p>
                  <p className="text-xs text-slate-500 mt-1">
                    按时 {data.pulse.onTimeCount}，逾期 {data.pulse.overdueCount}
                  </p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-2 text-slate-700 mb-3">
                    <AlertTriangle size={18} className="text-orange-500" />
                    <span className="font-semibold">处理压力</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{urgentLevel}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    待处理 {approvalPressure} 项（审核+核销）
                  </p>
                </div>
              </>
            )}
      </div>

      {/* 新增模块：积分流转 + 习惯养成 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PointsFlow data={data?.pointsFlow} loading={loading} />
        <HabitTracking habits={data?.habits} loading={loading} />
      </div>

      {/* 任务分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <>
            <div className="card p-5 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-slate-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="card p-5 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-slate-200 rounded"></div>
                ))}
              </div>
            </div>
          </>
        ) : (
          data && (
            <>
              {/* 任务状态分布 */}
              <div className="card">
                <h3 className="text-lg font-bold text-slate-800 mb-6">任务状态分布</h3>
                <div className="space-y-4">
                  {[
                    { label: "进行中", value: data.pulse.pending, color: "bg-blue-500", text: "text-blue-600" },
                    { label: "待审核", value: data.pulse.submitted, color: "bg-yellow-500", text: "text-yellow-600" },
                    { label: "已完成", value: data.pulse.approved, color: "bg-green-500", text: "text-green-600" },
                    { label: "已驳回", value: data.pulse.rejected, color: "bg-red-500", text: "text-red-600" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm text-slate-600 w-16">{item.label}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct(item.value, data.pulse.totalTasks)}%` }}
                        />
                      </div>
                      <span className={`font-bold w-12 text-right ${item.text}`}>{item.value}</span>
                      <span className="text-xs text-slate-400 w-10 text-right">
                        {pct(item.value, data.pulse.totalTasks)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 任务类型分布 */}
              <div className="card">
                <h3 className="text-lg font-bold text-slate-800 mb-6">任务类型分布</h3>
                <div className="space-y-4">
                  {[
                    { label: "日常任务", value: data.pulse.dailyCount, color: "bg-green-500", text: "text-green-600" },
                    { label: "进阶任务", value: data.pulse.advancedCount, color: "bg-purple-500", text: "text-purple-600" },
                    { label: "挑战任务", value: data.pulse.challengeCount, color: "bg-orange-500", text: "text-orange-600" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm text-slate-600 w-16">{item.label}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct(item.value, data.pulse.totalTasks)}%` }}
                        />
                      </div>
                      <span className={`font-bold w-12 text-right ${item.text}`}>{item.value}</span>
                      <span className="text-xs text-slate-400 w-10 text-right">
                        {pct(item.value, data.pulse.totalTasks)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        )}
      </div>

      {/* 趋势图表 */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800">完成趋势</h3>
          <span className="text-xs text-slate-500">按已完成任务计数</span>
        </div>
        {loading ? (
          <div className="h-40 bg-slate-200 rounded-xl animate-pulse"></div>
        ) : data && data.trend7d.length > 0 ? (
          <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2">
            {data.trend7d.map((d) => {
              const peak = Math.max(...data.trend7d.map((i) => i.approved), 1);
              const heightPct = Math.max(8, Math.round((d.approved / peak) * 100));
              const minWidth = data.trend7d.length > 14 ? "w-8" : data.trend7d.length > 7 ? "w-10" : "flex-1 min-w-[40px]";
              return (
                <div key={d.dateKey} className={`${minWidth} flex flex-col items-center gap-2 shrink-0`}>
                  <span className="text-xs text-slate-400">{d.approved}</span>
                  <div className="w-full bg-blue-100 rounded-xl overflow-hidden h-24 flex items-end">
                    <div
                      className="w-full bg-linear-to-t from-blue-500 to-indigo-400 rounded-xl transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{d.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">暂无趋势数据</p>
          </div>
        )}
      </div>

      {/* 对比分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComparisonChart data={data?.comparison} loading={loading} />
      </div>

      {/* 孩子表现面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-4">孩子表现面板</h3>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          ) : data && data.childPanels.length > 0 ? (
            <div className="space-y-3">
              {data.childPanels.map((child) => (
                <div
                  key={child.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => router.push(`/parent/tasks?childId=${child.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{child.avatar}</span>
                      <div>
                        <p className="font-semibold text-slate-800">{child.name}</p>
                        <p className="text-xs text-slate-500">已完成 {child.approvedCount} 项</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div
                      className="bg-orange-100 text-orange-700 rounded-xl px-2 py-1 text-center cursor-pointer hover:bg-orange-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parent/tasks?status=uncompleted&childId=${child.id}`);
                      }}
                    >
                      待完成 {child.pendingCount}
                    </div>
                    <div
                      className="bg-blue-100 text-blue-700 rounded-xl px-2 py-1 text-center cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parent/audit?childId=${child.id}`);
                      }}
                    >
                      待审核 {child.submittedCount}
                    </div>
                    <div
                      className="bg-indigo-100 text-indigo-700 rounded-xl px-2 py-1 text-center cursor-pointer hover:bg-indigo-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parent/orders?status=pending&childId=${child.id}`);
                      }}
                    >
                      待核销 {child.orderCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <p className="text-sm">暂无孩子数据</p>
            </div>
          )}
        </div>

        {/* 关键结果看板 */}
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-4">关键结果看板</h3>
          {loading ? (
            <div className="animate-pulse grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-50">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle size={16} />
                  <span className="text-xs font-medium">按时完成</span>
                </div>
                <p className="text-xl font-bold text-green-800">{data.pulse.onTimeCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <XCircle size={16} />
                  <span className="text-xs font-medium">逾期完成</span>
                </div>
                <p className="text-xl font-bold text-red-800">{data.pulse.overdueCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-50">
                <div className="flex items-center gap-2 text-yellow-700 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-medium">待审核</span>
                </div>
                <p className="text-xl font-bold text-yellow-800">{data.pulse.submitted}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Trophy size={16} />
                  <span className="text-xs font-medium">已完成</span>
                </div>
                <p className="text-xl font-bold text-blue-800">{data.pulse.approved}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
