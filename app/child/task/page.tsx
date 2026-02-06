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
import Image from "next/image";

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
  const router = useRouter();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskDate, setTaskDate] = useState<Date | null>(null);
  const [activeTaskTab, setActiveTaskTab] = useState<"all" | "completed" | "uncompleted">("uncompleted");
  // Derived tasks

  // Modals
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taskListRef = useRef<HTMLDivElement>(null);

  const fetchTasks = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!currentUser) return;
      const token = currentUser?.token;

      const limit = 10;
      const res = await fetch(`/api/tasks?childId=${currentUser.id}&page=${page}&limit=${limit}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (res.status === 401) {
        console.error("Fetch tasks unauthorized");
        return;
      }

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
    [currentUser],
  );

  const loadMoreTasks = async () => {
    if (isLoadingMore || !hasMoreTasks) return;
    setIsLoadingMore(true);
    const nextPage = taskPage + 1;
    await fetchTasks(nextPage, true);
    setTaskPage(nextPage);
    setIsLoadingMore(false);
  };

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
    if (activeTaskTab === "completed") {
      filtered = filtered.filter((t) => t.status === "approved");
    } else if (activeTaskTab === "uncompleted") {
      filtered = filtered.filter((t) => ["pending", "rejected", "submitted"].includes(t.status));
    }
    return filtered;
  })();

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      if (currentUser) {
        await fetchTasks(1, false);
      }
    };
    init();
  }, [currentUser, fetchTasks]);

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

    fetchTasks();
    showMessage("提交成功！等待家长审核~");
  };

  // Simple navigate helper without id in url
  const navigateTo = (path: string) => router.push(`/child/${path}`);

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
                onClick={() => {
                  setShowSubmitModal(false);
                  setPhotoPreview("");
                }}
                className="flex-1 py-3 text-gray-600"
              >
                取消
              </Button>
              <Button onClick={handleSubmitTask} className="flex-1 btn-child">
                确认提交
              </Button>
            </div>
          </div>
        </div>
      )}

      {showTaskDetail && (
        <div className="modal-overlay" onClick={() => setShowTaskDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 shadow-lg rounded-2xl p-4 bg-white inline-block">{showTaskDetail.icon}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-1">{showTaskDetail.name}</h3>
              <div className="flex justify-center gap-2 mb-4">
                <span className="badge badge-primary">+{showTaskDetail.points} 积分</span>
                <span
                  className={`badge ${
                    showTaskDetail.status === "approved"
                      ? "badge-success"
                      : showTaskDetail.status === "rejected"
                        ? "badge-error"
                        : showTaskDetail.status === "submitted"
                          ? "badge-info"
                          : "badge-warning"
                  }`}
                >
                  {showTaskDetail.status === "approved"
                    ? "已完成"
                    : showTaskDetail.status === "rejected"
                      ? "需修改"
                      : showTaskDetail.status === "submitted"
                        ? "审核中"
                        : "待完成"}
                </span>
              </div>
            </div>

            {showTaskDetail.photoUrl && (
              <div className="mb-6 text-left">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">提交的照片：</h4>
                <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={showTaskDetail.photoUrl}
                    alt="任务照片"
                    className="w-full h-auto object-contain max-h-[40vh]"
                  />
                </div>
              </div>
            )}

            {showTaskDetail.rejectionReason && (
              <div className="bg-orange-50 p-4 rounded-xl mb-6 text-left">
                <h4 className="font-bold text-orange-800 mb-1 text-sm">家长留言/审核意见：</h4>
                <p className="text-orange-700 text-sm">{showTaskDetail.rejectionReason}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setShowTaskDetail(null)}
                variant="ghost"
                className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                关闭
              </Button>
              {["pending", "rejected"].includes(showTaskDetail.status) && (
                <Button
                  onClick={() => {
                    setSelectedTask(showTaskDetail);
                    setShowTaskDetail(null);
                    setShowSubmitModal(true);
                  }}
                  className="flex-1"
                >
                  {showTaskDetail.status === "rejected" ? "重新提交" : "去完成"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-blue-700">任务大厅</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => navigateTo("gift")}
            variant="ghost"
            className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 h-auto text-sm font-bold rounded-full"
          >
            🎁 我的礼物
          </Button>
          <Button
            onClick={() => navigateTo("store")}
            variant="ghost"
            className="text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 h-auto text-sm font-bold rounded-full"
          >
            🛒 积分商城 <ChevronRight size={14} />
          </Button>
          <Button
            onClick={() => navigateTo("wallet")}
            variant="ghost"
            className="text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 h-auto text-sm font-bold rounded-full"
          >
            💰 钱包
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white/50 backdrop-blur rounded-xl mb-4 border border-blue-100">
        {(["all", "uncompleted", "completed"] as const).map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTaskTab(tab)}
            variant="ghost"
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
              activeTaskTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-500"
            }`}
          >
            {tab === "all" ? "全部" : tab === "uncompleted" ? "未完成" : "已完成"}
          </Button>
        ))}
      </div>

      {/* Search Area */}
      <div className="mb-4 flex flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索任务..."
            value={taskSearchQuery}
            onChange={(e) => setTaskSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur"
          />
        </div>
        <div className="relative flex-1">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
          <DatePicker
            selected={taskDate}
            onChange={(date: Date | null) => setTaskDate(date)}
            locale="zh-CN"
            dateFormat="yyyy-MM-dd"
            placeholderText="日期"
            className="w-full pl-10 pr-2 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            wrapperClassName="w-full"
            isClearable
          />
        </div>
      </div>

      <div ref={taskListRef} className="space-y-3 max-h-[60vh] overflow-y-auto">
        {filteredTasks.map((task) => {
          const isUrgent =
            task.deadline &&
            new Date(task.deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000 &&
            new Date(task.deadline).getTime() > new Date().getTime();

          return (
            <div
              key={task._id}
              className={`task-card cursor-pointer ${
                ["approved", "submitted"].includes(task.status) ? "opacity-75" : ""
              } ${isUrgent && task.status === "pending" ? "bg-orange-50 border-orange-200" : ""}`}
              onClick={() => setShowTaskDetail(task)}
            >
              <div
                className={`task-icon ${task.status === "approved" ? "bg-blue-100" : task.status === "rejected" ? "bg-red-100" : ""}`}
              >
                {task.status === "approved" ? "✅" : task.status === "rejected" ? "❌" : task.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-gray-800">{task.name}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      task.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : task.status === "submitted"
                          ? "bg-blue-100 text-blue-700"
                          : task.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {task.status === "approved"
                      ? "已完成"
                      : task.status === "submitted"
                        ? "审核中"
                        : task.status === "rejected"
                          ? "需修改"
                          : "待完成"}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <p className="text-sm text-blue-600">+{task.points} 积分</p>
                  {task.status === "approved" && task.approvedAt ? (
                    <span className="text-xs text-gray-400">
                      完成于{" "}
                      {new Date(task.approvedAt).toLocaleString([], {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    task.deadline && (
                      <span
                        className={`text-xs flex items-center gap-1 ${isUrgent ? "text-orange-600 font-bold" : "text-gray-400"}`}
                      >
                        {isUrgent && <span className="animate-pulse">🔥</span>}
                        {new Date(task.deadline).toLocaleDateString()}截止
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-blue-600">
            <Sparkles size={48} className="mx-auto mb-2 opacity-50" />
            <p>暂时没有任务啦！</p>
          </div>
        )}

        {isLoadingMore && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}
