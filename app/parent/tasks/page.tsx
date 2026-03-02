"use client";

import { Button, Pagination, TabFilter } from "@/components/ui";
import Select from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import AlertModal from "@/components/AlertModal";
import { Edit2, Plus, LayoutGrid, Table2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import TaskCard, { IDisplayedTask } from "./components/TaskCard";
import TaskTable from "./components/TaskTable";
import TemplateManager from "./components/TemplateManager";
import EditTemplateModal from "./components/EditTemplateModal";
import TaskModal, { TaskFormData } from "./components/TaskModal";

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
// import { formatDate } from "@/utils/date";
// import Layout from '@/app/layout';

// 1. 提取配置：方便维护和扩展，避免在 JSX 中写死
const TAB_ITEMS = [
  { key: "all", label: "全部" },
  { key: "uncompleted", label: "未完成" },
  { key: "submitted", label: "待审核" },
  { key: "completed", label: "已完成" },
  { key: "rejected", label: "已驳回" },
] as const;

function TasksPage() {
  const searchParams = useSearchParams();
  const initialChildTaskFilter = searchParams.get("childId") || "all";
  const statusFromQuery = searchParams.get("status");
  const initialTaskFilter: "all" | "completed" | "uncompleted" | "submitted" | "rejected" =
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
  const [activeTaskFilter, setActiveTaskFilter] = useState<
    "all" | "completed" | "uncompleted" | "submitted" | "rejected"
  >(initialTaskFilter);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null);
  const [taskPhotoPreview, setTaskPhotoPreview] = useState<string>("");
  const [editingTask, setEditingTask] = useState<PlainTask | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [taskData, setTaskData] = useState<TaskFormData>({
    name: "",
    description: "",
    points: 5,
    icon: "⭐",
    type: "daily",
    requirePhoto: false,
    selectedChildren: [] as string[],
    imageUrl: "",
    startDate: null as Date | null,
    deadline: null as Date | null,
    saveAsTemplate: false,
  });

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
    }));
    setShowTemplateManager(false);
    setTaskModalMode("add");
    setShowTaskModal(true);
    showAlert(`已应用模板: ${template.name}`, "info");
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
      const res = await request("/api/tasks", {
        method: "POST",
        body: {
          ...taskData,
          childId,
          imageUrl: uploadedImageUrl,
        },
      });

      if (!res.success) {
        showAlert("添加失败", "error");
        return;
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
    setTaskData({
      name: "",
      description: "",
      points: 5,
      icon: "⭐",
      type: "daily",
      requirePhoto: false,
      selectedChildren: [],
      imageUrl: "",
      deadline: null,
      startDate: null,
      saveAsTemplate: false,
    });
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
      if (activeTaskFilter === "completed") {
        statusFilter = "approved";
      } else if (activeTaskFilter === "uncompleted") {
        inProgress = true;
      } else if (activeTaskFilter === "submitted") {
        statusFilter = "submitted";
      } else if (activeTaskFilter === "rejected") {
        statusFilter = "rejected";
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
      setActiveTaskFilter(value as "all" | "completed" | "uncompleted" | "submitted" | "rejected");
    } else {
      setSelectedChildTaskFilter(value);
    }
    setPage(1);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {selectedChildTaskFilter === "all"
                ? "任务管理"
                : selectedChildName}
            </h2>
            <p className="text-gray-500 text-sm mt-1">设置并监督孩子的每日任务</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="w-40">
              <Select
                value={selectedChildTaskFilter}
                onChange={(value) => onFilterChange("child", (value as string) || "all")}
                options={childSelectOptions}
              />
            </div>
            <Button
              onClick={() => setShowTemplateManager(true)}
              className="rounded-xl bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2 shadow-sm flex items-center gap-2 group h-10"
              variant="secondary"
            >
              <Edit2 size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="font-semibold text-sm">模板管理</span>
            </Button>
            <Button
              onClick={() => {
                const defaultStartDate = new Date();
                defaultStartDate.setHours(0, 0, 0, 0);
                const defaultDeadline = new Date();
                defaultDeadline.setHours(23, 59, 59, 999);
                setTaskData({
                  ...taskData,
                  name: "",
                  description: "",
                  points: 5,
                  icon: "⭐",
                  type: "daily",
                  requirePhoto: false,
                  selectedChildren: [],
                  imageUrl: "",
                  startDate: defaultStartDate,
                  deadline: defaultDeadline,
                  saveAsTemplate: false,
                });
                setTaskPhotoFile(null);
                setTaskPhotoPreview("");
                setTaskModalMode("add");
                setShowTaskModal(true);
              }}
              className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 shadow-md shadow-blue-100 flex items-center gap-2 group transition-all hover:scale-[1.02] active:scale-[0.98] h-10"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              <span className="font-semibold text-sm">添加任务</span>
            </Button>
          </div>
        </div>

        {/* Tabs 和视图切换 */}
        <div className="flex items-center justify-between mb-8">
          <TabFilter
            items={TAB_ITEMS}
            activeKey={activeTaskFilter}
            onFilterChange={(key) => onFilterChange("status", key)}
          />
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0 ml-4">
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "card"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid size={16} />
              卡片
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Table2 size={16} />
              表格
            </button>
          </div>
        </div>

        {/* 任务列表 - 根据视图模式切换 */}
        {viewMode === "card" ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 overflow-y-auto custom-scrollbar p-1 pb-8"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} now={now} onEdit={handleEditTask} onDelete={setTaskToDelete} />
            ))}
            {tasks.length === 0 && <div className="text-center py-12 text-gray-400 col-span-full">暂无任务</div>}

            {total > limit && (
              <div className="col-span-full mt-4">
                <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar pb-8" style={{ maxHeight: "calc(100vh - 280px)" }}>
            <TaskTable tasks={tasks} now={now} onEdit={handleEditTask} onDelete={setTaskToDelete} />
            {tasks.length === 0 && <div className="text-center py-12 text-gray-400">暂无任务</div>}

            {total > limit && (
              <div className="mt-4">
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
        <AlertModal
          isOpen={alertState.isOpen}
          onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
          message={alertState.message}
          type={alertState.type}
        />

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
