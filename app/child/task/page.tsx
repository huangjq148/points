"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useChild } from "@/components/ChildShell";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight, Clock, CheckCircle2, XCircle, Trophy, Star, Zap, Lock, Gift, MapPin, Waves, Target, Flame, Cloud, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui";
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
  deadline?: string;
  submittedAt?: string;
  approvedAt?: string;
}

const LEVEL_TITLES = ["探险新手", "小小冒险家", "勇敢探险家", "智慧先锋", "金牌达人", "传奇英雄"];
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500];

function getLevelInfo(totalXP: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      const level = i + 1;
      const title = LEVEL_TITLES[Math.min(i, LEVEL_TITLES.length - 1)];
      const currentThreshold = LEVEL_THRESHOLDS[i];
      const nextThreshold = LEVEL_THRESHOLDS[Math.min(i + 1, LEVEL_THRESHOLDS.length - 1)];
      const progress = nextThreshold > currentThreshold ? ((totalXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100 : 100;
      return { level, title, progress, currentXP: totalXP, nextXP: nextThreshold };
    }
  }
  return { level: 1, title: LEVEL_TITLES[0], progress: 0, currentXP: totalXP, nextXP: LEVEL_THRESHOLDS[1] };
}

export default function TaskPage() {
  const { currentUser } = useApp();
  const { showMessage } = useChild();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSpecialQuest, setShowSpecialQuest] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taskListRef = useRef<HTMLDivElement>(null);
  const token = currentUser?.token;
  
  const totalPoints = currentUser?.availablePoints || 0;
  const totalXP = currentUser?.totalPoints || 0;
  const levelInfo = getLevelInfo(totalXP);
  const avatar = currentUser?.avatar || "🦁";

  const fetchTasks = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!token) return;
      const res = await fetch(`/api/tasks?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        if (append) setTasks((prev) => [...prev, ...data.tasks]);
        else setTasks(data.tasks);
        setHasMoreTasks(data.tasks.length === 20);
      }
    },
    [token]
  );

  const loadMoreTasks = async () => {
    if (isLoadingMore || !hasMoreTasks) return;
    setIsLoadingMore(true);
    const nextPage = taskPage + 1;
    await fetchTasks(nextPage, true);
    setTaskPage(nextPage);
    setIsLoadingMore(false);
  };

  useEffect(() => {
    if (!token) return;
    const loadTasks = async () => {
      const res = await fetch(`/api/tasks?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setHasMoreTasks(data.tasks.length === 20);
        setTaskPage(1);
      }
    };
    loadTasks();
  }, [token]);

  useEffect(() => {
    const handleScroll = () => {
      if (!taskListRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = taskListRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) loadMoreTasks();
    };
    const listElement = taskListRef.current;
    if (listElement) {
      listElement.addEventListener("scroll", handleScroll);
      return () => listElement.removeEventListener("scroll", handleScroll);
    }
  }, [taskPage, hasMoreTasks, isLoadingMore]);

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const submittedTasks = tasks.filter((t) => t.status === "submitted");
  const completedTasks = tasks.filter((t) => t.status === "approved");
  const rejectedTasks = tasks.filter((t) => t.status === "rejected");
  const allDone = pendingTasks.length === 0 && rejectedTasks.length === 0 && tasks.length > 0;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

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
    if (!selectedTask) return;
    let photoUrl = "";
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      try {
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData, headers: { Authorization: `Bearer ${currentUser?.token}` } });
        const uploadData = await uploadRes.json();
        if (uploadData.success) photoUrl = uploadData.url;
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

  const TaskCard = ({ task, type }: { task: Task; type: "todo" | "pending" | "completed" | "rejected" }) => {
    const isCompleted = type === "completed";
    const isRejected = type === "rejected";
    const isPending = type === "pending";
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={!isCompleted ? { scale: 1.08, y: -5 } : {}}
        whileTap={!isCompleted ? { scale: 0.95 } : {}}
        className={`relative cursor-pointer ${!isCompleted ? "group" : ""}`}
        onClick={() => !isCompleted && setShowTaskDetail(task)}
      >
        <div className={`relative flex flex-col items-center`}>
          {isCompleted ? (
            <motion.div 
              animate={{ y: [0, -8, 0] }} 
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="relative"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-green-200 via-emerald-200 to-teal-200 rounded-[2rem] flex items-center justify-center shadow-xl border-4 border-white">
                <span className="text-4xl md:text-5xl filter drop-shadow-md">{task.icon}</span>
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
              </motion.div>
              <div className="absolute -bottom-2 -left-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg">
                +{task.points}
              </div>
            </motion.div>
          ) : isPending ? (
            <div className="relative">
              <motion.div 
                animate={{ boxShadow: ["0 0 0 0 rgba(251, 191, 36, 0)", "0 0 0 15px rgba(251, 191, 36, 0)", "0 0 0 0 rgba(251, 191, 36, 0)"] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 rounded-[2rem] flex items-center justify-center shadow-xl border-4 border-white"
              >
                <span className="text-4xl md:text-5xl filter drop-shadow-md">{task.icon}</span>
              </motion.div>
              <motion.div 
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Clock className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          ) : isRejected ? (
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-red-100 via-pink-100 to-rose-100 rounded-[2rem] flex items-center justify-center shadow-lg border-4 border-red-200 group-hover:border-red-300 transition-colors">
                <span className="text-4xl md:text-5xl filter drop-shadow-md opacity-70">{task.icon}</span>
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <XCircle className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          ) : (
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 rounded-[2rem] flex items-center justify-center shadow-md border-4 border-slate-200 group-hover:border-amber-300 group-hover:shadow-xl group-hover:-translate-y-2 transition-all">
              <span className="text-4xl md:text-5xl filter drop-shadow-sm opacity-50">{task.icon}</span>
            </div>
          )}
          
          <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-full text-center max-w-[90px] truncate ${
            isCompleted ? "bg-green-100 text-green-600" :
            isPending ? "bg-amber-100 text-amber-600" :
            isRejected ? "bg-red-100 text-red-600" :
            "bg-slate-100 text-slate-500"
          }`}>
            {isCompleted ? "✓ 完成" : isPending ? "⏳ 等待中" : isRejected ? "✏️ 修改" : task.name.slice(0, 4)}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {showSubmitModal && selectedTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => { setShowSubmitModal(false); setPhotoPreview(""); }}>
            <motion.div initial={{ scale: 0.8, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 50, opacity: 0 }} transition={{ type: "spring", damping: 20 }} className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                  <Zap size={22} className="fill-white" />
                  <span>+{selectedTask.points} 积分</span>
                </motion.div>
              </div>
              
              <div className="mb-8">
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoSelect} />
                <div className="group relative border-4 border-dashed border-purple-200 rounded-[2rem] p-2 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all" onClick={() => fileInputRef.current?.click()}>
                  {photoPreview ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden">
                      <img src={photoPreview} alt="Task proof" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-bold text-gray-800">📷 更换照片</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-10">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center"
                      >
                        <span className="text-4xl">📸</span>
                      </motion.div>
                      <div className="text-center">
                        <p className="font-black text-gray-700 text-lg">上传任务照片</p>
                        <p className="text-sm mt-1 text-gray-500">{selectedTask.requirePhoto ? "⚠️ 必须上传照片" : "✨ 上传更容易通过"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 py-4 !rounded-2xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 border-none" onClick={() => { setShowSubmitModal(false); setPhotoPreview(""); }}>取消</Button>
                <Button className="flex-1 py-4 !rounded-2xl font-bold text-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl hover:shadow-2xl hover:shadow-orange-200" onClick={handleSubmitTask} disabled={selectedTask.requirePhoto && !photoFile}>提交审核</Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showTaskDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowTaskDetail(null)}>
            <motion.div initial={{ scale: 0.8, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 50, opacity: 0 }} transition={{ type: "spring", damping: 20 }} className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-5 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-100 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner">
                  {showTaskDetail.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-800 leading-tight">{showTaskDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-amber-500 font-black text-lg">+{showTaskDetail.points}</span>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-black flex items-center gap-1 ${
                      showTaskDetail.status === "approved" ? "bg-green-100 text-green-600" :
                      showTaskDetail.status === "submitted" ? "bg-amber-100 text-amber-600" :
                      showTaskDetail.status === "rejected" ? "bg-red-100 text-red-600" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {showTaskDetail.status === "approved" ? "✓ 完成" :
                       showTaskDetail.status === "submitted" ? "⏳ 审核中" :
                       showTaskDetail.status === "rejected" ? "✏️ 需修改" : "🔒 待完成"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-5 rounded-2xl mb-6">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">任务描述</h4>
                <p className="text-gray-700 font-medium leading-relaxed">{showTaskDetail.description || "快去完成这个任务吧！"}</p>
              </div>

              {showTaskDetail.rejectionReason && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-r from-red-50 to-orange-50 p-5 rounded-2xl mb-6 flex gap-3 border-2 border-red-100"
                >
                  <div className="text-2xl">✏️</div>
                  <div>
                    <h4 className="text-sm font-black text-red-600 mb-1">家长说：</h4>
                    <p className="text-sm text-red-700">{showTaskDetail.rejectionReason}</p>
                  </div>
                </motion.div>
              )}

              {showTaskDetail.status === "pending" || showTaskDetail.status === "rejected" ? (
                <Button className="w-full py-4 !rounded-2xl font-bold text-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl" onClick={() => { setSelectedTask(showTaskDetail); setShowSubmitModal(true); }}>
                  {showTaskDetail.status === "rejected" ? "💪 重新提交" : "🚀 开始任务"}
                </Button>
              ) : (
                <Button className="w-full py-4 !rounded-2xl font-bold text-lg bg-gradient-to-r from-slate-700 to-slate-900 shadow-xl" onClick={() => setShowTaskDetail(null)}>知道啦</Button>
              )}
            </motion.div>
          </motion.div>
        )}

        {showSpecialQuest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowSpecialQuest(false)}>
            <motion.div 
              initial={{ scale: 0.5, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.5, y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 rounded-[3rem] p-10 max-w-sm w-full text-white text-center shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 overflow-hidden">
                <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-4 left-4 text-4xl opacity-30">⭐</motion.div>
                <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-8 right-8 text-3xl opacity-30">✨</motion.div>
                <motion.div animate={{ y: [0, 15, 0], rotate: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 3.5 }} className="absolute bottom-8 left-8 text-3xl opacity-30">💫</motion.div>
              </div>
              
              <motion.div 
                animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-7xl mb-6 relative z-10"
              >
                🎁
              </motion.div>
              <h3 className="text-3xl font-black mb-3 relative z-10">神秘礼包</h3>
              <p className="text-white/80 mb-8 relative z-10">完成所有任务，解锁神秘奖励！</p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSpecialQuest(false)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-8 py-4 rounded-full font-black text-lg transition relative z-10"
              >
                期待满满！🎉
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row h-full gap-4 p-4">
        {/* 左侧边栏 */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-[2.5rem] p-5 text-white shadow-2xl h-full flex flex-col relative overflow-hidden">
            {/* 装饰云朵 */}
            <motion.div animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-4 left-4 text-3xl opacity-30">☁️</motion.div>
            <motion.div animate={{ x: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute top-12 right-8 text-2xl opacity-20">🌸</motion.div>
            <motion.div animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 3.5 }} className="absolute bottom-20 left-8 text-2xl opacity-20">⭐</motion.div>

            {/* 头像 */}
            <div className="text-center mb-4 pt-2">
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="relative inline-block"
              >
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-6xl border-4 border-white/30 shadow-xl">
                  {avatar}
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-xl shadow-lg border-3 border-white"
                >
                  ⭐
                </motion.div>
              </motion.div>
              <h2 className="text-xl font-black mt-3 drop-shadow-lg">小英雄</h2>
              <p className="text-white/70 text-xs font-medium">欢迎回来！</p>
            </div>

            {/* 等级卡片 */}
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-400 text-amber-800 px-2 py-1 rounded-full text-xs font-black">
                    LV.{levelInfo.level}
                  </div>
                  <span className="font-bold text-sm">{levelInfo.title}</span>
                </div>
                <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
              </div>
              <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 rounded-full"
                />
              </div>
              <div className="flex justify-between mt-1 text-xs font-medium opacity-70">
                <span>{levelInfo.currentXP} XP</span>
                <span>{levelInfo.nextXP} XP</span>
              </div>
            </div>

            {/* 金币卡片 */}
            <div className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-[2rem] p-5 text-center shadow-xl flex items-center justify-center gap-4 relative overflow-hidden">
              <motion.div 
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="text-5xl drop-shadow-xl"
              >
                💰
              </motion.div>
              <div className="text-left">
                <div className="text-4xl font-black drop-shadow-lg">{totalPoints}</div>
                <div className="text-white/90 text-sm font-bold">金币</div>
              </div>
              
              {/* 金币堆叠装饰 */}
              <div className="absolute bottom-2 right-4 text-2xl opacity-40">💰</div>
            </div>

            {/* 成就按钮 */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/child/achievements')} 
              className="mt-4 bg-white/25 hover:bg-white/35 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center gap-3 transition"
            >
              <Trophy className="w-6 h-6" />
              <span className="font-bold">查看成就</span>
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>

        {/* 右侧冒险地图 */}
        <div className="flex-1 min-h-0">
          <div ref={taskListRef} className="h-full bg-gradient-to-b from-sky-200 via-blue-100 to-green-100 rounded-[2.5rem] p-4 md:p-8 overflow-y-auto relative">
            {/* 天空装饰 */}
            <div className="fixed top-8 left-8 text-4xl opacity-40 pointer-events-none">☁️</div>
            <div className="fixed top-16 right-16 text-3xl opacity-30 pointer-events-none">☀️</div>
            <div className="fixed top-1/3 left-4 text-2xl opacity-20 pointer-events-none">🌸</div>

            {/* 地图标题 */}
            <motion.div 
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl md:text-4xl font-black text-gray-800 drop-shadow-sm">
                🗺️ 今日冒险
              </h1>
              <p className="text-gray-600 font-medium mt-2">完成挑战，收集宝藏！</p>
              
              {/* 进度条 */}
              <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-2xl p-4 max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700">冒险进度</span>
                  <span className="font-black text-amber-600">{progressPercent}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 rounded-full"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  {completedTasks.length} / {tasks.length} 个任务完成
                </div>
              </div>
            </motion.div>

            {/* 冒险岛屿 */}
            <div className="relative max-w-2xl mx-auto pb-8">
              {/* 路径装饰 - 不覆盖起点和终点 */}
              <div className="absolute left-1/2 top-16 bottom-32 w-2 -translate-x-1/2 hidden md:block z-0">
                <div className="w-full h-full bg-gradient-to-b from-amber-400 via-orange-300 to-green-400 rounded-full opacity-30" />
              </div>

              {/* 起点 */}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex justify-center mb-10 relative z-10">
                <div className="bg-gradient-to-r from-blue-400 to-cyan-500 text-white px-8 py-3 rounded-full font-black shadow-xl flex items-center gap-2">
                  <MapPin className="w-6 h-6" />
                  起点
                </div>
              </motion.div>

              {/* 第一站：待完成 */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-10 relative"
              >
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-r from-slate-200 to-gray-300 rounded-full flex items-center justify-center shadow-lg hidden md:flex">
                  <Target className="w-8 h-8 text-slate-500" />
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 shadow-xl border-4 border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🪨</span>
                    <span className="font-black text-lg text-gray-700">灰色石阶</span>
                    <span className="ml-auto bg-slate-200 px-4 py-1.5 rounded-full text-sm font-bold">{pendingTasks.length + rejectedTasks.length}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 min-h-[100px]">
                    {[...rejectedTasks, ...pendingTasks].slice(0, 4).map((task) => (
                      <TaskCard key={task._id} task={task} type={rejectedTasks.includes(task) ? "rejected" : "todo"} />
                    ))}
                    {[...rejectedTasks, ...pendingTasks].length === 0 && (
                      <div className="flex items-center text-slate-400 italic">等待任务...</div>
                    )}
                    {[...rejectedTasks, ...pendingTasks].length > 4 && (
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-500">
                        +{rejectedTasks.length + pendingTasks.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* 第二站：等待审核 */}
              {submittedTasks.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-10 relative"
                >
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-r from-amber-200 to-orange-200 rounded-full flex items-center justify-center shadow-lg hidden md:flex">
                    <motion.span animate={{ rotate: [0, 20, -20, 0] }} className="text-3xl">⏳</motion.span>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 shadow-xl border-4 border-amber-200">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">⏳</span>
                      <span className="font-black text-lg text-amber-700">发光沙漏</span>
                      <span className="ml-auto bg-amber-200 px-4 py-1.5 rounded-full text-sm font-bold">{submittedTasks.length}</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 min-h-[100px]">
                      {submittedTasks.slice(0, 4).map((task) => (
                        <TaskCard key={task._id} task={task} type="pending" />
                      ))}
                      {submittedTasks.length > 4 && (
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-600">
                          +{submittedTasks.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 第三站：已完成 */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-10 relative"
              >
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-r from-green-200 to-emerald-200 rounded-full flex items-center justify-center shadow-lg hidden md:flex">
                  <span className="text-3xl">🌸</span>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 shadow-xl border-4 border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🌸</span>
                    <span className="font-black text-lg text-green-700">胜利花园</span>
                    <span className="ml-auto bg-green-200 px-4 py-1.5 rounded-full text-sm font-bold">{completedTasks.length}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 min-h-[100px]">
                    {completedTasks.slice(0, 4).map((task) => (
                      <TaskCard key={task._id} task={task} type="completed" />
                    ))}
                    {completedTasks.length === 0 && (
                      <div className="flex items-center text-green-400 italic">暂无完成</div>
                    )}
                    {completedTasks.length > 4 && (
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                        +{completedTasks.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* 终点：大宝箱 */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.8, damping: 15 }}
                className="flex justify-center pb-8 relative z-10"
              >
                <motion.div 
                  animate={allDone ? { y: [0, -12, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`relative ${allDone ? "cursor-pointer" : ""}`}
                  onClick={() => allDone ? showMessage("🎉 恭喜完成今日所有任务！") : undefined}
                >
                  <div className={`text-7xl md:text-8xl filter drop-shadow-2xl ${allDone ? "" : "grayscale opacity-40"}`}>
                    {allDone ? "🎁" : "🔒"}
                  </div>
                  {allDone && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 px-4 py-2 rounded-full font-black text-sm shadow-lg"
                    >
                      ✨ 今日完成!
                    </motion.div>
                  )}
                  <div className={`text-center mt-3 ${allDone ? "text-amber-500" : "text-slate-400"}`}>
                    <span className="font-black text-lg">
                      {allDone ? "🎉 终极宝藏!" : "🔒 终极宝藏"}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* 神秘任务按钮 */}
            <motion.button
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              whileHover={{ scale: 1.15, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSpecialQuest(true)}
              className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-18 h-18 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-4xl z-30 border-6 border-white"
            >
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                🎁
              </motion.div>
            </motion.button>

            {/* 空状态 */}
            {tasks.length === 0 && !isLoadingMore && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50/90 rounded-[2.5rem]"
              >
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-8xl mb-6"
                >
                  🎒
                </motion.div>
                <p className="text-2xl font-black text-gray-800">冒险即将开始!</p>
                <p className="text-gray-500 font-medium mt-2">等待家长布置任务...</p>
              </motion.div>
            )}

            {/* 加载中 */}
            {isLoadingMore && (
              <div className="py-6 text-center">
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-white rounded-full shadow-lg text-sm font-bold text-gray-500">
                  <div className="w-4 h-4 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  加载中...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
