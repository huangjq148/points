"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useChild } from "@/components/ChildShell";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Search, Sparkles, Camera, ChevronRight, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button, DatePicker } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";

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
      <AnimatePresence>
        {showSubmitModal && selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => {
              setShowSubmitModal(false);
              setPhotoPreview("");
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="modal-content !max-w-md !rounded-[2rem] p-8" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-linear-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-inner mb-4">
                  {selectedTask.icon}
                </div>
                <h3 className="text-2xl font-black text-gray-800">{selectedTask.name}</h3>
                <div className="inline-flex items-center gap-1 px-4 py-1 bg-blue-50 text-blue-600 rounded-full mt-2 font-bold">
                  <Sparkles size={16} />
                  <span>+{selectedTask.points} 积分</span>
                </div>
              </div>

              <div className="mb-8">
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoSelect} />
                <div
                  className="group relative border-2 border-dashed border-gray-200 rounded-3xl p-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden">
                      <img src={photoPreview} alt="Task proof" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold flex items-center gap-2">
                          <Camera size={18} />
                          <span>更换照片</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-400 py-10">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera size={32} />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-600">点击上传任务照片</p>
                        <p className="text-xs mt-1">
                          {selectedTask.requirePhoto ? "家长要求一定要有照片哦 📸" : "有照片更容易通过审核呢 ✨"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  className="flex-1 py-4 !rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 border-none"
                  onClick={() => {
                    setShowSubmitModal(false);
                    setPhotoPreview("");
                  }}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 py-4 !rounded-2xl font-bold shadow-xl shadow-blue-200"
                  onClick={handleSubmitTask}
                  disabled={selectedTask.requirePhoto && !photoFile}
                >
                  提交审核
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showTaskDetail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            onClick={() => setShowTaskDetail(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="modal-content !max-w-md !rounded-[2rem] p-8" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-linear-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center text-5xl shadow-inner">
                  {showTaskDetail.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-800 leading-tight">{showTaskDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-blue-600 font-black">
                      <Sparkles size={18} />
                      <span>+{showTaskDetail.points}</span>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
                        showTaskDetail.status === "approved"
                          ? "bg-green-100 text-green-600"
                          : showTaskDetail.status === "submitted"
                          ? "bg-blue-100 text-blue-600"
                          : showTaskDetail.status === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {showTaskDetail.status === "approved" ? <CheckCircle2 size={12} /> : 
                       showTaskDetail.status === "submitted" ? <Clock size={12} /> :
                       showTaskDetail.status === "rejected" ? <XCircle size={12} /> : <Clock size={12} />}
                      {showTaskDetail.status === "approved"
                        ? "任务已完成"
                        : showTaskDetail.status === "submitted"
                        ? "家长审核中"
                        : showTaskDetail.status === "rejected"
                        ? "任务未通过"
                        : "任务进行中"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">任务要求</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {showTaskDetail.description || "快去完成这个任务吧，加油！"}
                  </p>
                </div>

                {showTaskDetail.photoUrl && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">提交的照片</h4>
                    <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
                      <img src={showTaskDetail.photoUrl} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {showTaskDetail.rejectionReason && (
                  <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex gap-3">
                    <AlertCircle className="text-red-400 shrink-0" size={20} />
                    <div>
                      <h4 className="text-sm font-black text-red-800 mb-1">家长说：</h4>
                      <p className="text-sm text-red-700 leading-relaxed">{showTaskDetail.rejectionReason}</p>
                    </div>
                  </div>
                )}
              </div>

              <Button className="w-full py-4 !rounded-2xl font-bold text-lg shadow-xl shadow-blue-100" onClick={() => setShowTaskDetail(null)}>
                好的
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-full overflow-hidden bg-gray-50/50">
        {/* Header Section */}
        <div className="shrink-0 bg-white p-4 pb-6 space-y-5 rounded-b-[2.5rem] shadow-sm">
          <div className="flex gap-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="寻找任务..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-400 text-sm font-medium placeholder:text-gray-400 transition-all"
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <DatePicker
                selected={taskDate}
                onChange={(date: Date | null) => setTaskDate(date)}
                dateFormat="MM-dd"
                customInput={
                  <button className="h-full px-4 bg-gray-50 rounded-2xl text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-all">
                    <CalendarIcon size={20} />
                  </button>
                }
              />
              {taskDate && (
                <button
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-sm border-2 border-white"
                  onClick={() => setTaskDate(null)}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex p-1.5 bg-gray-50 rounded-2xl">
            {(["uncompleted", "completed", "all"] as const).map((tab) => (
              <button
                key={tab}
                className={`relative flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${
                  activeTaskTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => setActiveTaskTab(tab)}
              >
                {tab === "uncompleted" ? "任务中" : tab === "completed" ? "已完成" : "全部"}
                {activeTaskTab === tab && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Task List Section */}
        <div ref={taskListRef} className="flex-1 overflow-y-auto p-4 pt-6 space-y-4 custom-scrollbar">
          {filteredTasks.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  key={task._id}
                  className="group relative bg-white rounded-[2rem] p-5 border border-white shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                  onClick={() => setShowTaskDetail(task)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-linear-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      {task.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-gray-800 truncate leading-tight">{task.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 text-blue-600 font-black text-base">
                          <Sparkles size={16} />
                          <span>+{task.points}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
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
                            ? "任务成功"
                            : task.status === "submitted"
                            ? "等待审核"
                            : task.status === "rejected"
                            ? "需要修改"
                            : "正在进行"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      {task.status === "pending" || task.status === "rejected" ? (
                        <Button
                          size="sm"
                          className="!rounded-2xl px-5 py-2.5 font-black text-sm shadow-lg shadow-blue-100 active:scale-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            setShowSubmitModal(true);
                          }}
                        >
                          去完成
                        </Button>
                      ) : (
                        <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          <ChevronRight className="text-gray-300 group-hover:text-blue-400 transition-colors" size={20} />
                        </div>
                      )}
                    </div>
                  </div>
                  {task.status === "rejected" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t border-red-50 flex items-start gap-2.5"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0 animate-pulse" />
                      <p className="text-xs text-red-500 font-medium leading-relaxed line-clamp-2 italic">
                        <span className="font-black mr-1">家长反馈:</span>
                        {task.rejectionReason || "再接再厉，换张清晰的照片试试吧！"}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6 py-20"
            >
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-sm relative">
                <Sparkles size={60} className="text-blue-100" />
                <motion.div 
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute -top-2 -right-2 text-4xl"
                >
                  ✨
                </motion.div>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-gray-800">还没有任务哦</p>
                <p className="text-sm text-gray-400 mt-1 font-medium">快去提醒家长给你布置一些任务吧！</p>
              </div>
            </motion.div>
          )}
          {isLoadingMore && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-xs font-bold text-gray-400">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                正在加载更多...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
