"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Button, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import request from "@/utils/request";
import ConfirmModal from "@/components/ConfirmModal";
import AlertModal from "@/components/AlertModal";
import CreateJobModal, { JobFormData } from "./components/CreateJobModal";

interface ScheduledJob {
  _id: string;
  name: string;
  description: string;
  type: "recurring_task" | "daily_reset" | "cleanup" | "custom";
  status: "running" | "stopped" | "error";
  frequency: "minutely" | "hourly" | "daily" | "weekly" | "monthly" | "custom";
  cronExpression?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastError?: string;
  runCount: number;
  successCount: number;
  errorCount: number;
  config: {
    autoCreateEnabled: boolean;
    taskTemplateId?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  recurring_task: "周期任务",
  daily_reset: "每日重置",
  cleanup: "清理任务",
  custom: "自定义",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  recurring_task: "bg-blue-100 text-blue-700",
  daily_reset: "bg-green-100 text-green-700",
  cleanup: "bg-orange-100 text-orange-700",
  custom: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Play }> =
  {
    running: {
      label: "运行中",
      color: "bg-green-100 text-green-700",
      icon: Play,
    },
    stopped: {
      label: "已停止",
      color: "bg-gray-100 text-gray-700",
      icon: Square,
    },
    error: {
      label: "错误",
      color: "bg-red-100 text-red-700",
      icon: AlertCircle,
    },
  };

const FREQUENCY_LABELS: Record<string, string> = {
  minutely: "每分钟",
  hourly: "每小时",
  daily: "每天",
  weekly: "每周",
  monthly: "每月",
  custom: "自定义",
};

export default function ScheduledJobsPage() {
  const { currentUser, childList } = useApp();
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingJobId, setExecutingJobId] = useState<string | null>(null);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    jobId: string | null;
    action: "delete" | null;
  }>({
    isOpen: false,
    jobId: null,
    action: null,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cronServerRunning, setCronServerRunning] = useState(false);
  const [cronServerStatus, setCronServerStatus] = useState<"checking" | "running" | "stopped">("checking");

  // 检查 cron 服务状态
  const checkCronServerStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/cron/control');
      if (response.ok) {
        const data = await response.json();
        setCronServerRunning(data.running);
        setCronServerStatus(data.running ? "running" : "stopped");
      } else {
        setCronServerRunning(false);
        setCronServerStatus("stopped");
      }
    } catch {
      setCronServerRunning(false);
      setCronServerStatus("stopped");
    }
  }, []);

  // 启动/停止 cron 服务
  const toggleCronServer = async () => {
    try {
      const action = cronServerRunning ? "stop" : "start";
      const response = await fetch('/api/cron/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        setCronServerRunning(data.running);
        setCronServerStatus(data.running ? "running" : "stopped");
        showAlert(
          data.running ? "定时任务服务已启动" : "定时任务服务已停止",
          data.running ? "success" : "info"
        );
      } else {
        showAlert("操作失败", "error");
      }
    } catch (error) {
      showAlert("操作失败: " + (error as Error).message, "error");
    }
  };

  useEffect(() => {
    checkCronServerStatus();
    // 每 5 秒检查一次状态
    const interval = setInterval(checkCronServerStatus, 30000);
    return () => clearInterval(interval);
  }, [checkCronServerStatus]);

  const fetchJobs = useCallback(async () => {
    if (!currentUser?.token) return;

    try {
      const data = await request("/api/scheduled-jobs");
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("获取定时任务失败:", error);
      showAlert("获取定时任务失败", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const showAlert = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setAlertState({ isOpen: true, message, type });
  };

  const handleStartJob = async (jobId: string) => {
    setExecutingJobId(jobId);
    try {
      const data = await request("/api/scheduled-jobs", {
        method: "PUT",
        body: { jobId, action: "start" },
      });

      if (data.success) {
        showAlert("定时任务已启动", "success");
        fetchJobs();
      } else {
        showAlert(data.message || "启动失败", "error");
      }
    } catch {
      showAlert("启动失败", "error");
    } finally {
      setExecutingJobId(null);
    }
  };

  const handleStopJob = async (jobId: string) => {
    setExecutingJobId(jobId);
    try {
      const data = await request("/api/scheduled-jobs", {
        method: "PUT",
        body: { jobId, action: "stop" },
      });

      if (data.success) {
        showAlert("定时任务已停止", "success");
        fetchJobs();
      } else {
        showAlert(data.message || "停止失败", "error");
      }
    } catch {
      showAlert("停止失败", "error");
    } finally {
      setExecutingJobId(null);
    }
  };

  const handleRunJob = async (jobId: string) => {
    setExecutingJobId(jobId);
    try {
      const data = await request("/api/scheduled-jobs", {
        method: "PUT",
        body: { jobId, action: "run" },
      });

      if (data.success) {
        showAlert(
          `任务执行成功${
            data.createdCount ? `，创建了 ${data.createdCount} 个任务` : ""
          }`,
          "success"
        );
        fetchJobs();
      } else {
        showAlert(data.message || "执行失败", "error");
      }
    } catch {
      showAlert("执行失败", "error");
    } finally {
      setExecutingJobId(null);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    setConfirmState({ isOpen: true, jobId, action: "delete" });
  };

  const confirmDelete = async () => {
    if (!confirmState.jobId) return;

    try {
      const data = await request(
        `/api/scheduled-jobs?jobId=${confirmState.jobId}`,
        {
          method: "DELETE",
        }
      );

      if (data.success) {
        showAlert("定时任务已删除", "success");
        fetchJobs();
      } else {
        showAlert(data.message || "删除失败", "error");
      }
    } catch {
      showAlert("删除失败", "error");
    } finally {
      setConfirmState({ isOpen: false, jobId: null, action: null });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  const columns: DataTableColumn<ScheduledJob>[] = [
    {
      key: "name",
      title: "任务名称",
      render: (_, row) => {
        const job = row;
        return (
          <div>
            <p className="font-medium text-gray-800 text-sm">{job.name}</p>
            {job.description && (
              <p className="text-xs text-gray-500 truncate max-w-[280px]">
                {job.description}
              </p>
            )}
            {job.lastError && (
              <p className="text-xs text-red-500 mt-1">
                错误: {job.lastError}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "type",
      title: "类型",
      render: (_, row) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            JOB_TYPE_COLORS[row.type]
          }`}
        >
          {JOB_TYPE_LABELS[row.type]}
        </span>
      ),
    },
    {
      key: "status",
      title: "状态",
      render: (_, row) => {
        const statusInfo = STATUS_LABELS[row.status];
        const StatusIcon = statusInfo.icon;
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}
          >
            <StatusIcon size={12} />
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      key: "frequency",
      title: "频率",
      render: (_, row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Calendar size={14} />
          <span>{FREQUENCY_LABELS[row.frequency]}</span>
        </div>
      ),
    },
    {
      key: "runCount",
      title: "执行统计",
      render: (_, row) => {
        const job = row;
        return (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-gray-600">
              <RotateCw size={12} />
              {job.runCount}
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle size={12} />
              {job.successCount}
            </span>
            {job.errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle size={12} />
                {job.errorCount}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "lastRunAt",
      title: "上次运行",
      render: (_, row) => (
        <span className="text-xs text-gray-500">{formatDate(row.lastRunAt)}</span>
      ),
    },
    {
      key: "nextRunAt",
      title: "下次运行",
      render: (_, row) => (
        <span className="text-xs text-gray-500">{formatDate(row.nextRunAt)}</span>
      ),
    },
  ];

  const actionColumn: DataTableColumn<ScheduledJob> = {
    key: "actions",
    title: "操作",
    render: (_, row) => {
      const job = row;
      return (
        <div className="flex items-center justify-center gap-0.5">
          {job.status === "running" ? (
            <Button
              onClick={() => handleStopJob(job._id)}
              disabled={executingJobId === job._id}
              variant="secondary"
              className="p-1 h-6 w-6 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors border-none bg-transparent shadow-none"
              title="停止"
            >
              <Square size={12} />
            </Button>
          ) : (
            <Button
              onClick={() => handleStartJob(job._id)}
              disabled={executingJobId === job._id}
              variant="secondary"
              className="p-1 h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors border-none bg-transparent shadow-none"
              title="启动"
            >
              <Play size={12} />
            </Button>
          )}
          <Button
            onClick={() => handleRunJob(job._id)}
            disabled={executingJobId === job._id}
            variant="secondary"
            className="p-1 h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors border-none bg-transparent shadow-none"
            title="立即执行"
          >
            <RotateCw
              size={12}
              className={executingJobId === job._id ? "animate-spin" : ""}
            />
          </Button>
          <Button
            onClick={() => handleDeleteJob(job._id)}
            variant="secondary"
            className="p-1 h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors border-none bg-transparent shadow-none"
            title="删除"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      );
    },
  };

  const handleCreateJob = async (formData: JobFormData) => {
    try {
      const data = await request("/api/scheduled-jobs", {
        method: "POST",
        body: {
          name: formData.name,
          description: formData.description,
          type: "recurring_task",
          frequency: formData.frequency,
          config: {
            autoCreateEnabled: true,
            taskTemplateId: formData.selectedTemplateId,
            selectedChildren: formData.selectedChildren,
            recurrenceDay: formData.recurrenceDay,
            publishTime: formData.publishTime,
            expiryPolicy: formData.expiryPolicy,
          },
        },
      });

      if (data.success) {
        showAlert("自动任务创建成功", "success");
        setShowCreateModal(false);
        fetchJobs();
      } else {
        showAlert(data.message || "创建失败", "error");
      }
    } catch {
      showAlert("创建失败", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            定时任务管理
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            管理自动创建周期任务的定时器
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Cron 服务控制开关 */}
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-gray-200 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${cronServerRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">自动执行服务</span>
            <button
              onClick={toggleCronServer}
              disabled={cronServerStatus === "checking"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                cronServerRunning ? 'bg-blue-600' : 'bg-gray-200'
              } ${cronServerStatus === "checking" ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  cronServerRunning ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${cronServerRunning ? 'text-green-600' : 'text-gray-500'}`}>
              {cronServerStatus === "checking" ? "检查中..." : cronServerRunning ? "运行中" : "已停止"}
            </span>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 shadow-md shadow-blue-100 flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="font-semibold text-sm">新建自动任务</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{jobs.length}</p>
              <p className="text-xs text-gray-500">定时任务总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {jobs.filter((j) => j.status === "running").length}
              </p>
              <p className="text-xs text-gray-500">运行中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Square className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {jobs.filter((j) => j.status === "stopped").length}
              </p>
              <p className="text-xs text-gray-500">已停止</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {jobs.filter((j) => j.status === "error").length}
              </p>
              <p className="text-xs text-gray-500">错误</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">关于自动执行</p>
          <p className="text-blue-700">
            开启上方&quot;自动执行服务&quot;开关后，系统会每分钟自动检查并执行到期的定时任务。
            您也可以点击&quot;立即执行&quot;按钮手动触发单个任务。
          </p>
        </div>
      </div>

      {/* Jobs List */}
      <div>
        <DataTable
          columns={columns}
          dataSource={jobs}
          actionColumn={actionColumn}
          minWidth={1080}
          actionColumnWidth={96}
          emptyText="暂无定时任务"
        />
        {jobs.length === 0 && (
          <p className="text-sm text-gray-400 text-center -mt-2">
            点击右上角按钮创建新的定时任务
          </p>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() =>
          setConfirmState({ isOpen: false, jobId: null, action: null })
        }
        onConfirm={confirmDelete}
        title="确认删除定时任务"
        message="确定要删除这个定时任务吗？此操作无法撤销。"
        confirmText="删除"
        type="danger"
      />

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateJob}
        childList={childList}
      />
    </div>
  );
}
