"use client";

import { IDisplayedOrder, IDisplayedTask } from "@/app/typings";
import { useApp } from "@/context/AppContext";
import request from "@/utils/request";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  ListChecks,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface FamilyPulse {
  totalTasks: number;
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
  dailyCount: number;
  advancedCount: number;
  challengeCount: number;
  onTimeCount: number;
  overdueCount: number;
  pendingOrders: number;
  totalAvailablePoints: number;
}

interface ChildPanel {
  id: string;
  name: string;
  avatar: string;
  pendingCount: number;
  submittedCount: number;
  orderCount: number;
  approvedCount: number;
}

interface TrendDay {
  dateKey: string;
  label: string;
  approved: number;
}

interface ActionTip {
  text: string;
  href?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isValidDate = (value?: string): boolean => Boolean(value && !Number.isNaN(new Date(value).getTime()));

const pct = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
};

const DEFAULT_PULSE: FamilyPulse = {
  totalTasks: 0,
  pending: 0,
  submitted: 0,
  approved: 0,
  rejected: 0,
  dailyCount: 0,
  advancedCount: 0,
  challengeCount: 0,
  onTimeCount: 0,
  overdueCount: 0,
  pendingOrders: 0,
  totalAvailablePoints: 0,
};

export default function OverviewPage() {
  const router = useRouter();
  const { childList } = useApp();
  const [pulse, setPulse] = useState<FamilyPulse>(DEFAULT_PULSE);
  const [trend7d, setTrend7d] = useState<TrendDay[]>([]);
  const [childPanels, setChildPanels] = useState<ChildPanel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [taskRes, orderRes] = await Promise.all([
          request("/api/tasks", { params: { limit: 1000 } }),
          request("/api/orders", { params: { status: "pending", limit: 100 } }),
        ]);

        if (taskRes.success && taskRes.tasks) {
          const tasks: IDisplayedTask[] = taskRes.tasks;
          const pendingOrders =
            orderRes.success && orderRes.orders ? (orderRes.orders as IDisplayedOrder[]).length : 0;

          const now = Date.now();
          const dayStart = new Date();
          dayStart.setHours(0, 0, 0, 0);
          const rangeStart = dayStart.getTime() - 6 * MS_PER_DAY;

          const trendMap = new Map<string, number>();
          for (let i = 0; i < 7; i++) {
            const d = new Date(rangeStart + i * MS_PER_DAY);
            trendMap.set(d.toISOString().slice(0, 10), 0);
          }

          const stats: FamilyPulse = {
            ...DEFAULT_PULSE,
            totalTasks: tasks.length,
            pendingOrders,
            totalAvailablePoints: childList.reduce((sum, child) => sum + (child.availablePoints || 0), 0),
          };

          const childMap = new Map<string, ChildPanel>();
          childList.forEach((child) => {
            childMap.set(child.id, {
              id: child.id,
              name: child.username,
              avatar: child.avatar || "👶",
              pendingCount: child.pendingCount || 0,
              submittedCount: child.submittedCount || 0,
              orderCount: child.orderCount || 0,
              approvedCount: 0,
            });
          });

          tasks.forEach((task) => {
            if (task.status === "pending") stats.pending += 1;
            else if (task.status === "submitted") stats.submitted += 1;
            else if (task.status === "approved") stats.approved += 1;
            else if (task.status === "rejected") stats.rejected += 1;

            if (task.type === "daily") stats.dailyCount += 1;
            else if (task.type === "advanced") stats.advancedCount += 1;
            else if (task.type === "challenge") stats.challengeCount += 1;

            if (task.status === "approved" && isValidDate(task.approvedAt)) {
              const approvedAt = new Date(task.approvedAt as string).getTime();
              const key = new Date(approvedAt).toISOString().slice(0, 10);
              if (approvedAt >= rangeStart && approvedAt <= now && trendMap.has(key)) {
                trendMap.set(key, (trendMap.get(key) || 0) + 1);
              }
            }

            if (task.status === "approved" && isValidDate(task.deadline) && isValidDate(task.approvedAt)) {
              const deadline = new Date(task.deadline as string).getTime();
              const approvedAt = new Date(task.approvedAt as string).getTime();
              if (approvedAt <= deadline) stats.onTimeCount += 1;
              else stats.overdueCount += 1;
            }

            if (task.status === "approved") {
              const childPanel = childMap.get(task.childId);
              if (childPanel) childPanel.approvedCount += 1;
            }
          });

          const trendData: TrendDay[] = Array.from(trendMap.entries()).map(([dateKey, approved]) => {
            const d = new Date(`${dateKey}T00:00:00`);
            return {
              dateKey,
              label: `${d.getMonth() + 1}/${d.getDate()}`,
              approved,
            };
          });

          const panelData = Array.from(childMap.values()).sort((a, b) => {
            const aScore = a.approvedCount * 2 - a.pendingCount - a.submittedCount * 1.2 - a.orderCount * 0.8;
            const bScore = b.approvedCount * 2 - b.pendingCount - b.submittedCount * 1.2 - b.orderCount * 0.8;
            return bScore - aScore;
          });

          setPulse(stats);
          setTrend7d(trendData);
          setChildPanels(panelData);
        }
      } catch (e) {
        console.error("Failed to fetch overview data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [childList]);

  const coreCards = [
    {
      label: "家庭总任务",
      value: pulse.totalTasks,
      icon: ListChecks,
      color: "text-blue-600 bg-blue-100",
      href: "/parent/tasks",
    },
    {
      label: "待审核",
      value: pulse.submitted,
      icon: Clock,
      color: "text-amber-600 bg-amber-100",
      href: "/parent/audit",
    },
    {
      label: "待核销",
      value: pulse.pendingOrders,
      icon: Star,
      color: "text-indigo-600 bg-indigo-100",
      href: "/parent/orders?status=pending",
    },
    { label: "可用总积分", value: pulse.totalAvailablePoints, icon: Sparkles, color: "text-emerald-600 bg-emerald-100" },
  ];

  const completionRate = pct(pulse.approved, pulse.totalTasks);
  const onTimeRate = pct(pulse.onTimeCount, pulse.approved);
  const approvalPressure = pulse.submitted + pulse.pendingOrders;
  const urgentLevel = approvalPressure >= 8 ? "高" : approvalPressure >= 3 ? "中" : "低";

  const actions = useMemo(() => {
    const tips: ActionTip[] = [];
    if (pulse.submitted > 0) {
      tips.push({
        text: `先处理 ${pulse.submitted} 条待审核任务，孩子反馈会更及时。`,
        href: "/parent/audit",
      });
    }
    if (pulse.pendingOrders > 0) {
      tips.push({
        text: `当前有 ${pulse.pendingOrders} 条待核销兑换，建议尽快完成核销。`,
        href: "/parent/orders?status=pending",
      });
    }
    if (pulse.pending > pulse.approved) {
      tips.push({
        text: "未完成任务多于已完成任务，可适当拆小任务或调整难度。",
        href: "/parent/tasks?status=uncompleted",
      });
    }
    if (pulse.rejected > 0) {
      tips.push({
        text: "存在被驳回任务，建议补充明确的完成标准，减少重复提交。",
        href: "/parent/tasks?status=rejected",
      });
    }
    if (tips.length === 0) tips.push({ text: "整体节奏稳定，建议给孩子增加一个挑战任务保持成长拉力。", href: "/parent/tasks" });
    return tips;
  }, [pulse]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            家庭运营总览
          </h2>
          <p className="text-gray-500 text-sm mt-1">看清优先级、节奏和孩子进展，先处理最关键的事</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 mb-4">本周行动建议</h3>
        <div className="space-y-3">
          {actions.map((tip, index) => (
            <div
              key={`${tip.text}-${index}`}
              className={`p-3 rounded-xl border border-gray-100 bg-white flex items-start gap-3 ${tip.href ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}`}
              onClick={() => tip.href && router.push(tip.href)}
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center mt-0.5">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700 leading-6">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {coreCards.map((item) => (
          <div
            key={item.label}
            className={`card p-4 ${item.href ? "cursor-pointer hover:scale-[1.01] transition-transform" : ""}`}
            onClick={() => item.href && router.push(item.href)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
              <item.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{loading ? "--" : item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-700 mb-3">
            <Target size={18} className="text-blue-500" />
            <span className="font-semibold">完成质量</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{completionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">已完成 {pulse.approved} / 总任务 {pulse.totalTasks}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-700 mb-3">
            <TrendingUp size={18} className="text-emerald-500" />
            <span className="font-semibold">按时率</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{onTimeRate}%</p>
          <p className="text-xs text-gray-500 mt-1">按时 {pulse.onTimeCount}，逾期 {pulse.overdueCount}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-700 mb-3">
            <AlertTriangle size={18} className="text-orange-500" />
            <span className="font-semibold">处理压力</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{urgentLevel}</p>
          <p className="text-xs text-gray-500 mt-1">待处理 {approvalPressure} 项（审核+核销）</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-6">任务状态分布</h3>
          <div className="space-y-4">
            {[
              { label: "进行中", value: pulse.pending, color: "bg-blue-500", text: "text-blue-600" },
              { label: "待审核", value: pulse.submitted, color: "bg-yellow-500", text: "text-yellow-600" },
              { label: "已完成", value: pulse.approved, color: "bg-green-500", text: "text-green-600" },
              { label: "已驳回", value: pulse.rejected, color: "bg-red-500", text: "text-red-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-600 w-16">{item.label}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${pct(item.value, pulse.totalTasks)}%` }}
                  />
                </div>
                <span className={`font-bold w-12 text-right ${item.text}`}>{item.value}</span>
                <span className="text-xs text-gray-400 w-10 text-right">{pct(item.value, pulse.totalTasks)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-6">任务类型分布</h3>
          <div className="space-y-4">
            {[
              { label: "日常任务", value: pulse.dailyCount, color: "bg-green-500", text: "text-green-600" },
              { label: "进阶任务", value: pulse.advancedCount, color: "bg-purple-500", text: "text-purple-600" },
              { label: "挑战任务", value: pulse.challengeCount, color: "bg-orange-500", text: "text-orange-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-600 w-16">{item.label}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${pct(item.value, pulse.totalTasks)}%` }}
                  />
                </div>
                <span className={`font-bold w-12 text-right ${item.text}`}>{item.value}</span>
                <span className="text-xs text-gray-400 w-10 text-right">{pct(item.value, pulse.totalTasks)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800">近 7 天完成趋势</h3>
          <span className="text-xs text-gray-500">按已完成任务计数</span>
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-40">
          {trend7d.map((d) => {
            const peak = Math.max(...trend7d.map((i) => i.approved), 1);
            const heightPct = Math.max(8, Math.round((d.approved / peak) * 100));
            return (
              <div key={d.dateKey} className="flex flex-col items-center gap-2">
                <span className="text-xs text-gray-400">{d.approved}</span>
                <div className="w-full bg-blue-100 rounded-lg overflow-hidden h-24 flex items-end">
                  <div
                    className="w-full bg-linear-to-t from-blue-500 to-indigo-400 rounded-lg"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">孩子表现面板</h3>
          <div className="space-y-3">
            {childPanels.map((child) => (
              <div
                key={child.id}
                className="p-3 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => router.push(`/parent/tasks?childId=${child.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{child.avatar}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{child.name}</p>
                      <p className="text-xs text-gray-500">已完成 {child.approvedCount} 项</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div
                    className="bg-orange-100 text-orange-700 rounded-lg px-2 py-1 text-center cursor-pointer hover:bg-orange-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/parent/tasks?status=uncompleted&childId=${child.id}`);
                    }}
                  >
                    待完成 {child.pendingCount}
                  </div>
                  <div
                    className="bg-blue-100 text-blue-700 rounded-lg px-2 py-1 text-center cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/parent/audit?childId=${child.id}`);
                    }}
                  >
                    待审核 {child.submittedCount}
                  </div>
                  <div
                    className="bg-indigo-100 text-indigo-700 rounded-lg px-2 py-1 text-center cursor-pointer hover:bg-indigo-200 transition-colors"
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
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">关键结果看板</h3>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="p-3 rounded-xl bg-green-50">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <CheckCircle size={16} />
                <span className="text-xs font-medium">按时完成</span>
              </div>
              <p className="text-xl font-bold text-green-800">{pulse.onTimeCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <XCircle size={16} />
                <span className="text-xs font-medium">逾期完成</span>
              </div>
              <p className="text-xl font-bold text-red-800">{pulse.overdueCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50">
              <div className="flex items-center gap-2 text-yellow-700 mb-1">
                <Clock size={16} />
                <span className="text-xs font-medium">待审核</span>
              </div>
              <p className="text-xl font-bold text-yellow-800">{pulse.submitted}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Trophy size={16} />
                <span className="text-xs font-medium">已完成</span>
              </div>
              <p className="text-xl font-bold text-blue-800">{pulse.approved}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
