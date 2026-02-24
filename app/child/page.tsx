'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import FeatureGrid from './components/FeatureGrid';
import { compressImage } from '@/utils/image';

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
  streakCount?: number;
  imageUrl?: string;
  photoUrl?: string;
}

interface Medal {
  id: string;
  name: string;
  icon: string;
  isEarned: boolean;
  earnedAt?: string;
}

const LEVEL_TITLES = ['探险新手', '小小冒险家', '勇敢探险家', '智慧先锋', '金牌达人', '传奇英雄'];
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500];

function getLevelInfo(totalXP: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      const level = i + 1;
      const title = LEVEL_TITLES[Math.min(i, LEVEL_TITLES.length - 1)];
      const currentThreshold = LEVEL_THRESHOLDS[i];
      const nextThreshold = LEVEL_THRESHOLDS[Math.min(i + 1, LEVEL_THRESHOLDS.length - 1)];
      const progress = nextThreshold > currentThreshold ? ((totalXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100 : 100;
      return { level, title, progress, currentXP: totalXP, nextXP: nextThreshold, tasksToNext: Math.max(0, nextThreshold - totalXP) };
    }
  }
  return { level: 1, title: LEVEL_TITLES[0], progress: 0, currentXP: totalXP, nextXP: LEVEL_THRESHOLDS[1], tasksToNext: LEVEL_THRESHOLDS[1] - totalXP };
}

function generateStars() {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    delay: `${Math.random() * 3}s`,
  }));
}

function StarsBackground() {
  const [stars] = useState(generateStars);

  return (
    <div className="stars" id="stars">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function ChildHome() {
  const { currentUser } = useApp();
  const router = useRouter();
  const toast = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPoints = currentUser?.availablePoints || 0;
  const totalXP = currentUser?.totalPoints || 0;
  const levelInfo = getLevelInfo(totalXP);
  const avatar = currentUser?.avatar || '👦';
  const username = currentUser?.username || '宇航员小明';

  useEffect(() => {
    let cancelled = false;
    const duration = 1500;
    const steps = 20;
    const increment = totalPoints / steps;
    let current = 0;
    
    const tick = () => {
      if (cancelled) return;
      current += increment;
      if (current >= totalPoints) {
        setDisplayPoints(totalPoints);
      } else {
        setDisplayPoints(Math.floor(current));
        setTimeout(tick, duration / steps);
      }
    };
    
    const timer = setTimeout(tick, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [totalPoints]);

  const fetchTasks = useCallback(async () => {
    if (!currentUser?.token) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    try {
      const res = await fetch(`/api/tasks?excludeCompletedBeforeDeadline=true&deadlineFrom=${todayStr}`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('获取任务失败:', error);
    }
  }, [currentUser]);

  const fetchMedals = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch('/api/gamification/medals', {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMedals(data.data.medals || []);
      }
    } catch (error) {
      console.error('获取徽章失败:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTasks();
    fetchMedals();
  }, [fetchTasks, fetchMedals]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedFile = await compressImage(file);
      setPhotoFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(compressedFile);
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
        setShowTaskDetail(null);
        fetchTasks();
        toast.success("提交成功！等待家长审核~");
      } else {
        toast.error("提交失败，请重试");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickComplete = async (task: Task) => {
    if (!currentUser?.token) return;
    
    setSubmitting(true);
    const photoUrl = "";
    
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ taskId: task._id, status: "submitted", photoUrl }),
      });
      const data = await res.json();
      
      if (data.success) {
        const element = document.getElementById(`task-${task._id}`);
        if (element) {
          const rect = element.getBoundingClientRect();
          const floater = document.createElement('div');
          floater.className = 'point-float';
          floater.textContent = `+${task.points}`;
          floater.style.left = `${rect.left + rect.width / 2}px`;
          floater.style.top = `${rect.top}px`;
          document.body.appendChild(floater);
          setTimeout(() => floater.remove(), 1500);
        }
        
        setDisplayPoints(prev => prev + task.points);
        fetchTasks();
        toast.success(`任务提交成功！+${task.points}分`);
      }
    } catch (error) {
      console.error("Quick complete error:", error);
      toast.error("提交失败，请重试");
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const filteredTasks = tasks;

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const completedTasks = filteredTasks.filter(t => t.status === 'approved');

  const earnedMedals = medals.filter(m => m.isEarned).slice(0, 4);

  const maxStreak = tasks.reduce((max, task) => Math.max(max, task.streakCount || 0), 0);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const getTaskStatus = (status: string) => {
    switch(status) {
      case 'approved': return { label: '已完成', color: 'green', bg: 'bg-green-500' };
      case 'submitted': return { label: '审核中', color: 'blue', bg: 'bg-blue-500' };
      case 'pending': return { label: '待开始', color: 'gray', bg: 'bg-gray-300' };
      case 'rejected': return { label: '需修改', color: 'red', bg: 'bg-red-500' };
      default: return { label: '紧急', color: 'red', bg: 'bg-red-500' };
    }
  };

  return (
    <>
      <style jsx global>{`
        * {
          font-family: 'Nunito', sans-serif;
        }
        
        body {
          background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        .stars {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }
        
        .star {
          position: absolute;
          background: white;
          border-radius: 50%;
          animation: twinkle 3s infinite;
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        .card-3d {
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }
        
        .card-3d:hover {
          transform: translateY(-5px) rotateX(5deg);
        }
        
        .glass {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
        
        .glass-strong {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 255, 255, 0.5);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        
        .float-anim {
          animation: float 4s ease-in-out infinite;
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        .pulse-ring::before {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 3px solid #fbbf24;
          animation: pulse-ring 2s infinite;
        }
        
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
        }
        
        .point-float {
          position: absolute;
          color: #fbbf24;
          font-weight: 900;
          font-size: 1.5rem;
          pointer-events: none;
          animation: floatUp 1.5s ease-out forwards;
          z-index: 100;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        @keyframes celebrate {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.2) rotate(-5deg); }
          50% { transform: scale(1) rotate(5deg); }
          75% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        .celebrate-anim {
          animation: celebrate 0.6s ease-in-out;
        }
        
        .progress-glow {
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .timeline-line {
          position: absolute;
          left: 24px;
          top: 40px;
          bottom: 0;
          width: 4px;
          background: linear-gradient(to bottom, #e5e7eb 0%, #e5e7eb 100%);
          border-radius: 2px;
        }
        
        @keyframes badge-shine {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
          100% { filter: brightness(1); }
        }
        
        .badge-shine {
          animation: badge-shine 2s infinite;
        }
        
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        
        .character-eye {
          animation: blink 4s infinite;
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="relative min-h-screen text-gray-800">
        <StarsBackground />

        {/* 主内容区 - 不包含Header和用户信息，由ChildLayout提供 */}
        <div className="relative z-10 px-6 pt-4 pb-6">
          {/* 主积分卡片 */}
          <div className="glass-strong rounded-3xl p-6 shadow-2xl relative overflow-hidden card-3d">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-300/30 to-orange-400/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">💎</span>
                    <span className="text-gray-500 font-bold text-sm uppercase tracking-wider">星际能量</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 drop-shadow-sm">
                      {displayPoints.toLocaleString()}
                    </span>
                    <span className="text-xl font-bold text-gray-400">pts</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-3 text-white shadow-lg transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                  <div className="text-xs font-bold opacity-90">连击天数</div>
                  <div className="text-2xl font-black">🔥 {maxStreak}</div>
                </div>
              </div>

              {/* 经验值进度条 */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                  <span>Level {levelInfo.level}</span>
                  <span>Level {levelInfo.level + 1}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner relative">
                  <div className="h-full progress-glow rounded-full relative" style={{ width: `${levelInfo.progress}%` }}>
                    <div className="absolute inset-0 bg-white/30 rounded-full"></div>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" style={{ left: `${levelInfo.progress}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-semibold">再完成{levelInfo.tasksToNext}个任务升级！解锁新飞船 🚀</p>
              </div>

              {/* 快捷统计 */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-blue-50 rounded-xl p-2 text-center border-2 border-blue-100">
                  <div className="text-lg font-black text-blue-600">{filteredTasks.length}</div>
                  <div className="text-[10px] font-bold text-blue-400 uppercase">今日任务</div>
                </div>
                <div className="bg-green-50 rounded-xl p-2 text-center border-2 border-green-100">
                  <div className="text-lg font-black text-green-600">{completedTasks.length}</div>
                  <div className="text-[10px] font-bold text-green-400 uppercase">已完成</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-2 text-center border-2 border-purple-100">
                  <div className="text-lg font-black text-purple-600">{pendingTasks.length}</div>
                  <div className="text-[10px] font-bold text-purple-400 uppercase">待开始</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 今日任务时间轴 */}
        <div className="relative z-10 px-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md">
              <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">🎯</span>
              今日星际任务
            </h2>
            <button 
              className="text-white/80 text-sm font-bold hover:text-white transition-colors flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm"
              onClick={() => router.push('/child/task')}
            >
              查看全部 <span className="text-lg">→</span>
            </button>
          </div>

          <div className="relative pl-2">
            <div className="timeline-line"></div>
            <div className="space-y-4">
              {filteredTasks.map((task, index) => {
                const status = getTaskStatus(task.status);
                const isCompleted = task.status === 'approved';
                const isPending = task.status === 'pending';
                const isSubmitted = task.status === 'submitted';
                const isRejected = task.status === 'rejected';
                
                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start gap-4 group cursor-pointer"
                    id={`task-${task._id}`}
                    onClick={() => openTaskDetail(task)}
                  >
                    <div className={`relative z-10 w-12 h-12 ${
                      isCompleted ? 'bg-green-500' : 
                      isSubmitted ? 'bg-blue-500' : 
                      isRejected ? 'bg-red-500' : 
                      'bg-gray-300'
                    } rounded-2xl flex items-center justify-center text-2xl shadow-lg border-4 border-white ${isPending ? 'pulse-ring' : ''} ${isCompleted || isRejected ? '' : isPending ? '' : 'grayscale'}`}>
                      {isCompleted ? '✓' : task.icon}
                    </div>
                    <div 
                      className={`flex-1 ${
                        isCompleted ? 'glass rounded-2xl border-l-4 border-green-400 opacity-75' : 
                        isSubmitted ? 'glass rounded-2xl border-l-4 border-blue-400 opacity-75' :
                        isRejected ? 'glass rounded-2xl border-l-4 border-red-400' :
                        'glass-strong rounded-2xl border-l-4 border-blue-500 shadow-xl transform hover:scale-[1.02] transition-all'
                      }`}
                      style={{ padding: '16px' }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-bold ${
                              isCompleted ? 'text-gray-700 line-through decoration-2 decoration-green-400' : 
                              'text-gray-800'
                            } text-lg`}>
                              {task.name}
                            </h3>
                            {isPending && (
                              <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">进行中</span>
                            )}
                            {isSubmitted && (
                              <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">审核中</span>
                            )}
                            {isRejected && (
                              <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">需修改</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span>{task.icon}</span> {isCompleted ? '已完成' : isSubmitted ? '审核中' : '待完成'} • +{task.points}分
                            {task.deadline && (() => {
                              const deadline = new Date(task.deadline);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const tomorrow = new Date(today);
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              const isToday = deadline >= today && deadline < tomorrow;
                              const timeStr = deadline.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                              const dateStr = !isToday ? deadline.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' : '';
                              return <> • 截止 {dateStr}{timeStr}</>;
                            })()}
                          </p>
                          {isPending && (
                            <div className="mt-2 flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSubmitModal(task);
                                }}
                                className="bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-1"
                              >
                                <span>✓</span> 完成
                              </button>
                            </div>
                          )}
                          {isRejected && task.rejectionReason && (
                            <p className="text-xs text-red-500 mt-2">✏️ {task.rejectionReason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`w-10 h-10 ${
                            isCompleted ? 'bg-green-100' : 
                            isSubmitted ? 'bg-blue-100' :
                            isRejected ? 'bg-red-100' :
                            'bg-blue-100'
                          } rounded-full flex items-center justify-center text-xl`}>
                            {task.icon}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {tasks.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <p>暂无任务</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 功能入口 */}
        <div className="relative z-10 px-6 mb-24">
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2 drop-shadow-md">
            <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">🚀</span>
            星际基地
          </h2>
          
          <FeatureGrid 
            completedTasksCount={completedTasks.length} 
            earnedMedalsCount={earnedMedals.length}
            onNavigate={handleNavigate}
          />

          {/* 最近获得徽章展示 */}
          <div className="mt-6 glass rounded-2xl p-4">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <span>🎖️</span> 最近获得
            </h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {earnedMedals.map((medal) => (
                <div key={medal.id} className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 border-white transform hover:scale-110 transition-transform cursor-pointer relative">
                  {medal.icon}
                </div>
              ))}
              {[...Array(Math.max(0, 4 - earnedMedals.length))].map((_, i) => (
                <div key={`empty-${i}`} className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 border-white grayscale opacity-50">
                  🔒
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 任务详情弹窗 */}
        <Modal
          isOpen={!!showTaskDetail && !!selectedTask}
          onClose={() => setShowTaskDetail(null)}
          showCloseButton={false}
          width={500}
          footer={
            selectedTask?.status === "pending" || selectedTask?.status === "rejected" ? (
              <button 
                className="w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl"
                onClick={() => openSubmitModal(selectedTask!)}
              >
                {selectedTask?.status === "rejected" ? "💪 重新提交" : "🚀 开始任务"}
              </button>
            ) : (
              <button 
                className="w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-slate-700 to-slate-900 shadow-xl"
                onClick={() => setShowTaskDetail(null)}
              >
                知道啦
              </button>
            )
          }
        >
          {selectedTask && (
            <>
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

              {selectedTask.imageUrl || selectedTask.description || selectedTask.requirePhoto ? (
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-5 rounded-2xl mb-4">
                  {selectedTask.imageUrl ? (
                    <>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">任务图片</h4>
                      <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
                        <img src={selectedTask.imageUrl} alt="Task proof" className="w-full h-full object-cover" />
                      </div>
                    </>
                  ) : null}

                  {selectedTask.description ? (
                    <>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">任务描述</h4>
                      <p className="text-gray-700 font-medium leading-relaxed">
                        {selectedTask.description || "快去完成这个任务吧！"}
                      </p>
                    </>
                  ) : null}

                  {selectedTask.requirePhoto && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl">
                      <span className="text-amber-500">📸</span>
                      <span className="text-sm font-bold text-amber-600">需要上传照片才能完成</span>
                    </div>
                  )}
                </div>
              ) : null}

              {(selectedTask.status === "approved" ||
                selectedTask.status === "submitted" ||
                selectedTask.status === "rejected") && (
                <div className="mb-6">
                  <div>
                    {(selectedTask.status === "approved" || selectedTask.status === "rejected") &&
                      selectedTask.photoUrl && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl mb-4">
                          <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider mb-2">
                            📸 提交的照片
                          </h4>
                          <div className="relative aspect-video rounded-xl overflow-hidden">
                            <img src={selectedTask.photoUrl} alt="Task proof" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl">
                      <h4 className="text-xs font-black text-green-400 uppercase tracking-wider mb-2">
                        {selectedTask.status === "approved"
                          ? "✅ 审核通过"
                          : selectedTask.status === "rejected"
                            ? "❌ 已拒绝"
                            : "⏳ 审核中"}
                      </h4>
                      <div className="space-y-2">
                        {selectedTask.submittedAt && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">提交时间</span>
                            <span className="text-sm font-bold text-gray-700">
                              {new Date(selectedTask.submittedAt).toLocaleString("zh-CN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        {selectedTask.status === "approved" && selectedTask.approvedAt && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">审核时间</span>
                            <span className="text-sm font-bold text-green-600">
                              {new Date(selectedTask.approvedAt).toLocaleString("zh-CN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        {selectedTask.rejectionReason && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">审核意见</span>
                            <span className="text-sm font-bold">{selectedTask.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Modal>

        {/* 提交任务弹窗 */}
        <Modal
          isOpen={!!showSubmitModal && !!selectedTask}
          onClose={() => { setShowSubmitModal(false); setPhotoPreview(""); }}
          title=""
          width={500}
          footer={
            <div className="flex gap-3 w-full">
              <button 
                className="flex-1 py-4 !rounded-2xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 border-none rounded-2xl"
                onClick={() => { setShowSubmitModal(false); setPhotoPreview(""); }}
              >
                取消
              </button>
              <button 
                className="flex-1 py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl hover:shadow-2xl hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmitTask}
                disabled={submitting || (selectedTask?.requirePhoto && !photoFile)}
              >
                {submitting ? "提交中..." : "提交审核"}
              </button>
            </div>
          }
        >
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15, delay: 0.1 }}
              className="w-28 h-28 bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 rounded-[2.5rem] flex items-center justify-center text-7xl mx-auto shadow-inner mb-4"
            >
              {selectedTask?.icon}
            </motion.div>
            <h3 className="text-2xl font-black text-gray-800">{selectedTask?.name}</h3>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-300 to-orange-400 text-white rounded-full mt-4 font-black shadow-lg"
            >
              <span>⚡</span>
              <span>+{selectedTask?.points} 积分</span>
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
              onClick={() => {
                fileInputRef.current && (fileInputRef.current.value = '');
                fileInputRef.current?.click();
              }}
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
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center"
                  >
                    <span className="text-4xl">📸</span>
                  </motion.div>
                  <div className="text-center">
                    <p className="font-black text-gray-700 text-lg">上传任务照片</p>
                    <p className="text-sm mt-1 text-gray-500">{selectedTask?.requirePhoto ? "⚠️ 必须上传照片" : "✨ 上传更容易通过"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* 家长模式弹窗 */}
        <Modal
          isOpen={showParentModal}
          onClose={() => setShowParentModal(false)}
          title="家长验证"
          width={400}
          footer={
            <button className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors">
              进入家长中心
            </button>
          }
        >
          <p className="text-gray-600 text-sm mb-4">请输入家长密码查看详细报告</p>
          <input type="password" placeholder="••••" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </Modal>
      </div>
    </>
  );
}
