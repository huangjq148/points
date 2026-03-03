"use client";

import { Button, Modal, Pagination, TabFilter } from "@/components/ui";
import Select from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import { Edit2, Plus, LayoutGrid, Table2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import TaskCard, { IDisplayedTask } from "./components/TaskCard";
import TaskTable from "./components/TaskTable";
import TemplateManager from "./components/TemplateManager";
import EditTemplateModal from "./components/EditTemplateModal";
import TaskModal, { TaskFormData } from "./components/TaskModal";

const getDayStart = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getDayEnd = (date: Date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getDatesInRange = (start: Date, end: Date) => {
  const dates: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const final = new Date(end);
  final.setHours(0, 0, 0, 0);
  while (cursor <= final) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const getWeekDateRange = (reference: Date) => {
  const normalized = new Date(reference);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(normalized);
  monday.setDate(normalized.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(0, 0, 0, 0);
  return { start: monday, end: sunday };
};

const createEmptyTaskFormData = (): TaskFormData => ({
  name: "",
  description: "",
  points: 5,
  icon: "⭐",
  type: "daily",
  requirePhoto: false,
  selectedChildren: [],
  imageUrl: "",
  startDate: null,
  deadline: null,
  scheduleMode: "single",
  rangeStart: null,
  rangeEnd: null,
  weekReference: null,
  saveAsTemplate: false,
});

export interface TaskTemplate {
  _id?: string;
  name: string;
  points: number;
  icon: string;
  type: string;
  description: string;
}

export interface PlainTask {
  _id: string;
  userId: string;
  childId: string;
  name: string;
  description: string;
  points: number;
  type: "daily" | "advanced" | "challenge";
  icon: string;
  requirePhoto: boolean;
  status: "pending" | "submitted" | "approved" | "rejected";
  photoUrl?: string;
  imageUrl?: string;
  submittedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  startDate?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

import request from "@/utils/request";
import { useToast } from "@/components/ui/Toast";
// import { formatDate } from "@/utils/date";
// import Layout from '@/app/layout';

// 1. 提取配置：方便维护和扩展，避免在 JSX 中写死
const TAB_ITEMS = [
  { key: "all", label: "全部" },
  { key: "uncompleted", label: "未完成" },
  { key: "not-started", label: "未开始" },
  { key: "submitted", label: "待审核" },
  { key: "completed", label: "已完成" },
  { key: "rejected", label: "已驳回" },
] as const;

type TaskFilterKey = typeof TAB_ITEMS[number]["key"];

function TasksPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialChildTaskFilter = searchParams.get("childId") || "all";
  const statusFromQuery = searchParams.get("status");
  const initialTaskFilter: TaskFilterKey =
    statusFromQuery === "completed" || statusFromQuery === "approved"
      ? "completed"
      : statusFromQuery === "uncompleted" || statusFromQuery === "pending"
        ? "uncompleted"
        : statusFromQuery === "submitted"
          ? "submitted"
          : statusFromQuery === "rejected"
            ? "rejected"
            : "all";

  const [selectedChildTaskFilter, setSelectedChildTaskFilter] = useState<string>(initialChildTaskFilter);
  const { currentUser, childList } = useApp();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"add" | "edit">("add");
  const [tasks, setTasks] = useState<IDisplayedTask[]>([]);
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilterKey>(initialTaskFilter);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null);
  const [taskPhotoPreview, setTaskPhotoPreview] = useState<string>("");
  const [editingTask, setEditingTask] = useState<PlainTask | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [taskData, setTaskData] = useState<TaskFormData>(() => createEmptyTaskFormData());

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });
  const [now, setNow] = useState<number>(0);

  // 任务模板状态管理
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  
  // 视图切换状态: 'card' | 'table'
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const childSelectOptions = useMemo(
    () => [
      { value: "all", label: "全部孩子" },
      ...childList.map((child) => ({ value: child.id, label: child.username })),
    ],
    [childList],
  );
  const selectedChildName = useMemo(
    () => childList.find((c) => c.id === selectedChildTaskFilter)?.username || "未知",
    [childList, selectedChildTaskFilter],
  );



  // 初始化模板数据
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!currentUser?.token) return;
      try {
        const data = await request("/api/task-templates");
        if (data.success) {
          if (data.data.length === 0) {
            // 如果数据库为空，创建默认模板并保存
            const defaultTemplates = [
              { name: "按时起床", points: 5, icon: "⏰", type: "daily", description: "早起不赖床，养成好习惯" },
              {
                name: "认真完成作业",
                points: 10,
                icon: "📚",
                type: "daily",
                description: "独立且认真地完成当天的所有作业",
              },
              { name: "整理房间", points: 8, icon: "🧹", type: "daily", description: "收拾自己的玩具和书桌，保持整洁" },
              { name: "练习乐器", points: 15, icon: "🎹", type: "daily", description: "坚持练习乐器 30 分钟" },
              { name: "阅读 20 分钟", points: 5, icon: "📖", type: "daily", description: "每天坚持阅读，拓宽知识面" },
            ];

            for (const t of defaultTemplates) {
              await request("/api/task-templates", {
                method: "POST",
                body: t,
              });
            }
            // 重新获取
            const refreshedData = await request("/api/task-templates");
            if (refreshedData.success) setTemplates(refreshedData.data);
          } else {
            setTemplates(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };
    void fetchTemplates();
  }, [currentUser?.token]);

  const handleApplyTemplate = (template: TaskTemplate) => {
    setTaskData((prev) => ({
      ...prev,
      name: template.name,
      description: template.description || "",
      points: template.points,
      icon: template.icon,
      type: template.type as "daily" | "advanced" | "challenge",
      scheduleMode: "single",
      rangeStart: null,
      rangeEnd: null,
      weekReference: null,
    }));
    setShowTemplateManager(false);
    setTaskModalMode("add");
    setShowTaskModal(true);
    toast.success(`已应用模板: ${template.name}`)
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!currentUser?.token) return;
    try {
      const res = await request(`/api/task-templates/${id}`, {
        method: "DELETE",
      });
      if (res.success) {
        setTemplates(templates.filter((t) => t._id !== id));
        showAlert("模板已删除", "success");
      } else {
        showAlert(res.message || "删除失败", "error");
      }
    } catch {
      showAlert("删除失败", "error");
    }
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setShowEditTemplateModal(true);
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name) return showAlert("请输入模板名称", "error");
    if (!currentUser?.token) return;

    try {
      const method = editingTemplate._id ? "PUT" : "POST";
      const url = editingTemplate._id ? `/api/task-templates/${editingTemplate._id}` : "/api/task-templates";

      const res = await request(url, {
        method,
        body: editingTemplate,
      });

      if (res.success) {
        if (editingTemplate._id) {
          setTemplates(templates.map((t) => (t._id === editingTemplate._id ? res.data : t)));
        } else {
          setTemplates([res.data, ...templates]);
        }
        setShowEditTemplateModal(false);
        setEditingTemplate(null);
        showAlert(editingTemplate._id ? "模板已更新" : "模板已创建", "success");
      } else {
        showAlert(res.message || "保存失败", "error");
      }
    } catch {
      showAlert("保存失败", "error");
    }
  };

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const timer = setInterval(updateNow, 60000); // 每分钟更新一次
    return () => clearInterval(timer);
  }, []);

  const showAlert = (message: string, type: "success" | "error" | "info" = "info") => {
    setAlertState({ isOpen: true, message, type });
  };

  const handleTaskPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTaskPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTaskPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTask = async () => {
    if (!currentUser?.id) {
      showAlert("请先登录", "error");
      return;
    }
    if (taskData.selectedChildren.length === 0) {
      showAlert("请选择至少一个孩子", "error");
      return;
    }
    if (!taskData.name.trim()) {
      showAlert("请输入任务名称", "error");
      return;
    }

    const scheduleMode = taskData.scheduleMode;
    if (scheduleMode === "single") {
      if (!taskData.deadline) {
        showAlert("请设置截止时间", "error");
        return;
      }
      if (!taskData.startDate) {
        showAlert("请设置起始时间", "error");
        return;
      }
      if (taskData.startDate > taskData.deadline) {
        showAlert("起始时间不能晚于截止时间", "error");
        return;
      }
    } else if (scheduleMode === "range") {
      if (!taskData.rangeStart || !taskData.rangeEnd) {
        showAlert("请设置起始/结束日期", "error");
        return;
      }
      if (taskData.rangeStart > taskData.rangeEnd) {
        showAlert("结束日期不能早于起始日期", "error");
        return;
      }
    } else if (scheduleMode === "week") {
      if (!taskData.weekReference) {
        showAlert("请选择一个参考日期", "error");
        return;
      }
    }

    const scheduleEntries = (() => {
      if (scheduleMode === "single") {
        return [
          {
            start: taskData.startDate!,
            deadline: taskData.deadline!,
          },
        ];
      }

      if (scheduleMode === "range") {
        const dates = getDatesInRange(taskData.rangeStart!, taskData.rangeEnd!);
        return dates.map((date) => ({
          start: getDayStart(date),
          deadline: getDayEnd(date),
        }));
      }

      if (scheduleMode === "week") {
        const { start, end } = getWeekDateRange(taskData.weekReference!);
        const dates = getDatesInRange(start, end);
        return dates.map((date) => ({
          start: getDayStart(date),
          deadline: getDayEnd(date),
        }));
      }

      return [];
    })();

    if (scheduleEntries.length === 0) {
      showAlert("请选择有效的排期", "error");
      return;
    }

    let uploadedImageUrl = "";
    if (taskPhotoFile) {
      const formData = new FormData();
      formData.append("file", taskPhotoFile);
      try {
        const uploadData = await request("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadData.success) {
          uploadedImageUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    for (const childId of taskData.selectedChildren) {
      for (const schedule of scheduleEntries) {
        const res = await request("/api/tasks", {
          method: "POST",
          body: {
            ...taskData,
            childId,
            startDate: schedule.start,
            deadline: schedule.deadline,
            imageUrl: uploadedImageUrl,
          },
        });

        if (!res.success) {
          showAlert("添加失败", "error");
          return;
        }
      }
    }

    // 如果勾选了保存为模板
    if (taskData.saveAsTemplate) {
      try {
        await request("/api/task-templates", {
          method: "POST",
          body: {
            name: taskData.name,
            description: taskData.description,
            points: taskData.points,
            icon: taskData.icon,
            type: taskData.type,
          },
        });
        // 刷新模板列表
        const data = await request("/api/task-templates");
        if (data.success) setTemplates(data.data);
      } catch (error) {
        console.error("Failed to save template:", error);
      }
    }

    setShowTaskModal(false);
    setTaskData(createEmptyTaskFormData());
    setTaskPhotoFile(null);
    setTaskPhotoPreview("");
    const updatedTasks = await fetchTasks();
    setTasks(updatedTasks);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    if (!taskData.deadline) {
      showAlert("请设置截止时间", "error");
      return;
    }
    if (!taskData.startDate) {
      showAlert("请设置起始时间", "error");
      return;
    }
    if (taskData.startDate > taskData.deadline) {
      showAlert("起始时间不能晚于截止时间", "error");
      return;
    }

    let uploadedImageUrl = taskData.imageUrl;
    if (taskPhotoFile) {
      const formData = new FormData();
      formData.append("file", taskPhotoFile);
      try {
        const uploadData = await request("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadData.success) {
          uploadedImageUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    try {
      const data = await request("/api/tasks", {
        method: "PUT",
        body: {
          taskId: editingTask._id,
          ...taskData,
          imageUrl: uploadedImageUrl,
        },
      });

      if (data.success) {
        showAlert("任务更新成功", "success");
        setShowTaskModal(false);
        setEditingTask(null);
        const updatedTasks = await fetchTasks();
        setTasks(updatedTasks);
      } else {
        showAlert(data.message || "更新失败", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("更新失败", "error");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || !currentUser?.token) return;
    try {
      const data = await request(`/api/tasks?taskId=${taskToDelete}`, {
        method: "DELETE",
      });
      if (data.success) {
        showAlert("任务删除成功", "success");
        setTaskToDelete(null);
        const updatedTasks = await fetchTasks();
        setTasks(updatedTasks);
      } else {
        showAlert(data.message, "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("删除失败", "error");
    }
  };

  const toggleChild = (childId: string) => {
    setTaskData((prev) => ({
      ...prev,
      selectedChildren: prev.selectedChildren.includes(childId)
        ? prev.selectedChildren.filter((id) => id !== childId)
        : [...prev.selectedChildren, childId],
    }));
  };
  const handleEditTask = (task: PlainTask) => {
    setEditingTask(task);
    setTaskData({
      name: task.name,
      description: task.description || "",
      points: task.points,
      icon: task.icon,
      type: task.type,
      requirePhoto: task.requirePhoto,
      selectedChildren: [],
      imageUrl: task.imageUrl || "",
      startDate: task.startDate ? new Date(task.startDate) : null,
      deadline: task.deadline ? new Date(task.deadline) : null,
      scheduleMode: "single",
      rangeStart: null,
      rangeEnd: null,
      weekReference: null,
      saveAsTemplate: false,
    });
    setTaskPhotoFile(null);
    setTaskPhotoPreview(task.imageUrl || "");
    setTaskModalMode("edit");
    setShowTaskModal(true);
  };

  const fetchTasks = useCallback(
    async (pageNum: number = 1) => {
      const currentSelectedChildTaskFilter = selectedChildTaskFilter;

      let statusFilter = "";
      let inProgress = false;
      let futureTasks = false;
      if (activeTaskFilter === "completed") {
        statusFilter = "approved";
      } else if (activeTaskFilter === "uncompleted") {
        inProgress = true;
      } else if (activeTaskFilter === "submitted") {
        statusFilter = "submitted";
      } else if (activeTaskFilter === "rejected") {
        statusFilter = "rejected";
      } else if (activeTaskFilter === "not-started") {
        // 未开始的任务：开始时间在当前时间之后的任务
        futureTasks = true;
      }

      const params: Record<string, string | number> = {
        page: pageNum,
        limit,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (inProgress) {
        params.inProgress = "true";
      }
      if (futureTasks) {
        params.futureTasks = "true";
      }
      if (currentSelectedChildTaskFilter !== "all") {
        params.childId = currentSelectedChildTaskFilter;
      }

      const data = (await request("/api/tasks", {
        params,
      })) as { success: boolean; tasks: IDisplayedTask[]; total: number };

      if (data.success) {
        setTotal(data.total);
        return data.tasks;
      }
      return [];
    },
    [activeTaskFilter, selectedChildTaskFilter],
  );

  useEffect(() => {
    fetchTasks(page).then(setTasks);
  }, [fetchTasks, page]);

  // Handle filter changes
  const onFilterChange = (type: "status" | "child", value: string) => {
    if (type === "status") {
      setActiveTaskFilter(value as TaskFilterKey);
    } else {
      setSelectedChildTaskFilter(value);
    }
    setPage(1);
  };

  return (
    <>
      {/* 页面头部 - 优化样式 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {selectedChildTaskFilter === "all"
              ? "任务管理"
              : selectedChildName}
          </h2>
          <p className="text-gray-500 text-sm mt-1">设置并监督孩子的每日任务</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* 孩子选择器 - 优化样式 */}
          <div className="w-36 lg:w-40">
            <Select
              value={selectedChildTaskFilter}
              onChange={(value) => onFilterChange("child", (value as string) || "all")}
              options={childSelectOptions}
            />
          </div>
          {/* 模板管理按钮 - 优化样式 */}
          <Button
            onClick={() => setShowTemplateManager(true)}
            className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 px-4 py-2 shadow-sm hover:shadow-md flex items-center gap-2 group h-10 transition-all"
            variant="secondary"
          >
            <Edit2 size={16} className="group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-semibold text-sm hidden sm:inline">模板管理</span>
            <span className="font-semibold text-sm sm:hidden">模板</span>
          </Button>
          {/* 添加任务按钮 - 优化样式 */}
          <Button
            onClick={() => {
              const defaultStartDate = new Date();
              defaultStartDate.setHours(0, 0, 0, 0);
              const defaultDeadline = new Date();
              defaultDeadline.setHours(23, 59, 59, 999);
              const resetData = createEmptyTaskFormData();
              resetData.startDate = defaultStartDate;
              resetData.deadline = defaultDeadline;
              setTaskData(resetData);
              setTaskPhotoFile(null);
              setTaskPhotoPreview("");
              setTaskModalMode("add");
              setShowTaskModal(true);
            }}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 shadow-lg shadow-blue-200 flex items-center gap-2 group transition-all hover:scale-[1.02] active:scale-[0.98] h-10"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-semibold text-sm hidden sm:inline">添加任务</span>
            <span className="font-semibold text-sm sm:hidden">添加</span>
          </Button>
        </div>
      </div>

      {/* Tabs 和视图切换 - 优化样式 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <TabFilter
          items={TAB_ITEMS}
          activeKey={activeTaskFilter}
          onFilterChange={(key) => onFilterChange("status", key)}
        />
        {/* 视图切换按钮 - 优化样式 */}
        <div className="flex items-center gap-1 bg-gray-100/80 backdrop-blur-sm p-1 rounded-xl flex-shrink-0">
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === "card"
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            <LayoutGrid size={15} />
            卡片
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === "table"
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            <Table2 size={15} />
            表格
          </button>
        </div>
      </div>

        {/* 任务列表 - 根据视图模式切换 - 优化样式 */}
        {viewMode === "card" ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 overflow-y-auto custom-scrollbar p-1 pb-8"
            style={{ maxHeight: "calc(100vh - 260px)" }}
          >
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} now={now} onEdit={handleEditTask} onDelete={setTaskToDelete} />
            ))}
            {tasks.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <LayoutGrid size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">暂无任务</p>
                <p className="text-sm text-gray-400 mt-1">点击右上角添加任务开始管理</p>
              </div>
            )}

            {total > limit && (
              <div className="col-span-full mt-6">
                <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar pb-8" style={{ maxHeight: "calc(100vh - 260px)" }}>
            <TaskTable tasks={tasks} now={now} onEdit={handleEditTask} onDelete={setTaskToDelete} />
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Table2 size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">暂无任务</p>
                <p className="text-sm text-gray-400 mt-1">点击右上角添加任务开始管理</p>
              </div>
            )}

            {total > limit && (
              <div className="mt-6">
                <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}

        {/* Task Modal */}
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          mode={taskModalMode}
          childList={childList}
          taskData={taskData}
          setTaskData={setTaskData}
          onSubmit={taskModalMode === "add" ? handleAddTask : handleUpdateTask}
          onPhotoSelect={handleTaskPhotoSelect}
          photoPreview={taskPhotoPreview}
          toggleChild={toggleChild}
        />
        <Modal
          isOpen={alertState.isOpen}
          onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
          alert={{
            message: alertState.message,
            type: alertState.type,
          }}
          showCloseButton={false}
          title="提示"
        >
          <div className="py-4 text-center text-gray-600">{alertState.message}</div>
        </Modal>

        {/* Confirm Delete Task */}
        <ConfirmModal
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={handleDeleteTask}
          title="确认删除任务"
          message="确定要删除这个任务吗？此操作无法撤销。"
          confirmText="删除"
          type="danger"
        />

        {/* Template Manager Modal */}
        <TemplateManager
          isOpen={showTemplateManager}
          onClose={() => setShowTemplateManager(false)}
          templates={templates}
          onApply={handleApplyTemplate}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          onNew={() => handleEditTemplate({ name: "", points: 5, icon: "⭐", type: "daily", description: "" })}
        />

        {/* Edit Template Modal */}
        <EditTemplateModal
          isOpen={showEditTemplateModal}
          onClose={() => setShowEditTemplateModal(false)}
          editingTemplate={editingTemplate}
          setEditingTemplate={setEditingTemplate}
          onUpdate={handleUpdateTemplate}
        />
    </>
  );
}

// 包装组件以添加 Suspense
export default function TasksPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <TasksPage />
    </Suspense>
  );
}
