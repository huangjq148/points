"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui";
import DatePicker from "@/components/ui/DatePicker";

interface Task {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  points: number;
  status: string;
  requirePhoto?: boolean;
  deadline?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "pending", label: "待开始" },
  { value: "submitted", label: "审核中" },
  { value: "approved", label: "已完成" },
  { value: "rejected", label: "需修改" },
];

export default function TaskPage() {
  const { currentUser } = useApp();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(async (pageNum: number = 1) => {
    if (!currentUser?.token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      });
      
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const res = await fetch(`/api/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      
      const data = await res.json();
      if (data.success) {
        let filteredTasks = data.tasks;
        
        if (searchName) {
          filteredTasks = filteredTasks.filter((t: Task) => 
            t.name.toLowerCase().includes(searchName.toLowerCase())
          );
        }
        
        if (startDate || endDate) {
          filteredTasks = filteredTasks.filter((t: Task) => {
            const taskDate = t.approvedAt || t.submittedAt || t.createdAt;
            if (!taskDate) return false;
            
            const taskTime = new Date(taskDate).getTime();
            const startTime = startDate ? startDate.getTime() : 0;
            const endTime = endDate ? endDate.getTime() + 86400000 : Number.MAX_SAFE_INTEGER;
            
            return taskTime >= startTime && taskTime <= endTime;
          });
        }
        
        setTasks(filteredTasks);
        setTotal(data.total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("获取任务失败:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, limit, searchName, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchTasks(1);
  }, []);

  const handleSearch = () => {
    fetchTasks(1);
  };

  const handleReset = () => {
    setSearchName("");
    setStatusFilter("");
    setStartDate(null);
    setEndDate(null);
    fetchTasks(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchTasks(newPage);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedTask || !currentUser?.token) return;
    
    setSubmitting(true);
    let photoUrl = "";
    
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      try {
        const uploadRes = await fetch("/api/upload", { 
          method: "POST", 
          body: formData, 
          headers: { Authorization: `Bearer ${currentUser.token}` } 
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) photoUrl = uploadData.url;
      } catch (error) {
        console.error("Upload error:", error);
      }
    }
    
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ taskId: selectedTask._id, status: "submitted", photoUrl }),
      });
      const data = await res.json();
      
      if (data.success) {
        setShowSubmitModal(false);
        setPhotoFile(null);
        setPhotoPreview("");
        setSelectedTask(null);
        fetchTasks(page);
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(task);
  };

  const openSubmitModal = (task: Task) => {
    setSelectedTask(task);
    setShowSubmitModal(true);
    setShowTaskDetail(null);
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case "approved": return { label: "已完成", bg: "bg-green-100", text: "text-green-600" };
      case "submitted": return { label: "审核中", bg: "bg-blue-100", text: "text-blue-600" };
      case "pending": return { label: "待开始", bg: "bg-gray-100", text: "text-gray-600" };
      case "rejected": return { label: "需修改", bg: "bg-red-100", text: "text-red-600" };
      default: return { label: "未知", bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <style jsx global>{`
        * { font-family: 'Nunito', sans-serif; }
        body { background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); }
        .glass { background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.3); }
        .glass-strong { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border: 2px solid rgba(255, 255, 255, 0.5); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .react-datepicker__popper { z-index: 9999 !important; }
        .react-datepicker-popper { z-index: 9999 !important; }
      `}</style>

      <div className="min-h-screen px-4 py-4 relative">
        {/* 搜索区域 */}
        <div className="glass-strong rounded-3xl p-4 mb-4 shadow-xl relative z-10">
          <div className="flex flex-col gap-3">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索任务名称..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            
            {/* 筛选条件 */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* 状态筛选 */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 日期筛选 */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Calendar size={16} className="text-gray-400" />
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholderText="开始日期"
                  className="border-gray-100 flex-1"
                />
                <span className="text-gray-400">-</span>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  placeholderText="结束日期"
                  className="border-gray-100 flex-1"
                />
              </div>
            </div>
            
            {/* 按钮 */}
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                搜索
              </Button>
              <Button onClick={handleReset} variant="secondary">
                重置
              </Button>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="glass-strong rounded-3xl p-4 shadow-xl min-h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-gray-800">任务列表</h2>
            <span className="text-sm text-gray-500">共 {total} 个任务</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>暂无任务</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {tasks.map((task, index) => {
                  const statusInfo = getStatusInfo(task.status);
                  const isPending = task.status === "pending";
                  const isRejected = task.status === "rejected";
                  
                  return (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => openTaskDetail(task)}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        task.status === "approved" ? "bg-green-100" :
                        task.status === "submitted" ? "bg-blue-100" :
                        task.status === "rejected" ? "bg-red-100" :
                        "bg-gray-200"
                      }`}>
                        {task.status === "approved" ? "✓" : task.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 truncate">{task.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {task.description || "暂无描述"} • +{task.points}分
                        </p>
                        {task.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1">✏️ {task.rejectionReason}</p>
                        )}
                      </div>
                      
                      {(isPending || isRejected) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSubmitModal(task);
                          }}
                          className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-full hover:bg-blue-600 transition-colors"
                        >
                          {isRejected ? "重新提交" : "提交"}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    variant="secondary"
                    className="w-10 h-10 p-0 rounded-full"
                  >
                    <ChevronLeft size={20} />
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 rounded-full text-sm font-bold ${
                            page === pageNum
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    variant="secondary"
                    className="w-10 h-10 p-0 rounded-full"
                  >
                    <ChevronRight size={20} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 任务详情弹窗 */}
      <AnimatePresence>
        {showTaskDetail && selectedTask && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" 
            onClick={() => setShowTaskDetail(null)}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.8, y: 50, opacity: 0 }} 
              transition={{ type: "spring", damping: 20 }} 
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-5 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-100 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner">
                  {selectedTask.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-800 leading-tight">{selectedTask.name}</h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-amber-500 font-black text-lg">+{selectedTask.points}</span>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-black flex items-center gap-1 ${
                      selectedTask.status === "approved" ? "bg-green-100 text-green-600" :
                      selectedTask.status === "submitted" ? "bg-blue-100 text-blue-600" :
                      selectedTask.status === "rejected" ? "bg-red-100 text-red-600" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {selectedTask.status === "approved" ? "✓ 完成" :
                       selectedTask.status === "submitted" ? "⏳ 审核中" :
                       selectedTask.status === "rejected" ? "✏️ 需修改" : "🔒 待完成"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-5 rounded-2xl mb-6">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">任务描述</h4>
                <p className="text-gray-700 font-medium leading-relaxed">{selectedTask.description || "快去完成这个任务吧！"}</p>
              </div>

              {selectedTask.status === "pending" || selectedTask.status === "rejected" ? (
                <button 
                  className="w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl"
                  onClick={() => openSubmitModal(selectedTask)}
                >
                  {selectedTask.status === "rejected" ? "💪 重新提交" : "🚀 开始任务"}
                </button>
              ) : (
                <button 
                  className="w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-slate-700 to-slate-900 shadow-xl"
                  onClick={() => setShowTaskDetail(null)}
                >
                  知道啦
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提交任务弹窗 */}
      <AnimatePresence>
        {showSubmitModal && selectedTask && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" 
            onClick={() => { setShowSubmitModal(false); setPhotoPreview(""); }}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.8, y: 50, opacity: 0 }} 
              transition={{ type: "spring", damping: 20 }} 
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15, delay: 0.1 }}
                  className="w-28 h-28 bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 rounded-[2.5rem] flex items-center justify-center text-7xl mx-auto shadow-inner mb-4"
                >
                  {selectedTask.icon}
                </motion.div>
                <h3 className="text-2xl font-black text-gray-800">{selectedTask.name}</h3>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-300 to-orange-400 text-white rounded-full mt-4 font-black shadow-lg"
                >
                  <span>⚡</span>
                  <span>+{selectedTask.points} 积分</span>
                </motion.div>
              </div>
              
              <div className="mb-8">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handlePhotoSelect} 
                />
                <div 
                  className="group relative border-4 border-dashed border-purple-200 rounded-[2rem] p-2 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden">
                      <img src={photoPreview} alt="Task proof" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-bold text-gray-800">📷 更换照片</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-10">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                        <span className="text-4xl">📸</span>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-gray-700 text-lg">上传任务照片</p>
                        <p className="text-sm mt-1 text-gray-500">{selectedTask.requirePhoto ? "⚠️ 必须上传照片" : "✨ 上传更容易通过"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  className="flex-1 py-4 !rounded-2xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 border-none"
                  onClick={() => { setShowSubmitModal(false); setPhotoPreview(""); }}
                >
                  取消
                </button>
                <button 
                  className="flex-1 py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl hover:shadow-2xl hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSubmitTask}
                  disabled={submitting || (selectedTask.requirePhoto && !photoFile)}
                >
                  {submitting ? "提交中..." : "提交审核"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
