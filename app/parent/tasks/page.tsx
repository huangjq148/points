"use client";

import { Button, Pagination } from "@/components/ui";
import Select from "@/components/ui/Select";
import { User, useApp } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

import AlertModal from "@/components/AlertModal";
import Input from "@/components/ui/Input";
import { zhCN } from "date-fns/locale";
import { Camera, Clock, Edit2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface IDisplayedTask extends PlainTask {
  childName: string;
  childAvatar?: string;
}

interface PlainTask {
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
import { formatDate } from "@/utils/date";
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            {selectedChildTaskFilter === "all"
              ? "任务管理"
              : childList.find((c) => c.id === selectedChildTaskFilter)?.username || "未知"}
          </h2>
          <div className="flex gap-2">
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
            <Button onClick={() => setShowAddTask(true)} className="flex items-center gap-2">
              <Plus size={18} /> 添加任务
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-4 overflow-x-auto">
          {(["all", "uncompleted", "submitted", "completed", "rejected"] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => onFilterChange("status", tab)}
              variant="ghost"
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                activeTaskFilter === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
          className="flex flex-col gap-4 overflow-y-auto custom-scrollbar p-1"
          style={{ maxHeight: "calc(100vh - 350px)" }}
        >
          {tasks.map((task) => {
            const isOverdue =
              task.deadline &&
              now > 0 &&
              new Date(task.deadline).getTime() < now &&
              task.status === "pending";

            return (
              <div
                 key={task._id}
                 className={`card flex items-center gap-4 group relative transition-all ${
                   isOverdue ? "!bg-red-50/95 !border-red-200 shadow-red-100/50" : ""
                 }`}
                 style={isOverdue ? { background: 'rgba(254, 242, 242, 0.95)' } : {}}
               >
                <div className="text-2xl">{task.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800 text-base">{task.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-lg border border-blue-200">
                      {task.childName}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm text-gray-500">
                      积分: <span className="text-orange-600 font-bold">+{task.points}</span>
                    </p>
                    {task.deadline && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        <span>截止: {formatDate(task.deadline)}</span>
                        {isOverdue && <span className="text-red-500 font-medium ml-1">已逾期</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`status-badge static! ${
                        task.status === "approved"
                          ? "status-approved"
                          : task.status === "submitted"
                            ? "status-submitted"
                            : task.status === "rejected"
                              ? "status-rejected"
                              : isOverdue
                                ? "status-rejected"
                                : "status-pending"
                      }`}
                    >
                      {task.status === "approved"
                        ? "已完成"
                        : task.status === "submitted"
                          ? "待审核"
                          : task.status === "rejected"
                            ? "已驳回"
                            : isOverdue
                              ? "已逾期"
                              : "进行中"}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleEditTask(task)}
                        variant="ghost"
                        className={`p-1.5 rounded-lg ${
                          isOverdue
                            ? "text-red-400 hover:text-red-600 hover:bg-red-100/50"
                            : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        }`}
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        onClick={() => setTaskToDelete(task._id)}
                        variant="ghost"
                        className={`p-1.5 rounded-lg ${
                          isOverdue
                            ? "text-red-400 hover:text-red-600 hover:bg-red-100/50"
                            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 whitespace-nowrap">
                    <span>创建: {formatDate(task.createdAt)}</span>
                    <span className="w-px h-2 bg-gray-200" />
                    <span>修改: {formatDate(task.updatedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && <div className="text-center py-12 text-gray-400">暂无任务</div>}

          {total > limit && (
            <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
          )}
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="text-xl font-bold text-gray-800">添加新任务</h3>
              </div>
              <div className="modal-body space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">选择孩子</label>
                  <div className="child-selector">
                    {childList.map((child: User) => (
                      <div
                        key={child.id}
                        onClick={() => toggleChild(child.id)}
                        className={`child-chip ${newTask.selectedChildren.includes(child.id) ? "selected" : ""}`}
                      >
                        <span className="avatar">{child.avatar}</span>
                        <span className="name">{child.username}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Input
                  label="任务名称"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="如：整理书包"
                />

                <div>
                  <label className="block text-sm text-gray-600 mb-1">任务配图（可选）</label>
                  <label className="file-upload p-4">
                    <input type="file" accept="image/*" onChange={handleTaskPhotoSelect} />
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="text-blue-500" size={24} />
                      <span className="text-xs text-gray-500">点击上传图片</span>
                    </div>
                  </label>
                  {taskPhotoPreview && (
                    <img src={taskPhotoPreview} alt="预览" className="image-preview mt-2 max-h-32" />
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">积分</label>
                  <Input
                    type="number"
                    value={newTask.points}
                    onChange={(e) => setNewTask({ ...newTask, points: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTask.requirePhoto}
                      onChange={(e) => setNewTask({ ...newTask, requirePhoto: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">要求拍照提交</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                  <div className="flex flex-wrap gap-2">
                    {["⭐", "📚", "🧹", "🏃", "🎨", "🎵"].map((icon) => (
                      <Button
                        key={icon}
                        onClick={() => setNewTask({ ...newTask, icon })}
                        className={`w-10 h-10 rounded-lg text-xl p-0 transition-all ${newTask.icon === icon ? "bg-blue-100 ring-2 ring-blue-400" : "bg-white border border-gray-200 hover:bg-blue-50"}`}
                        variant="ghost"
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">任务类型</label>
                  <div className="flex gap-2">
                    {["daily", "advanced", "challenge"].map((type) => (
                      <Button
                        key={type}
                        onClick={() => setNewTask({ ...newTask, type: type as "daily" | "advanced" | "challenge" })}
                        variant="ghost"
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                          newTask.type === type
                            ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        }`}
                      >
                        {type === "daily" ? "日常" : type === "advanced" ? "进阶" : "挑战"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">截止时间（可选）</label>
                  <div className="relative z-50">
                    <DatePicker
                      selected={newTask.deadline}
                      onChange={(date: Date | null) => setNewTask({ ...newTask, deadline: date })}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="yyyy/MM/dd HH:mm"
                      locale={zhCN}
                      className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholderText="点击选择截止时间"
                      isClearable
                    />
                    <Clock
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={18}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">自动创建（重复）</label>
                  <Select
                    value={newTask.recurrence}
                    onChange={(val) => {
                      const r =
                        typeof val === "string" && ["none", "daily", "weekly", "monthly"].includes(val)
                          ? (val as "none" | "daily" | "weekly" | "monthly")
                          : "none";
                      setNewTask({ ...newTask, recurrence: r });
                    }}
                    options={[
                      { value: "none", label: "不重复" },
                      { value: "daily", label: "每天" },
                      { value: "weekly", label: "每周" },
                      { value: "monthly", label: "每月" },
                    ]}
                    placeholder="选择重复频率"
                  />

                  {newTask.recurrence === "weekly" && (
                    <div className="mt-2">
                      <Select
                        value={newTask.recurrenceDay}
                        onChange={(val) => setNewTask({ ...newTask, recurrenceDay: val as number })}
                        options={[
                          { value: 1, label: "周一" },
                          { value: 2, label: "周二" },
                          { value: 3, label: "周三" },
                          { value: 4, label: "周四" },
                          { value: 5, label: "周五" },
                          { value: 6, label: "周六" },
                          { value: 0, label: "周日" },
                        ]}
                        placeholder="选择星期"
                      />
                    </div>
                  )}

                  {newTask.recurrence === "monthly" && (
                    <div className="mt-2">
                      <Select
                        value={newTask.recurrenceDay}
                        onChange={(val) => setNewTask({ ...newTask, recurrenceDay: val as number })}
                        options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}号` }))}
                        placeholder="选择日期"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <Button onClick={() => setShowAddTask(false)} variant="ghost" className="flex-1 py-3 text-gray-600">
                  取消
                </Button>
                <Button onClick={handleAddTask} className="flex-1 py-3">
                  确认添加
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditTaskModal && editingTask && (
          <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="text-xl font-bold text-gray-800">编辑任务</h3>
              </div>
              <div className="modal-body space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">任务名称</label>
                  <Input
                    value={editingTaskData.name}
                    onChange={(e) => setEditingTaskData({ ...editingTaskData, name: e.target.value })}
                    placeholder="如：整理书包"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">任务配图（可选）</label>
                  <label className="file-upload p-4">
                    <input type="file" accept="image/*" onChange={handleTaskPhotoSelect} />
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="text-blue-500" size={24} />
                      <span className="text-xs text-gray-500">点击上传图片</span>
                    </div>
                  </label>
                  {taskPhotoPreview && (
                    <img src={taskPhotoPreview} alt="预览" className="image-preview mt-2 max-h-32" />
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">积分</label>
                  <Input
                    type="number"
                    value={editingTaskData.points}
                    onChange={(e) => setEditingTaskData({ ...editingTaskData, points: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingTaskData.requirePhoto}
                      onChange={(e) => setEditingTaskData({ ...editingTaskData, requirePhoto: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">要求拍照提交</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                  <div className="flex flex-wrap gap-2">
                    {["⭐", "📚", "🧹", "🏃", "🎨", "🎵"].map((icon) => (
                      <Button
                        key={icon}
                        onClick={() => setEditingTaskData({ ...editingTaskData, icon })}
                        className={`w-10 h-10 rounded-lg text-xl p-0 ${editingTaskData.icon === icon ? "bg-blue-100 ring-2 ring-blue-400" : "bg-gray-100"}`}
                        variant="ghost"
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">任务类型</label>
                  <div className="flex gap-2">
                    {["daily", "advanced", "challenge"].map((type) => (
                      <Button
                        key={type}
                        onClick={() =>
                          setEditingTaskData({ ...editingTaskData, type: type as "daily" | "advanced" | "challenge" })
                        }
                        variant="ghost"
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                          editingTaskData.type === type
                            ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        }`}
                      >
                        {type === "daily" ? "日常" : type === "advanced" ? "进阶" : "挑战"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">截止时间（可选）</label>
                  <div className="relative z-50">
                    <DatePicker
                      selected={editingTaskData.deadline}
                      onChange={(date: Date | null) => setEditingTaskData({ ...editingTaskData, deadline: date })}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="yyyy/MM/dd HH:mm"
                      locale={zhCN}
                      className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholderText="点击选择截止时间"
                      isClearable
                    />
                    <Clock
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={18}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button
                  onClick={() => setShowEditTaskModal(false)}
                  variant="ghost"
                  className="flex-1 py-3 text-gray-600"
                >
                  取消
                </Button>
                <Button onClick={handleUpdateTask} className="flex-1 py-3">
                  保存修改
                </Button>
              </div>
            </div>
          </div>
        )}
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
      </>
    </Layout>
  );
}
