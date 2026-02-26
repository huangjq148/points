"use client";

import { useEffect, useState } from "react";
import request from "@/utils/request";
import { TrendingUp, Clock, CheckCircle, XCircle, Star, Target, Gift, Users } from "lucide-react";

interface TaskStats {
  total: number;
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
  dailyCount: number;
  advancedCount: number;
  challengeCount: number;
  onTimeCount: number;
  overdueCount: number;
}

export default function OverviewPage() {
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    dailyCount: 0,
    advancedCount: 0,
    challengeCount: 0,
    onTimeCount: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTaskStats = async () => {
      try {
        const data = await request("/api/tasks", { params: { limit: 1000 } });
        if (data.success && data.tasks) {
          const tasks = data.tasks;
          const stats: TaskStats = {
            total: tasks.length,
            pending: tasks.filter((t: { status: string }) => t.status === "pending").length,
            submitted: tasks.filter((t: { status: string }) => t.status === "submitted").length,
            approved: tasks.filter((t: { status: string }) => t.status === "approved").length,
            rejected: tasks.filter((t: { status: string }) => t.status === "rejected").length,
            dailyCount: tasks.filter((t: { type: string }) => t.type === "daily").length,
            advancedCount: tasks.filter((t: { type: string }) => t.type === "advanced").length,
            challengeCount: tasks.filter((t: { type: string }) => t.type === "challenge").length,
            onTimeCount: 0,
            overdueCount: 0,
          };
          
          tasks.forEach((task: { status: string; deadline?: string; approvedAt?: string }) => {
            if (task.status === "approved" && task.deadline && task.approvedAt) {
              const deadline = new Date(task.deadline).getTime();
              const approvedAt = new Date(task.approvedAt).getTime();
              if (approvedAt <= deadline) {
                stats.onTimeCount++;
              } else {
                stats.overdueCount++;
              }
            }
          });
          
          setTaskStats(stats);
        }
      } catch (e) {
        console.error("Failed to fetch task stats:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTaskStats();
  }, []);

  const statCards = [
    { label: "任务总数", value: taskStats.total, icon: Star, color: "blue", bg: "bg-blue-50" },
    { label: "进行中", value: taskStats.pending, icon: Target, color: "cyan", bg: "bg-cyan-50" },
    { label: "待审核", value: taskStats.submitted, icon: Clock, color: "yellow", bg: "bg-yellow-50" },
    { label: "已完成", value: taskStats.approved, icon: CheckCircle, color: "green", bg: "bg-green-50" },
    { label: "已驳回", value: taskStats.rejected, icon: XCircle, color: "red", bg: "bg-red-50" },
    { label: "按时完成", value: taskStats.onTimeCount, icon: TrendingUp, color: "emerald", bg: "bg-emerald-50" },
  ];

  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-100",
    cyan: "text-cyan-600 bg-cyan-100",
    yellow: "text-yellow-600 bg-yellow-100",
    green: "text-green-600 bg-green-100",
    red: "text-red-600 bg-red-100",
    emerald: "text-emerald-600 bg-emerald-100",
    purple: "text-purple-600 bg-purple-100",
    orange: "text-orange-600 bg-orange-100",
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              数据概览
            </h2>
            <p className="text-gray-500 text-sm mt-1">查看任务统计数据和分析</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat, index) => (
            <div key={index} className="card p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[stat.color]} ${stat.bg}`}>
                <stat.icon size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Task Status Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-6">任务状态分布</h3>
            <div className="space-y-4">
              {[
                { label: "进行中", value: taskStats.pending, color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
                { label: "待审核", value: taskStats.submitted, color: "bg-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50" },
                { label: "已完成", value: taskStats.approved, color: "bg-green-500", text: "text-green-600", bg: "bg-green-50" },
                { label: "已驳回", value: taskStats.rejected, color: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600 w-16">{item.label}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: taskStats.total > 0 ? `${(item.value / taskStats.total) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className={`font-bold w-12 text-right ${item.text}`}>{item.value}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {taskStats.total > 0 ? Math.round((item.value / taskStats.total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-6">任务类型分布</h3>
            <div className="space-y-4">
              {[
                { label: "日常任务", value: taskStats.dailyCount, color: "bg-green-500", text: "text-green-600", bg: "bg-green-50" },
                { label: "进阶任务", value: taskStats.advancedCount, color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
                { label: "挑战任务", value: taskStats.challengeCount, color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600 w-16">{item.label}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: taskStats.total > 0 ? `${(item.value / taskStats.total) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className={`font-bold w-12 text-right ${item.text}`}>{item.value}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {taskStats.total > 0 ? Math.round((item.value / taskStats.total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Completion Stats */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-6">完成情况分析</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <span className="text-sm text-green-600">按时完成</span>
              </div>
              <p className="text-3xl font-bold text-green-700">{taskStats.onTimeCount}</p>
              <p className="text-xs text-green-500 mt-1">
                {taskStats.approved > 0 ? Math.round((taskStats.onTimeCount / taskStats.approved) * 100) : 0}% 完成率
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-red-600" />
                </div>
                <span className="text-sm text-red-600">逾期完成</span>
              </div>
              <p className="text-3xl font-bold text-red-700">{taskStats.overdueCount}</p>
              <p className="text-xs text-red-500 mt-1">
                {taskStats.approved > 0 ? Math.round((taskStats.overdueCount / taskStats.approved) * 100) : 0}% 完成率
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Target size={20} className="text-blue-600" />
                </div>
                <span className="text-sm text-blue-600">进行中</span>
              </div>
              <p className="text-3xl font-bold text-blue-700">{taskStats.pending}</p>
              <p className="text-xs text-blue-500 mt-1">
                {taskStats.total > 0 ? Math.round((taskStats.pending / taskStats.total) * 100) : 0}% 任务占比
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-yellow-600" />
                </div>
                <span className="text-sm text-yellow-600">待审核</span>
              </div>
              <p className="text-3xl font-bold text-yellow-700">{taskStats.submitted}</p>
              <p className="text-xs text-yellow-500 mt-1">
                {taskStats.total > 0 ? Math.round((taskStats.submitted / taskStats.total) * 100) : 0}% 任务占比
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
