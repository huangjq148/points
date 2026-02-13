"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useChild } from "@/components/ChildShell";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Search, Sparkles, Camera, ChevronRight } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { zhCN } from "date-fns/locale";
import Button from "@/components/ui/Button";

registerLocale("zh-CN", zhCN);

export interface Task {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  points: number;
  type: string;
  status: string;
  requirePhoto: boolean;
  photoUrl?: string;
  rejectionReason?: string;
  createdAt?: string;
  imageUrl?: string;
  deadline?: string;
  submittedAt?: string;
  approvedAt?: string;
}

export default function TaskPage() {
  const { currentUser } = useApp();
  const { showMessage } = useChild();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskDate, setTaskDate] = useState<Date | null>(null);
  const [activeTaskTab, setActiveTaskTab] = useState<"all" | "completed" | "uncompleted">("uncompleted");

  // Modals
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taskListRef = useRef<HTMLDivElement>(null);

  const token = currentUser?.token;

  const fetchTasks = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!token) return;

      const limit = 10;
      // 优化点：直接通过 API 传递 status 参数，实现后端过滤
      let statusParam = "";
      if (activeTaskTab === "completed") {
        statusParam = "&status=approved";
      } else if (activeTaskTab === "uncompleted") {
        // 后端 API 目前支持单个 status 过滤，对于 uncompleted (pending/submitted/rejected) 
        // 建议在 API 层面增加多状态过滤，或者保持现状但减少不必要的数据加载
        statusParam = ""; // 默认为全量，前端再做细分
      }

      const res = await fetch(`/api/tasks?page=${page}&limit=${limit}${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) return;

      const data = await res.json();
      if (data.success) {
        if (append) {
          setTasks((prev) => [...prev, ...data.tasks]);
        } else {
          setTasks(data.tasks);
        }
        setHasMoreTasks(data.tasks.length === limit);
      }
    },
    [token, activeTaskTab],
  );

  const loadMoreTasks = async () => {
    if (isLoadingMore || !hasMoreTasks) return;
    setIsLoadingMore(true);
    const nextPage = taskPage + 1;
    await fetchTasks(nextPage, true);
    setTaskPage(nextPage);
    setIsLoadingMore(false);
  };

  // 初始加载及 Tab 切换加载
  useEffect(() => {
    if (!token) return;

    const loadTasks = async () => {
      const limit = 10;
      let statusParam = "";
      if (activeTaskTab === "completed") {
        statusParam = "&status=approved";
      } else if (activeTaskTab === "uncompleted") {
        statusParam = "";
      }

      const res = await fetch(`/api/tasks?page=1&limit=${limit}${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) return;

      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setHasMoreTasks(data.tasks.length === limit);
        setTaskPage(1);
      }
    };

    loadTasks();
  }, [token, activeTaskTab]);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (!taskListRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = taskListRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        loadMoreTasks();
      }
    };

    const listElement = taskListRef.current;
    if (listElement) {
      listElement.addEventListener("scroll", handleScroll);
      return () => listElement.removeEventListener("scroll", handleScroll);
    }
  }, [taskPage, hasMoreTasks, isLoadingMore]);

  const filteredTasks = (() => {
    let filtered = tasks;
    if (taskSearchQuery) {
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(taskSearchQuery.toLowerCase()));
    }
    if (taskDate) {
      const filterDate = taskDate.toDateString();
      filtered = filtered.filter((t) => {
        if (!t.createdAt) return false;
        return new Date(t.createdAt).toDateString() === filterDate;
      });
    }
    // 前端细分过滤（当 activeTaskTab 为 uncompleted 时）
    if (activeTaskTab === "uncompleted") {
      filtered = filtered.filter((t) => ["pending", "rejected", "submitted"].includes(t.status));
    }
    return filtered;
  })();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedTask) return;

    let photoUrl = "";
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${currentUser?.token}`,
          },
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          photoUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
      body: JSON.stringify({ taskId: selectedTask._id, status: "submitted", photoUrl }),
    });

    setShowSubmitModal(false);
    setPhotoFile(null);
    setPhotoPreview("");
    setSelectedTask(null);

    fetchTasks(1, false);
    showMessage("提交成功！等待家长审核~");
  };

  return (
    <>
      {showSubmitModal && selectedTask && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowSubmitModal(false);
            setPhotoPreview("");
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl">{selectedTask.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mt-2">{selectedTask.name}</h3>
              <p className="text-blue-600">+{selectedTask.points} 积分</p>
            </div>

            <div className="mb-6">
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoSelect} />
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                    <img src={photoPreview} alt="Task proof" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white font-bold">更换图片</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500 py-4">
                    <Camera size={32} />
                    <span className="text-sm">
                      {selectedTask.requirePhoto ? "点击上传照片 (必填)" : "点击上传照片 (选填)"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {showTaskDetail?.rejectionReason && (
              <div className="bg-orange-50 p-4 rounded-xl mb-6 text-left">
                <h4 className="font-bold text-orange-800 mb-1 text-sm">家长留言/审核意见：</h4>
                <p className="text-orange-700 text-sm">{showTaskDetail.rejectionReason}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setShowSubmitModal(false);
                  setPhotoPreview("");
                }}
              >
                取消
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitTask}
                disabled={selectedTask.requirePhoto && !photoFile}
              >
                提交任务
              </Button>
            </div>
          </div>
        </div>
      )}

      {showTaskDetail && (
        <div className="modal-overlay" onClick={() => setShowTaskDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl p-2 bg-gray-50 rounded-xl">{showTaskDetail.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{showTaskDetail.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-bold">+{showTaskDetail.points} 积分</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        showTaskDetail.status === "approved"
                          ? "bg-green-100 text-green-600"
                          : showTaskDetail.status === "submitted"
                          ? "bg-blue-100 text-blue-600"
                          : showTaskDetail.status === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {showTaskDetail.status === "approved"
                        ? "已完成"
                        : showTaskDetail.status === "submitted"
                        ? "待审核"
                        : showTaskDetail.status === "rejected"
                        ? "未通过"
                        : "进行中"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">任务描述</h4>
                <p className="text-gray-700">{showTaskDetail.description || "暂无描述"}</p>
              </div>

              {showTaskDetail.photoUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">任务凭证</h4>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                    <img src={showTaskDetail.photoUrl} alt="Proof" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {showTaskDetail.rejectionReason && (
                <div className="bg-red-50 p-3 rounded-xl">
                  <h4 className="text-sm font-bold text-red-800 mb-1">未通过原因：</h4>
                  <p className="text-sm text-red-700">{showTaskDetail.rejectionReason}</p>
                </div>
              )}
            </div>

            <Button className="w-full" onClick={() => setShowTaskDetail(null)}>
              知道了
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Section */}
        <div className="shrink-0 bg-white/50 backdrop-blur-md p-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索任务..."
                className="w-full pl-10 pr-4 py-2 bg-white/80 border-none rounded-2xl focus:ring-2 focus:ring-blue-400 text-sm"
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <DatePicker
                selected={taskDate}
                onChange={(date: Date | null) => setTaskDate(date)}
                locale="zh-CN"
                dateFormat="MM-dd"
                customInput={
                  <button className="p-2 bg-white/80 rounded-2xl text-gray-500 hover:text-blue-500 transition-colors">
                    <CalendarIcon size={20} />
                  </button>
                }
              />
              {taskDate && (
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                  onClick={() => setTaskDate(null)}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-white/50 rounded-2xl">
            {(["uncompleted", "completed", "all"] as const).map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                  activeTaskTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                }`}
                onClick={() => setActiveTaskTab(tab)}
              >
                {tab === "uncompleted" ? "进行中" : tab === "completed" ? "已完成" : "全部"}
              </button>
            ))}
          </div>
        </div>

        {/* Task List Section */}
        <div ref={taskListRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task._id}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-4 border border-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                onClick={() => setShowTaskDetail(task)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                    {task.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{task.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-blue-600 font-black text-sm">
                        <Sparkles size={14} />
                        <span>+{task.points}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          task.status === "approved"
                            ? "bg-green-100 text-green-600"
                            : task.status === "submitted"
                            ? "bg-blue-100 text-blue-600"
                            : task.status === "rejected"
                            ? "bg-red-100 text-red-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {task.status === "approved"
                          ? "已奖励"
                          : task.status === "submitted"
                          ? "审核中"
                          : task.status === "rejected"
                          ? "未通过"
                          : "进行中"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {task.status === "pending" || task.status === "rejected" ? (
                      <Button
                        size="sm"
                        className="rounded-full px-4 font-bold shadow-lg shadow-blue-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setShowSubmitModal(true);
                        }}
                      >
                        去完成
                      </Button>
                    ) : (
                      <ChevronRight className="text-gray-300" size={20} />
                    )}
                  </div>
                </div>
                {task.status === "rejected" && (
                  <div className="mt-3 pt-3 border-t border-red-50 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <p className="text-xs text-red-500 line-clamp-1 italic">
                      家长反馈: {task.rejectionReason || "无具体原因"}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 py-20">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <Sparkles size={40} className="opacity-20" />
              </div>
              <p className="font-medium">还没有相关任务哦</p>
            </div>
          )}
          {isLoadingMore && (
            <div className="py-4 text-center text-sm text-gray-400 animate-pulse">
              正在努力加载更多...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
