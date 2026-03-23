'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Image } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import FeatureGrid from './components/FeatureGrid';
import { compressImage } from '@/utils/image';
import request from '@/utils/request';
import dayjs from 'dayjs';

interface AuditRecord {
  _id?: string;
  submittedAt: string;
  photoUrl?: string;
  submitNote?: string;
  auditedAt?: string;
  status?: 'approved' | 'rejected';
  auditNote?: string;
  auditedBy?: string;
}

interface Task {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  points: number;
  status: string;
  requirePhoto?: boolean;
  startDate?: string;
  deadline?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  imageUrl?: string;
  photoUrl?: string;
  auditHistory?: AuditRecord[];
}

export default function ChildHome() {
  const { currentUser } = useApp();
  const router = useRouter();
  const toast = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recallingTaskId, setRecallingTaskId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPoints = currentUser?.availablePoints || 0;
  useEffect(() => {
    const duration = 1500;
    const steps = 20;
    const increment = totalPoints / steps;
    let current = 0;

    const timer = window.setInterval(() => {
      current += increment;
      if (current >= totalPoints) {
        setDisplayPoints(totalPoints);
        window.clearInterval(timer);
      } else {
        setDisplayPoints(Math.floor(current));
      }
    }, duration / steps);

    return () => {
      window.clearInterval(timer);
    };
  }, [totalPoints]);

  const fetchTasks = useCallback(async () => {
    if (!currentUser?.token) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    try {
      const data = await request(
        `/api/tasks?inProgress=true&deadlineFrom=${todayStr}`,
      );
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('获取任务失败:', error);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    fetchTasks();

    // 生成星星背景
    const starsContainer = document.getElementById('stars-bg');
    if (starsContainer) {
      starsContainer.innerHTML = '';
      for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.opacity = Math.random().toString();
        starsContainer.appendChild(star);
      }
    }
  }, [fetchTasks]);

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
    let photoUrl = '';

    if (photoFile) {
      const formData = new FormData();
      formData.append('file', photoFile);
      try {
        const uploadData = await request('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadData.success) photoUrl = uploadData.url;
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    try {
      const data = await request('/api/tasks', {
        method: 'PUT',
        body: {
          taskId: selectedTask._id,
          status: 'submitted',
          photoUrl,
        },
      });

      if (data.success) {
        setShowSubmitModal(false);
        setPhotoFile(null);
        setPhotoPreview('');
        setSelectedTask(null);
        setShowTaskDetail(null);
        fetchTasks();
        toast.success('提交成功！等待家长审核~');
      } else {
        toast.error('提交失败，请重试');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecallTask = async (task: Task) => {
    if (!task._id || !currentUser?.token) return;

    setRecallingTaskId(task._id);
    try {
      const data = await request('/api/tasks', {
        method: 'PUT',
        body: {
          taskId: task._id,
          status: 'pending',
        },
      });

      if (data.success) {
        setShowTaskDetail(null);
        fetchTasks();
        toast.success('已撤回任务，可以重新提交~');
      }
    } catch (error) {
      console.error('Recall error:', error);
      toast.error('撤回失败，请重试');
    } finally {
      setRecallingTaskId(null);
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

  const filteredTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'submitted'),
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'approved'),
    [tasks],
  );
  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <>
      <style jsx global>{`
        * {
          font-family: 'Nunito', sans-serif;
        }

        /* 星空背景 */
        .stars-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          animation: twinkle 3s infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        /* 浮动动画 */
        .float-anim {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        /* 卡片悬停效果 */
        .task-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .task-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          background: rgba(255, 255, 255, 0.15);
        }

        /* 进度环动画 */
        .progress-ring {
          transform: rotate(-90deg);
          transition: stroke-dashoffset 0.5s ease;
        }

        /* 徽章发光效果 */
        .badge-glow {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
          animation: pulse-glow 2s infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
          50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.8); }
        }

        /* 完成任务动画 */
        .complete-btn {
          transition: all 0.3s ease;
        }

        .complete-btn:active {
          transform: scale(0.95);
        }

        /* 玻璃拟态效果 - 深色主题 */
        .glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .glass-strong {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .card-3d {
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }

        .card-3d:hover {
          transform: translateY(-5px) rotateX(5deg);
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
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
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1.5);
            opacity: 0;
          }
        }

        .point-float {
          position: absolute;
          color: #fbbf24;
          font-weight: 900;
          font-size: 1.5rem;
          pointer-events: none;
          animation: floatUp 1.5s ease-out forwards;
          z-index: 100;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        @keyframes celebrate {
          0% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.2) rotate(-5deg);
          }
          50% {
            transform: scale(1) rotate(5deg);
          }
          75% {
            transform: scale(1.1) rotate(-3deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        .celebrate-anim {
          animation: celebrate 0.6s ease-in-out;
        }

        .progress-glow {
          background: linear-gradient(
            90deg,
            #fbbf24 0%,
            #f59e0b 50%,
            #fbbf24 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .timeline-line {
          position: absolute;
          left: 24px;
          top: 40px;
          bottom: 0;
          width: 4px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%);
          border-radius: 2px;
        }

        @keyframes badge-shine {
          0% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.3);
          }
          100% {
            filter: brightness(1);
          }
        }

        .badge-shine {
          animation: badge-shine 2s infinite;
        }

        @keyframes blink {
          0%,
          90%,
          100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
        }

        .character-eye {
          animation: blink 4s infinite;
        }

        /* 隐藏滚动条但保持功能 */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* 任务完成划线动画 */
        .strikethrough {
          position: relative;
          display: inline-block;
        }

        .strikethrough::after {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 0;
          height: 2px;
          background: #10b981;
          transition: width 0.3s ease;
        }

        .strikethrough.active::after {
          width: 100%;
        }

        /* 积分增加动画 */
        @keyframes points-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-30px) scale(1.5); opacity: 0; }
        }

        .points-animation {
          animation: points-up 1s ease-out forwards;
        }
      `}</style>

      <div className='relative min-h-screen text-white'>
        {/* 星空背景 */}
        <div className='stars-bg' id='stars-bg'></div>

        {/* 主内容区 - 不包含Header和用户信息，由ChildLayout提供 */}
        <div className='relative z-10 px-6 pt-4 pb-6'>
          {/* 今日概览卡片 - 包含进度环和统计 */}
          <div className='glass rounded-3xl p-6 shadow-2xl relative overflow-hidden float-anim'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-xl font-bold flex items-center gap-2'>
                <span className='text-2xl'>🚀</span>
                今日任务进度
              </h2>
              <span className='text-sm text-gray-300'>
                {dayjs().format('M月D日 dddd')}
              </span>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              {/* 进度环 */}
              <div className='col-span-1 flex flex-col items-center justify-center'>
                <div className='relative w-24 h-24'>
                  <svg className='w-full h-full transform -rotate-90'>
                    <circle cx='48' cy='48' r='40' stroke='rgba(255,255,255,0.1)' strokeWidth='8' fill='none'></circle>
                    <circle
                      cx='48'
                      cy='48'
                      r='40'
                      stroke='#10b981'
                      strokeWidth='8'
                      fill='none'
                      strokeDasharray='251.2'
                      strokeDashoffset={251.2 - (completedTasks.length / (filteredTasks.length + completedTasks.length || 1)) * 251.2}
                      strokeLinecap='round'
                      className='progress-ring'
                    ></circle>
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center flex-col'>
                    <span className='text-2xl font-bold'>
                      {Math.round((completedTasks.length / (filteredTasks.length + completedTasks.length || 1)) * 100)}%
                    </span>
                    <span className='text-xs text-gray-400'>完成度</span>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className='col-span-2 grid grid-cols-2 gap-3'>
                <div
                  className='bg-white/5 rounded-2xl p-4 text-center cursor-pointer hover:bg-white/10 transition-colors'
                  onClick={() => router.push('/child/task?status=approved')}
                >
                  <div className='text-3xl mb-1'>📋</div>
                  <div className='text-2xl font-bold text-blue-400'>{completedTasks.length}</div>
                  <div className='text-xs text-gray-400'>已完成</div>
                </div>
                <div
                  className='bg-white/5 rounded-2xl p-4 text-center cursor-pointer hover:bg-white/10 transition-colors'
                  onClick={() => {
                    router.push(
                      `/child/task?status=pending`,
                    );
                  }}
                >
                  <div className='text-3xl mb-1'>⏳</div>
                  <div className='text-2xl font-bold text-orange-400'>{filteredTasks.length}</div>
                  <div className='text-xs text-gray-400'>待完成</div>
                </div>
                <div className='bg-white/5 rounded-2xl p-4 text-center col-span-2'>
                  <div className='flex items-center justify-center gap-2'>
                    <span className='text-yellow-400 text-xl'>💎</span>
                    <span className='text-lg'>星际积分 <strong className='text-yellow-400'>{displayPoints.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 进行中的任务时间轴 */}
        <div className='relative z-10 px-6 mb-6'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-bold text-white flex items-center gap-2'>
              <span className='text-2xl'>📜</span>
              探险任务
            </h2>
            <button
              className='text-sm text-blue-400 hover:text-blue-300 transition flex items-center gap-1'
              onClick={() => router.push('/child/task')}
            >
              查看全部
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M9 5l7 7-7 7'></path></svg>
            </button>
          </div>

          <div className='space-y-4'>
            {filteredTasks.map((task, index) => {
              const isPending = task.status === 'pending';
              const isSubmitted = task.status === 'submitted';
              const isRejected = task.status === 'rejected';

              return (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className='task-card glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer'
                  id={`task-${task._id}`}
                  onClick={() => {
                    if (task.status === 'pending' || task.status === 'rejected') {
                      openSubmitModal(task);
                    } else {
                      openTaskDetail(task);
                    }
                  }}
                >
                  <div className='relative'>
                    <div className='w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl'>
                      {task.icon}
                    </div>
                    {isPending && (
                      <div className='absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-gray-900 animate-pulse'></div>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h3 className={`font-bold text-lg ${isRejected ? 'text-red-400' : 'text-white'}`}>
                        {task.name}
                      </h3>
                      {isPending && (
                        <span className='text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full'>
                          进行中
                        </span>
                      )}
                      {isSubmitted && (
                        <span className='text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full'>
                          审核中
                        </span>
                      )}
                      {isRejected && (
                        <span className='text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full'>
                          需修改
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-3 text-sm text-gray-400'>
                      <span className='flex items-center gap-1'>
                        <span>⏰</span>
                        <span>
                          截止{' '}
                          {task.deadline &&
                            (() => {
                              const deadline = dayjs(task.deadline);
                              const today = dayjs().startOf('day');
                              const tomorrow = today.add(1, 'day');
                              const isToday =
                                deadline.isAfter(today) &&
                                deadline.isBefore(tomorrow);
                              const timeStr = deadline.format('HH:mm');
                              const dateStr = !isToday
                                ? deadline.format('M月D日') + ' '
                                : '';
                              return `${dateStr}${timeStr}`;
                            })()}
                        </span>
                      </span>
                      <span className='flex items-center gap-1 text-yellow-400'>
                        <span>💎</span>
                        <span>+{task.points}分</span>
                      </span>
                    </div>
                  </div>

                  {isPending || isRejected ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSubmitModal(task);
                      }}
                      className='complete-btn bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors'
                    >
                      <span>完成</span>
                    </button>
                  ) : isSubmitted ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecallTask(task);
                      }}
                      disabled={recallingTaskId === task._id}
                      className='complete-btn bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50'
                    >
                      <span>{recallingTaskId === task._id ? '撤回中...' : '撤回'}</span>
                    </button>
                  ) : null}
                </motion.div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className='text-center py-8 text-white/60 glass rounded-2xl'>
                <div className='text-4xl mb-2'>🎉</div>
                <p>太棒了！今天的任务都完成了</p>
              </div>
            )}
          </div>
        </div>

        {/* 星际基地功能区 */}
        <div className='relative z-10 px-6 mb-6'>
          <h2 className='text-xl font-bold text-white flex items-center gap-2 mb-4'>
            <span className='text-2xl'>🌟</span>
            星际基地
          </h2>

          <div className='grid grid-cols-2 gap-4'>
            {/* 星际商城 */}
            <div
              onClick={() => handleNavigate('/child/store')}
              className='relative rounded-2xl p-5 overflow-hidden cursor-pointer group'
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)' }}
            >
              <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-500'></div>
              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm'>
                    🎁
                  </div>
                  <span className='bg-white/20 px-2 py-1 rounded-full text-xs backdrop-blur-sm'>NEW</span>
                </div>
                <h3 className='font-bold text-lg mb-1 text-white'>星际商城</h3>
                <p className='text-sm text-white/80'>兑换喜欢的奖励</p>
              </div>
            </div>

            {/* 探索日志 */}
            <div
              onClick={() => handleNavigate('/child/task?filter=thisWeek')}
              className='relative rounded-2xl p-5 overflow-hidden cursor-pointer group'
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)' }}
            >
              <div className='absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl group-hover:scale-150 transition-transform duration-500'></div>
              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm'>
                    📔
                  </div>
                  <span className='bg-green-400/20 text-green-300 px-2 py-1 rounded-full text-xs backdrop-blur-sm'>+{completedTasks.length}</span>
                </div>
                <h3 className='font-bold text-lg mb-1 text-white'>探索日志</h3>
                <p className='text-sm text-white/80'>本周完成 {completedTasks.length} 项任务</p>
              </div>
            </div>

            {/* 我的钱包 */}
            <div
              onClick={() => handleNavigate('/child/wallet')}
              className='relative rounded-2xl p-5 overflow-hidden cursor-pointer group col-span-2'
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)' }}
            >
              <div className='absolute top-1/2 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-500'></div>
              <div className='relative z-10 flex items-center justify-between'>
                <div>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm'>
                      💰
                    </div>
                    <div>
                      <h3 className='font-bold text-lg text-white'>我的钱包</h3>
                      <p className='text-sm text-white/80'>查看积分明细</p>
                    </div>
                  </div>
                  <div className='flex gap-4 mt-3'>
                    <div className='bg-white/10 rounded-lg px-3 py-1.5 text-sm'>
                      <span className='text-white/60'>可用积分:</span>
                      <span className='text-yellow-300 font-bold ml-1'>{displayPoints.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <svg className='w-8 h-8 text-white/40 group-hover:translate-x-2 transition-transform' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M9 5l7 7-7 7'></path></svg>
              </div>
            </div>
          </div>
        </div>



        {/* 任务详情弹窗 */}
        <Modal
          isOpen={!!showTaskDetail && !!selectedTask}
          onClose={() => setShowTaskDetail(null)}
          showCloseButton={false}
          width={500}
          className='!bg-white !backdrop-blur-xl !border-gray-200'
          footer={
            selectedTask?.status === 'pending' ||
              selectedTask?.status === 'rejected' ? (
              <button
                className='w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shadow-xl hover:shadow-blue-500/25 transition-shadow'
                onClick={() => openSubmitModal(selectedTask!)}
              >
                {selectedTask?.status === 'rejected'
                  ? '💪 重新提交'
                  : '🚀 开始任务'}
              </button>
            ) : selectedTask?.status === 'submitted' ? (
              <button
                className='w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-xl hover:shadow-orange-500/25 transition-shadow'
                onClick={() => handleRecallTask(selectedTask!)}
              >
                🔙 撤回修改
              </button>
            ) : (
              <button
                className='w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-slate-600 to-slate-800 shadow-xl'
                onClick={() => setShowTaskDetail(null)}
              >
                知道啦
              </button>
            )
          }
        >
          {selectedTask && (
            <>
              {/* 任务基本信息 - 固定在顶部 */}
              <div className='flex items-center gap-5 mb-6'>
                <div className='w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner border border-blue-200'>
                  {selectedTask.icon}
                </div>
                <div className='flex-1'>
                  <h3 className='text-2xl font-black text-gray-800 leading-tight'>
                    {selectedTask.name}
                  </h3>
                  <div className='flex items-center gap-2 mt-2 flex-wrap'>
                    <span className='text-amber-500 font-black text-lg'>
                      +{selectedTask.points}
                    </span>
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full font-black flex items-center gap-1 ${selectedTask.status === 'approved'
                          ? 'bg-green-100 text-green-600'
                          : selectedTask.status === 'submitted'
                            ? 'bg-blue-100 text-blue-600'
                            : selectedTask.status === 'rejected'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {selectedTask.status === 'approved'
                        ? '✓ 完成'
                        : selectedTask.status === 'submitted'
                          ? '⏳ 审核中'
                          : selectedTask.status === 'rejected'
                            ? '✏️ 需修改'
                            : '🔒 待完成'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 滚动区域 */}
              <div className='max-h-[45vh] overflow-y-auto custom-scrollbar pr-1 space-y-4'>
                {selectedTask.imageUrl ||
                  selectedTask.description ||
                  selectedTask.requirePhoto ? (
                  <div className='bg-gray-50 p-5 rounded-2xl border border-gray-200'>
                    {selectedTask.imageUrl ? (
                      <>
                        <h4 className='text-xs font-black text-gray-500 uppercase tracking-wider mb-2'>
                          任务图片
                        </h4>
                        <div className='relative aspect-video rounded-xl overflow-hidden mb-6'>
                          <Image
                            src={selectedTask.imageUrl}
                            alt='任务图片'
                            className='w-full h-full object-cover'
                            enableZoom={true}
                            zoomHint='点击查看大图'
                            containerClassName='w-full h-full'
                          />
                        </div>
                      </>
                    ) : null}

                    {selectedTask.description ? (
                      <>
                        <h4 className='text-xs font-black text-gray-500 uppercase tracking-wider mb-2'>
                          任务描述
                        </h4>
                        <p className='text-gray-700 font-medium leading-relaxed'>
                          {selectedTask.description || '快去完成这个任务吧！'}
                        </p>
                      </>
                    ) : null}

                    {selectedTask.requirePhoto && (
                      <div className='mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200'>
                        <span className='text-amber-500'>📸</span>
                        <span className='text-sm font-bold text-amber-600'>
                          需要上传照片才能完成
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}

                {(selectedTask.status === 'approved' ||
                  selectedTask.status === 'submitted' ||
                  selectedTask.status === 'rejected') && (
                    <div>
                      <div>
                        {(selectedTask.status === 'approved' ||
                          selectedTask.status === 'submitted' ||
                          selectedTask.status === 'rejected') &&
                          selectedTask.photoUrl && (
                            <div className='bg-blue-50 p-5 rounded-2xl mb-4 border border-blue-200'>
                              <h4 className='text-xs font-black text-blue-600 uppercase tracking-wider mb-2'>
                                📸 提交的照片
                              </h4>
                              <div className='relative aspect-video rounded-xl overflow-hidden'>
                                <Image
                                  src={selectedTask.photoUrl}
                                  alt='提交的照片'
                                  className='w-full h-full object-cover'
                                  enableZoom={true}
                                  zoomHint='点击查看大图'
                                  containerClassName='w-full h-full'
                                />
                              </div>
                            </div>
                          )}

                        <div className='bg-green-50 p-5 rounded-2xl border border-green-200'>
                          <h4 className='text-xs font-black text-green-600 uppercase tracking-wider mb-2'>
                            {selectedTask.status === 'approved'
                              ? '✅ 审核通过'
                              : selectedTask.status === 'rejected'
                                ? '❌ 已拒绝'
                                : '⏳ 审核中'}
                          </h4>
                          <div className='space-y-2'>
                            {selectedTask.submittedAt && (
                              <div className='flex justify-between items-center'>
                                <span className='text-sm text-gray-500'>
                                  提交时间
                                </span>
                                <span className='text-sm font-bold text-gray-800'>
                                  {dayjs(selectedTask.submittedAt).format(
                                    'M月D日 HH:mm',
                                  )}
                                </span>
                              </div>
                            )}
                            {selectedTask.status === 'approved' &&
                              selectedTask.approvedAt && (
                                <div className='flex justify-between items-center'>
                                  <span className='text-sm text-gray-500'>
                                    审核时间
                                  </span>
                                  <span className='text-sm font-bold text-green-600'>
                                    {dayjs(selectedTask.approvedAt).format(
                                      'M月D日 HH:mm',
                                    )}
                                  </span>
                                </div>
                              )}
                            {selectedTask.rejectionReason && (
                              <div className='flex justify-between items-center'>
                                <span className='text-sm text-gray-500'>
                                  审核意见
                                </span>
                                <span className='text-sm font-bold text-red-600'>
                                  {selectedTask.rejectionReason}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* 操作记录 */}
                {selectedTask.auditHistory &&
                  selectedTask.auditHistory.length > 0 && (
                    <div>
                      <div className='bg-gray-50 p-5 rounded-2xl border border-gray-200'>
                        <h4 className='text-xs font-black text-gray-500 uppercase tracking-wider mb-4'>
                          📋 操作记录 ({selectedTask.auditHistory.length})
                        </h4>
                        <div className='space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar'>
                          {selectedTask.auditHistory.map((record, index) => (
                            <div
                              key={record._id || index}
                              className={`relative pl-4 pb-3 ${index !== selectedTask.auditHistory!.length - 1 ? 'border-l-2 border-gray-200' : ''}`}
                            >
                              {/* 时间线节点 */}
                              <div
                                className={`absolute left-0 top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${record.status === 'approved'
                                    ? 'bg-green-500'
                                    : record.status === 'rejected'
                                      ? 'bg-red-500'
                                      : 'bg-blue-500'
                                  }`}
                                style={{ transform: 'translateX(-50%)' }}
                              />

                              <div className='ml-2'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <span className='text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full'>
                                    第{' '}
                                    {selectedTask.auditHistory!.length - index}{' '}
                                    次操作
                                  </span>
                                  {record.status === 'approved' ? (
                                    <span className='text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full'>
                                      通过
                                    </span>
                                  ) : record.status === 'rejected' ? (
                                    <span className='text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full'>
                                      驳回
                                    </span>
                                  ) : (
                                    <span className='text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full'>
                                      审核中
                                    </span>
                                  )}
                                </div>
                                <p className='text-xs text-gray-500 mb-1'>
                                  提交:{' '}
                                  {dayjs(record.submittedAt).format(
                                    'M月D日 HH:mm',
                                  )}
                                </p>
                                {record.auditedAt && (
                                  <p className='text-xs text-gray-500 mb-1'>
                                    审核:{' '}
                                    {dayjs(record.auditedAt).format(
                                      'M月D日 HH:mm',
                                    )}
                                  </p>
                                )}
                                {/* 提交的照片 */}
                                {record.photoUrl && (
                                  <div className='mt-2'>
                                    <p className='text-xs text-gray-500 mb-1'>
                                      提交的照片：
                                    </p>
                                    <div className='w-24 h-24 rounded-xl overflow-hidden border-2 border-blue-200 shadow-sm'>
                                      <Image
                                        src={record.photoUrl}
                                        alt={`第 ${index + 1} 次提交的照片`}
                                        className='w-full h-full object-cover'
                                        enableZoom={true}
                                        containerClassName='w-full h-full'
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 审核意见 */}
                                {record.auditNote && (
                                  <div className='mt-2 bg-white rounded-lg p-2 border border-gray-200'>
                                    <p className='text-xs text-gray-500 mb-1'>
                                      家长意见：
                                    </p>
                                    <p className='text-xs text-gray-700'>
                                      {record.auditNote}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
              {/* 滚动区域结束 */}
            </>
          )}
        </Modal>

        {/* 提交任务弹窗 */}
        <Modal
          isOpen={!!showSubmitModal && !!selectedTask}
          onClose={() => {
            setShowSubmitModal(false);
            setPhotoPreview('');
          }}
          title=''
          width={500}
          className='!bg-white !backdrop-blur-xl !border-gray-200'
          footer={
            <div className='flex gap-3 w-full'>
              <button
                className='flex-1 py-4 !rounded-2xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 border-none rounded-2xl transition-colors'
                onClick={() => {
                  setShowSubmitModal(false);
                  setPhotoPreview('');
                }}
              >
                取消
              </button>
              <button
                className='flex-1 py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shadow-xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow'
                onClick={handleSubmitTask}
                disabled={
                  submitting || (selectedTask?.requirePhoto && !photoFile)
                }
              >
                {submitting ? '提交中...' : '提交审核'}
              </button>
            </div>
          }
        >
          <div className='text-center mb-8'>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.1 }}
              className='w-28 h-28 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-[2.5rem] flex items-center justify-center text-7xl mx-auto shadow-inner mb-4 border border-blue-200'
            >
              {selectedTask?.icon}
            </motion.div>
            <h3 className='text-2xl font-black text-gray-800'>
              {selectedTask?.name}
            </h3>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full mt-4 font-black shadow-lg'
            >
              <span>⚡</span>
              <span>+{selectedTask?.points} 积分</span>
            </motion.div>
          </div>

          <div className='mb-8'>
            <input
              type='file'
              accept='image/*'
              ref={fileInputRef}
              className='hidden'
              onChange={handlePhotoSelect}
            />
            <div
              className='group relative border-4 border-dashed border-blue-300 rounded-[2rem] p-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all'
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                fileInputRef.current?.click();
              }}
            >
              {photoPreview ? (
                <div className='relative aspect-video rounded-2xl overflow-hidden'>
                  <Image
                    src={photoPreview}
                    alt='照片预览'
                    className='w-full h-full object-cover'
                    enableZoom={false}
                    containerClassName='w-full h-full'
                  />
                  <div className='absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'>
                    <span className='bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-bold text-gray-800'>
                      📷 更换照片
                    </span>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center gap-4 py-10'>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className='w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border border-blue-200'
                  >
                    <span className='text-4xl'>📸</span>
                  </motion.div>
                  <div className='text-center'>
                    <p className='font-black text-gray-800 text-lg'>
                      上传任务照片
                    </p>
                    <p className='text-sm mt-1 text-gray-500'>
                      {selectedTask?.requirePhoto
                        ? '⚠️ 必须上传照片'
                        : '✨ 上传更容易通过'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
