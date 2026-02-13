"use client";

import { Button, Pagination } from "@/components/ui";
import Select from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import AlertModal from "@/components/AlertModal";
import { Edit2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import TaskCard, { IDisplayedTask } from "./components/TaskCard";
import TemplateManager from "./components/TemplateManager";
import EditTemplateModal from "./components/EditTemplateModal";
import AddTaskModal from "./components/AddTaskModal";
import EditTaskModal from "./components/EditTaskModal";

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
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

import Layout from "@/components/Layouts";
import request from "@/utils/request";
// import { formatDate } from "@/utils/date";
// import Layout from '@/app/layout';

export default function TasksPage() {
  const [selectedChildTaskFilter, setSelectedChildTaskFilter] = useState<string>("all");
  const { currentUser, childList } = useApp();
  const [showAddTask, setShowAddTask] = useState(false);
  const [tasks, setTasks] = useState<IDisplayedTask[]>([]);
  const [activeTaskFilter, setActiveTaskFilter] = useState<
    "all" | "completed" | "uncompleted" | "submitted" | "rejected"
  >("all");
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [editingTaskData, setEditingTaskData] = useState({
    name: "",
    points: 0,
    icon: "",
    type: "daily" as "daily" | "advanced" | "challenge",
    requirePhoto: false,
    imageUrl: "",
    deadline: null as Date | null,
  });
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null);
  // Task Edit/Delete States
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskPhotoPreview, setTaskPhotoPreview] = useState<string>("");
  const [editingTask, setEditingTask] = useState<PlainTask | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [newTask, setNewTask] = useState({
    name: "",
    points: 5,
    icon: "⭐",
    type: "daily",
    requirePhoto: false,
    selectedChildren: [] as string[],
    imageUrl: "",
    recurrence: "none" as "none" | "daily" | "weekly" | "monthly",
    recurrenceDay: undefined as number | undefined,
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

  // 初始化模板数据
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!currentUser?.token) return;
      try {
        const res = await fetch("/api/task-templates", {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          if (data.data.length === 0) {
            // 如果数据库为空，创建默认模板并保存
            const defaultTemplates = [
              { name: "按时起床", points: 5, icon: "⏰", type: "daily", description: "早起不赖床，养成好习惯" },
              { name: "认真完成作业", points: 10, icon: "📚", type: "daily", description: "独立且认真地完成当天的所有作业" },
              { name: "整理房间", points: 8, icon: "🧹", type: "daily", description: "收拾自己的玩具和书桌，保持整洁" },
              { name: "练习乐器", points: 15, icon: "🎹", type: "daily", description: "坚持练习乐器 30 分钟" },
              { name: "阅读 20 分钟", points: 5, icon: "📖", type: "daily", description: "每天坚持阅读，拓宽知识面" },
            ];
            
            for (const t of defaultTemplates) {
              await fetch("/api/task-templates", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${currentUser.token}`,
                },
                body: JSON.stringify(t),
              });
            }
            // 重新获取
            const refreshedRes = await fetch("/api/task-templates", {
              headers: {
                Authorization: `Bearer ${currentUser.token}`,
              },
            });
            const refreshedData = await refreshedRes.json();
            if (refreshedData.success) setTemplates(refreshedData.data);
          } else {
            setTemplates(data.data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch templates:", e);
      }
    };
    fetchTemplates();
  }, [currentUser]);

  const handleApplyTemplate = (template: TaskTemplate) => {
    setNewTask((prev) => ({
      ...prev,
      name: template.name,
      points: template.points,
      icon: template.icon,
      type: template.type as "daily" | "advanced" | "challenge",
    }));
    setShowTemplateManager(false);
    setShowAddTask(true);
    showAlert(`已应用模板: ${template.name}`, "info");
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`/api/task-templates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(templates.filter((t) => t._id !== id));
        showAlert("模板已删除", "success");
      }
    } catch (e) {
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
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify(editingTemplate),
      });
      const data = await res.json();
      if (data.success) {
        if (editingTemplate._id) {
          setTemplates(templates.map((t) => (t._id === editingTemplate._id ? data.data : t)));
        } else {
          setTemplates([data.data, ...templates]);
        }
        setShowEditTemplateModal(false);
        setEditingTemplate(null);
        showAlert(editingTemplate._id ? "模板已更新" : "模板已创建", "success");
      }
    } catch (e) {
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
    if (newTask.selectedChildren.length === 0) {
      showAlert("请选择至少一个孩子", "error");
      return;
    }
    if (!newTask.name.trim()) {
      showAlert("请输入任务名称", "error");
      return;
    }

    let uploadedImageUrl = "";
    if (taskPhotoFile) {
      const formData = new FormData();
      formData.append("file", taskPhotoFile);
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentUser?.token}`,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedImageUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    for (const childId of newTask.selectedChildren) {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({
          ...newTask,
          childId,
          imageUrl: uploadedImageUrl,
        }),
      });

      if (!res.ok) {
        showAlert("添加失败", "error");
        return;
      }
    }

    // 如果勾选了保存为模板
    if (newTask.saveAsTemplate) {
      try {
        await fetch("/api/task-templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser?.token}`,
          },
          body: JSON.stringify({
            name: newTask.name,
            points: newTask.points,
            icon: newTask.icon,
            type: newTask.type,
            description: "", // 默认描述为空
          }),
        });
        // 刷新模板列表
        const res = await fetch("/api/task-templates", {
          headers: {
            Authorization: `Bearer ${currentUser?.token}`,
          },
        });
        const data = await res.json();
        if (data.success) setTemplates(data.data);
      } catch (e) {
        console.error("Failed to save template:", e);
      }
    }

    setShowAddTask(false);
    setNewTask({
      name: "",
      points: 5,
      icon: "⭐",
      type: "daily",
      requirePhoto: false,
      selectedChildren: [],
      imageUrl: "",
      recurrence: "none",
      recurrenceDay: undefined,
      deadline: null,
      saveAsTemplate: false,
    });
    setTaskPhotoFile(null);
    setTaskPhotoPreview("");
    const updatedTasks = await fetchTasks();
    setTasks(updatedTasks);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    let uploadedImageUrl = editingTaskData.imageUrl;
    if (taskPhotoFile) {
      const formData = new FormData();
      formData.append("file", taskPhotoFile);
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentUser?.token}`,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedImageUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({
          taskId: editingTask._id,
          ...editingTaskData,
          imageUrl: uploadedImageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showAlert("任务更新成功", "success");
        setShowEditTaskModal(false);
        setEditingTask(null);
        const updatedTasks = await fetchTasks();
        setTasks(updatedTasks);
      } else {
        showAlert(data.message || "更新失败", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("更新失败", "error");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || !currentUser?.token) return;
    try {
      const res = await fetch(`/api/tasks?taskId=${taskToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showAlert("任务删除成功", "success");
        setTaskToDelete(null);
        const updatedTasks = await fetchTasks();
        setTasks(updatedTasks);
      } else {
        showAlert(data.message, "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("删除失败", "error");
    }
  };

  const toggleChild = (childId: string) => {
    setNewTask((prev) => ({
      ...prev,
      selectedChildren: prev.selectedChildren.includes(childId)
        ? prev.selectedChildren.filter((id) => id !== childId)
        : [...prev.selectedChildren, childId],
    }));
  };
  const handleEditTask = (task: PlainTask) => {
    setEditingTask(task);
    setEditingTaskData({
      name: task.name,
      points: task.points,
      icon: task.icon,
      type: task.type,
      requirePhoto: task.requirePhoto,
      imageUrl: task.imageUrl || "",
      deadline: task.deadline ? new Date(task.deadline) : null,
    });
    setTaskPhotoFile(null);
    setTaskPhotoPreview(task.imageUrl || "");
    setShowEditTaskModal(true);
  };

  const fetchTasks = useCallback(
    async (pageNum: number = 1) => {
      const currentSelectedChildTaskFilter = selectedChildTaskFilter;

      let statusFilter = "";
      if (activeTaskFilter === "completed") {
        statusFilter = "approved";
      } else if (activeTaskFilter === "uncompleted") {
        statusFilter = "pending";
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
    <Layout>
      <>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {selectedChildTaskFilter === "all"
                ? "任务管理"
                : childList.find((c) => c.id === selectedChildTaskFilter)?.username || "未知"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">设置并监督孩子的每日任务</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="w-40">
              <Select
                value={selectedChildTaskFilter}
                onChange={(value) => onFilterChange("child", (value as string) || "all")}
                options={[
                  { value: "all", label: "全部孩子" },
                  ...childList.map((child) => ({ value: child.id, label: child.username })),
                ]}
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
              onClick={() => setShowAddTask(true)}
              className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 shadow-md shadow-blue-100 flex items-center gap-2 group transition-all hover:scale-[1.02] active:scale-[0.98] h-10"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              <span className="font-semibold text-sm">添加任务</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-4 overflow-x-auto">
          {(["all", "uncompleted", "submitted", "completed", "rejected"] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => onFilterChange("status", tab)}
              variant="secondary"
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                activeTaskFilter === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 bg-transparent border-none shadow-none"
              }`}
            >
              {tab === "all"
                ? "全部"
                : tab === "uncompleted"
                  ? "未完成"
                  : tab === "submitted"
                    ? "待审核"
                    : tab === "completed"
                      ? "已完成"
                      : "已驳回"}
            </Button>
          ))}
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar p-1 pb-8"
          style={{ maxHeight: "calc(100vh - 270px)" }}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              now={now}
              onEdit={handleEditTask}
              onDelete={setTaskToDelete}
            />
          ))}
          {tasks.length === 0 && <div className="text-center py-12 text-gray-400 col-span-full">暂无任务</div>}

          {total > limit && (
            <div className="col-span-full mt-4">
              <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={showAddTask}
          onClose={() => setShowAddTask(false)}
          childList={childList}
          newTask={newTask}
          setNewTask={setNewTask}
          onAdd={handleAddTask}
          onPhotoSelect={handleTaskPhotoSelect}
          photoPreview={taskPhotoPreview}
          toggleChild={toggleChild}
        />

        {/* Edit Task Modal */}
        <EditTaskModal
          isOpen={showEditTaskModal}
          onClose={() => setShowEditTaskModal(false)}
          editingTaskData={editingTaskData}
          setEditingTaskData={setEditingTaskData}
          onUpdate={handleUpdateTask}
          onPhotoSelect={handleTaskPhotoSelect}
          photoPreview={taskPhotoPreview}
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
    </Layout>
  );
}
