"use client";

import { useState, useEffect, useCallback } from "react";
import request from "@/utils/request";
import { IDisplayedTask, IDisplayedOrder } from "@/app/typings";
import { TimeRange } from "../components/TimeRangeFilter";

export interface FamilyPulse {
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

export interface ChildPanel {
  id: string;
  name: string;
  avatar: string;
  pendingCount: number;
  submittedCount: number;
  orderCount: number;
  approvedCount: number;
}

export interface TrendDay {
  dateKey: string;
  label: string;
  approved: number;
}

export interface PointsFlowData {
  issuedThisWeek: number;
  issuedThisMonth: number;
  redeemedThisWeek: number;
  redeemedThisMonth: number;
  currentBalance: number;
  trend: { date: string; issued: number; redeemed: number }[];
  topTasksByPoints: { taskName: string; points: number; count: number }[];
}

export interface HabitData {
  id: string;
  name: string;
  streakDays: number;
  completionRate: number;
  totalCompletions: number;
  lastCompletedAt?: string;
  icon?: string;
}

export interface ChildComparisonData {
  childId: string;
  name: string;
  avatar?: string;
  approvedTasks: number;
  pointsEarned: number;
  onTimeRate: number;
}

export interface OverviewData {
  pulse: FamilyPulse;
  trend7d: TrendDay[];
  childPanels: ChildPanel[];
  pointsFlow?: PointsFlowData;
  habits?: HabitData[];
  comparison?: ChildComparisonData[];
}

interface UseOverviewDataOptions {
  timeRange: TimeRange;
  customDates?: { start: string; end: string };
  childId?: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isValidDate = (value?: string): boolean =>
  Boolean(value && !Number.isNaN(new Date(value).getTime()));

const getDateRange = (timeRange: TimeRange, customDates?: { start: string; end: string }) => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (timeRange) {
    case "today":
      // start is already today
      break;
    case "week":
      start.setDate(now.getDate() - 6);
      break;
    case "month":
      start.setDate(now.getDate() - 29);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
    case "custom":
      if (customDates) {
        start = new Date(customDates.start);
        end.setTime(new Date(customDates.end).getTime());
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { start, end };
};

export function useOverviewData(childList: Array<{ id: string; username: string; avatar?: string; availablePoints?: number; pendingCount?: number; submittedCount?: number; orderCount?: number }>, options: UseOverviewDataOptions) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange(options.timeRange, options.customDates);

      // 构建查询参数
      const params: Record<string, string> = {
        limit: "1000",
      };

      if (options.childId) {
        params.childId = options.childId;
      }

      const [taskRes, orderRes] = await Promise.all([
        request("/api/tasks", { params }),
        request("/api/orders", { params: { status: "pending", limit: "100" } }),
      ]);

      if (taskRes.success && taskRes.tasks) {
        const tasks: IDisplayedTask[] = taskRes.tasks;
        const pendingOrders =
          orderRes.success && orderRes.orders
            ? (orderRes.orders as IDisplayedOrder[]).length
            : 0;

        const rangeStart = start.getTime();
        const rangeEnd = end.getTime();

        // 生成趋势数据
        const daysDiff = Math.ceil((rangeEnd - rangeStart) / MS_PER_DAY) + 1;
        const trendMap = new Map<string, number>();
        const trendLabels: string[] = [];

        for (let i = 0; i < Math.min(daysDiff, 30); i++) {
          const d = new Date(rangeStart + i * MS_PER_DAY);
          const key = d.toISOString().slice(0, 10);
          trendMap.set(key, 0);
          trendLabels.push(key);
        }

        // 初始化统计数据
        const pulse: FamilyPulse = {
          totalTasks: tasks.length,
          pending: 0,
          submitted: 0,
          approved: 0,
          rejected: 0,
          dailyCount: 0,
          advancedCount: 0,
          challengeCount: 0,
          onTimeCount: 0,
          overdueCount: 0,
          pendingOrders,
          totalAvailablePoints: childList.reduce(
            (sum, child) => sum + (child.availablePoints || 0),
            0
          ),
        };

        // 初始化孩子面板数据
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

        // 处理任务数据
        const taskPointsMap = new Map<string, { points: number; count: number }>();

        tasks.forEach((task) => {
          // 状态统计
          if (task.status === "pending") pulse.pending += 1;
          else if (task.status === "submitted") pulse.submitted += 1;
          else if (task.status === "approved") pulse.approved += 1;
          else if (task.status === "rejected") pulse.rejected += 1;

          // 类型统计
          if (task.type === "daily") pulse.dailyCount += 1;
          else if (task.type === "advanced") pulse.advancedCount += 1;
          else if (task.type === "challenge") pulse.challengeCount += 1;

          // 趋势统计（在日期范围内的approved任务）
          if (task.status === "approved" && isValidDate(task.approvedAt)) {
            const approvedAt = new Date(task.approvedAt as string).getTime();
            if (approvedAt >= rangeStart && approvedAt <= rangeEnd) {
              const key = new Date(approvedAt).toISOString().slice(0, 10);
              if (trendMap.has(key)) {
                trendMap.set(key, (trendMap.get(key) || 0) + 1);
              }
            }
          }

          // 按时率统计
          if (
            task.status === "approved" &&
            isValidDate(task.deadline) &&
            isValidDate(task.approvedAt)
          ) {
            const deadline = new Date(task.deadline as string).getTime();
            const approvedAt = new Date(task.approvedAt as string).getTime();
            if (approvedAt <= deadline) pulse.onTimeCount += 1;
            else pulse.overdueCount += 1;
          }

          // 孩子统计
          if (task.status === "approved") {
            const childPanel = childMap.get(task.childId);
            if (childPanel) childPanel.approvedCount += 1;
          }

          // 积分TOP任务统计
          if (task.status === "approved") {
            const existing = taskPointsMap.get(task.name);
            if (existing) {
              existing.count += 1;
            } else {
              taskPointsMap.set(task.name, { points: task.points, count: 1 });
            }
          }
        });

        // 生成趋势数据
        const trend7d: TrendDay[] = trendLabels.map((dateKey) => {
          const d = new Date(`${dateKey}T00:00:00`);
          return {
            dateKey,
            label: `${d.getMonth() + 1}/${d.getDate()}`,
            approved: trendMap.get(dateKey) || 0,
          };
        });

        // 排序孩子面板
        const childPanels = Array.from(childMap.values()).sort((a, b) => {
          const aScore =
            a.approvedCount * 2 - a.pendingCount - a.submittedCount * 1.2 - a.orderCount * 0.8;
          const bScore =
            b.approvedCount * 2 - b.pendingCount - b.submittedCount * 1.2 - b.orderCount * 0.8;
          return bScore - aScore;
        });

        // 生成积分流转数据（模拟数据，实际应该从API获取）
        const pointsFlow: PointsFlowData = {
          issuedThisWeek: pulse.approved * 10, // 简化计算
          issuedThisMonth: pulse.approved * 10,
          redeemedThisWeek: pendingOrders * 50,
          redeemedThisMonth: pendingOrders * 50,
          currentBalance: pulse.totalAvailablePoints,
          trend: trend7d.map((d) => ({
            date: d.dateKey,
            issued: d.approved * 10,
            redeemed: Math.floor(Math.random() * 50),
          })),
          topTasksByPoints: Array.from(taskPointsMap.entries())
            .map(([name, data]) => ({
              taskName: name,
              points: data.points,
              count: data.count,
            }))
            .sort((a, b) => b.points * b.count - a.points * a.count)
            .slice(0, 3),
        };

        // 生成对比数据
        const comparison: ChildComparisonData[] = childPanels.map((child) => ({
          childId: child.id,
          name: child.name,
          avatar: child.avatar,
          approvedTasks: child.approvedCount,
          pointsEarned: child.approvedCount * 10,
          onTimeRate: pulse.approved > 0 ? Math.round((pulse.onTimeCount / pulse.approved) * 100) : 0,
        }));

        setData({
          pulse,
          trend7d,
          childPanels,
          pointsFlow,
          comparison,
        });
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Failed to fetch overview data:", e);
      setError("获取数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [childList, options.timeRange, options.customDates, options.childId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 自动刷新（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}
