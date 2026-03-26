'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Image } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
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

interface RewardSummary {
  _id: string;
  type: string;
  isActive?: boolean;
  stock?: number;
  expiresAt?: string | null;
}

export default function ChildHome() {
  const { currentUser } = useApp();
  const router = useRouter();
  const toast = useToast();

  const buildTaskListUrl = useCallback((status: string) => {
    const today = dayjs();
    const params = new URLSearchParams({
      status,
      startDate: today.startOf('day').format('YYYY-MM-DD'),
      endDate: today.endOf('day').format('YYYY-MM-DD'),
    });
    return `/child/task?${params.toString()}`;
  }, []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recallingTaskId, setRecallingTaskId] = useState<string | null>(null);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary[]>([]);

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
        `/api/tasks?deadlineFrom=${todayStr}`,
      );
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('获取任务失败:', error);
    }
  }, [currentUser?.token]);

  const fetchRewardSummary = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const data = await request("/api/rewards", {
        params: {
          isActive: true,
          page: 1,
          limit: 20,
        },
      });
      if (data.success) {
        setRewardSummary(data.rewards || []);
      }
    } catch (error) {
      console.error('获取奖励失败:', error);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    fetchTasks();
    fetchRewardSummary();

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
  }, [fetchRewardSummary, fetchTasks]);

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

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'approved'),
    [tasks],
  );
  const privilegeRewards = useMemo(
    () => rewardSummary.filter((reward) => reward.type === "privilege" && reward.isActive !== false),
    [rewardSummary],
  );
  const urgentPrivilegeRewards = useMemo(
    () =>
      privilegeRewards.filter((reward) => {
        if (!reward.expiresAt) return false;
        const target = dayjs(reward.expiresAt);
        const diffDays = target.startOf("day").diff(dayjs().startOf("day"), "day");
        return diffDays >= 0 && diffDays <= 3;
      }),
    [privilegeRewards],
  );
  const totalTasks = tasks.length;
  const completedTaskCount = completedTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0;
  const { nowValue, todayStartValue, todayEndValue } = useMemo(() => {
    const now = dayjs();
    return {
      nowValue: now.valueOf(),
      todayStartValue: now.startOf('day').valueOf(),
      todayEndValue: now.endOf('day').valueOf(),
    };
  }, []);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const startDate = task.startDate ? dayjs(task.startDate) : null;
        const deadline = task.deadline ? dayjs(task.deadline) : null;
        const isCompletedToday =
          task.status === 'approved' &&
          !!deadline &&
          deadline.valueOf() >= todayStartValue &&
          deadline.valueOf() <= todayEndValue;
        const isStartedAndUncompleted =
          (!startDate || startDate.valueOf() <= nowValue) &&
          task.status !== 'approved';
        const isFutureToday =
          !!startDate &&
          startDate.valueOf() > nowValue &&
          startDate.valueOf() <= todayEndValue;

        return isCompletedToday || isStartedAndUncompleted || isFutureToday;
      })
      .sort((a, b) => {
        const aStart = a.startDate ? dayjs(a.startDate).valueOf() : 0;
        const bStart = b.startDate ? dayjs(b.startDate).valueOf() : 0;
        return aStart - bStart;
      });
  }, [nowValue, tasks, todayEndValue, todayStartValue]);

  const pendingVisibleCount = visibleTasks.filter((t) => t.status !== 'approved').length;
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
          <div className='glass rounded-3xl p-4 shadow-2xl relative overflow-hidden float-anim'>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='text-xl font-bold flex items-center gap-2'>
                <span className='text-2xl'>🚀</span>
                今日任务进度
              </h2>
              <span className='text-sm text-gray-300'>
                {dayjs().format('M月D日 dddd')}
              </span>
            </div>

            <div className='grid grid-cols-3 gap-3 items-center'>
              {/* 进度环 */}
              <div className='col-span-1 flex flex-col items-center justify-center'>
                <div className='relative w-20 h-20'>
                  <svg className='w-full h-full transform -rotate-90'>
                    <circle cx='40' cy='40' r='34' stroke='rgba(255,255,255,0.1)' strokeWidth='7' fill='none'></circle>
                    <circle
                      cx='40'
                      cy='40'
                      r='34'
                      stroke='#10b981'
                      strokeWidth='7'
                      fill='none'
                      strokeDasharray='213.6'
                      strokeDashoffset={213.6 - (completionRate / 100) * 213.6}
                      strokeLinecap='round'
                      className='progress-ring'
                    ></circle>
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center flex-col'>
                    <span className='text-xl font-bold leading-none'>
                      {completionRate}%
                    </span>
                    <span className='text-xs text-gray-400'>完成度</span>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className='col-span-2 flex flex-col gap-2'>
                <div className='flex gap-2 flex-wrap'>
                  <div
                    className='bg-white/5 rounded-xl px-3 py-2 flex-1 min-w-[86px] text-center cursor-pointer hover:bg-white/10 transition-colors'
                    onClick={() => router.push(buildTaskListUrl('all'))}
                  >
                    <div className='text-lg font-bold text-cyan-300 leading-none'>{totalTasks}</div>
                    <div className='text-[11px] text-gray-400 mt-1'>总任务</div>
                  </div>
                  <div
                    className='bg-white/5 rounded-xl px-3 py-2 flex-1 min-w-[86px] text-center cursor-pointer hover:bg-white/10 transition-colors'
                    onClick={() => router.push(buildTaskListUrl('approved'))}
                  >
                    <div className='text-lg font-bold text-blue-400 leading-none'>{completedTaskCount}</div>
                    <div className='text-[11px] text-gray-400 mt-1'>已完成</div>
                  </div>
                  <div
                    className='bg-white/5 rounded-xl px-3 py-2 flex-1 min-w-[86px] text-center cursor-pointer hover:bg-white/10 transition-colors'
                    onClick={() => router.push(buildTaskListUrl('pending'))}
                  >
                    <div className='text-lg font-bold text-orange-400 leading-none'>{pendingVisibleCount}</div>
                    <div className='text-[11px] text-gray-400 mt-1'>待完成</div>
                  </div>
                </div>
                <div className='bg-white/5 rounded-xl px-3 py-2 text-center'>
                  <div className='flex items-center justify-center gap-2 text-sm'>
                    <span className='text-yellow-400 text-lg'>💎</span>
                    <span>星际积分</span>
                    <strong className='text-yellow-400'>{displayPoints.toLocaleString()}</strong>
                  </div>
                  <div className='mt-1 text-[11px] text-gray-400'>
                    完成进度 {completedTaskCount}/{totalTasks}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 进行中的任务时间轴 */}
        <div className='relative z-10 px-6 mb-4'>
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
            {visibleTasks.map((task, index) => {
              const isPending = task.status === 'pending';
              const isSubmitted = task.status === 'submitted';
              const isRejected = task.status === 'rejected';
              const isCompleted = task.status === 'approved';
              const startDate = task.startDate ? dayjs(task.startDate) : null;
              const deadline = task.deadline ? dayjs(task.deadline) : null;
              const isFutureToday =
                !!startDate &&
                startDate.valueOf() > nowValue &&
                startDate.valueOf() <= todayEndValue;
              const isCompletedToday =
                isCompleted &&
                !!deadline &&
                deadline.valueOf() >= todayStartValue &&
                deadline.valueOf() <= todayEndValue;
              const isDisabled = isFutureToday;
              const stateLabel = isCompletedToday
                ? '今日已完成'
                : isFutureToday
                  ? '未开始'
                  : isSubmitted
                    ? '审核中'
                    : isRejected
                      ? '需修改'
                      : '进行中';

              return (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`task-card glass rounded-2xl p-3 flex items-center gap-3 ${isDisabled ? 'opacity-60' : 'cursor-pointer'}`}
                  id={`task-${task._id}`}
                  onClick={() => {
                    if (isDisabled) return;
                    if (task.status === 'pending' || task.status === 'rejected') {
                      openSubmitModal(task);
                    } else {
                      openTaskDetail(task);
                    }
                  }}
                >
                  <div className='relative'>
                    <div className='w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl'>
                      {task.icon}
                    </div>
                    {isPending && !isDisabled && (
                      <div className='absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-gray-900 animate-pulse'></div>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h3 className={`font-bold text-base ${isRejected ? 'text-red-400' : 'text-white'}`}>
                        {task.name}
                      </h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                        isCompletedToday
                          ? 'bg-green-500/20 text-green-300'
                          : isFutureToday
                            ? 'bg-gray-500/20 text-gray-300'
                            : isRejected
                              ? 'bg-red-500/20 text-red-300'
                              : isSubmitted
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {stateLabel}
                      </span>
                    </div>
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400'>
                      <span className='flex items-center gap-1'>
                        <span>⏰</span>
                        <span>{task.startDate ? `${dayjs(task.startDate).format('M/D HH:mm')} 开始` : '无开始时间'}</span>
                      </span>
                      {task.deadline && (
                        <span className='flex items-center gap-1'>
                          <span>🏁</span>
                          <span>{dayjs(task.deadline).format('M/D HH:mm')}</span>
                        </span>
                      )}
                      <span className='flex items-center gap-1 text-yellow-400'>
                        <span>💎</span>
                        <span>+{task.points}分</span>
                      </span>
                    </div>
                  </div>

                  {isDisabled ? (
                    <button
                      disabled
                      className='complete-btn bg-white/10 text-white/40 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 cursor-not-allowed'
                    >
                      <span>未开始</span>
                    </button>
                  ) : isPending || isRejected ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSubmitModal(task);
                      }}
                      className='complete-btn bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors'
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
                      className='complete-btn bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50'
                    >
                      <span>{recallingTaskId === task._id ? '撤回中...' : '撤回'}</span>
                    </button>
                  ) : isCompletedToday ? (
                    <button
                      disabled
                      className='complete-btn bg-green-500/15 text-green-300 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 cursor-default'
                    >
                      <span>已完成</span>
                    </button>
                  ) : null}
                </motion.div>
              );
            })}

            {visibleTasks.length === 0 && (
              <div className='text-center py-8 text-white/60 glass rounded-2xl'>
                <div className='text-4xl mb-2'>🎉</div>
                <p>太棒了！今天的任务都完成了</p>
              </div>
            )}
          </div>
        </div>

        {/* 星际基地功能区 */}
        <div className='relative z-10 px-6 mb-6'>
          {privilegeRewards.length > 0 && (
            <div
              onClick={() => handleNavigate('/child/store?category=privilege')}
              className='relative mb-5 overflow-hidden rounded-[30px] border border-white/20 bg-[linear-gradient(135deg,#5b21b6_0%,#a21caf_42%,#f59e0b_100%)] p-6 text-white shadow-[0_24px_60px_rgba(91,33,182,0.38)] cursor-pointer group'
            >
              <div className='absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl transition-transform duration-500 group-hover:scale-125' />
              <div className='absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%)]' />
              <div className='relative z-10 flex items-center justify-between gap-4'>
                <div className='min-w-0'>
                  <div className='inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-[11px] font-black tracking-[0.22em] backdrop-blur-sm'>
                    <Sparkles size={12} />
                    特权专区
                  </div>
                  <h2 className='mt-3 text-[1.7rem] font-black tracking-tight'>
                    {urgentPrivilegeRewards.length > 0 ? "有特权快要截止了" : "今天有特别权限可以兑换"}
                  </h2>
                  <p className='mt-2 max-w-xl text-sm leading-6 text-white/82'>
                    当前有 {privilegeRewards.length} 个特权奖励正在开放，{urgentPrivilegeRewards.length > 0 ? `其中 ${urgentPrivilegeRewards.length} 个在 3 天内截止` : "点进去看看有没有你最想要的那一个。"}
                  </p>
                  <div className='mt-4 flex flex-wrap items-center gap-3'>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate('/child/store?category=privilege');
                      }}
                      className='inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-violet-700 shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5'
                    >
                      去看看特权
                      <ArrowRight size={16} />
                    </button>
                    {urgentPrivilegeRewards.length > 0 && (
                      <span className='rounded-full bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur-sm'>
                        先看即将截止的奖励
                      </span>
                    )}
                    {!urgentPrivilegeRewards.length && (
                      <span className='rounded-full bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur-sm'>
                        现在正适合兑换
                      </span>
                    )}
                  </div>
                </div>
                <div className='flex shrink-0 items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm'>
                  <div className='text-right'>
                    <div className='text-xs text-white/72'>{urgentPrivilegeRewards.length > 0 ? "快截止" : "特权奖励"}</div>
                    <div className='text-3xl font-black leading-none'>{privilegeRewards.length}</div>
                  </div>
                  <ArrowRight size={18} />
                </div>
              </div>
              {urgentPrivilegeRewards.length > 0 && (
                <div className='relative z-10 mt-4 flex flex-wrap gap-2'>
                  {urgentPrivilegeRewards.slice(0, 3).map((reward) => (
                    <span key={reward._id} className='rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm'>
                      {dayjs(reward.expiresAt).format("MM-DD")} 截止
                    </span>
                  ))}
                  {urgentPrivilegeRewards.length > 3 && (
                    <span className='rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm'>
                      还有 {urgentPrivilegeRewards.length - 3} 个
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <h2 className='text-xl font-bold text-white flex items-center gap-2 mb-3'>
            <span className='text-2xl'>🌟</span>
            星际基地
          </h2>

          <FeatureGrid
            completedTasksCount={completedTaskCount}
            privilegedCount={privilegeRewards.length}
            urgentPrivilegeRewards={urgentPrivilegeRewards}
            onNavigate={handleNavigate}
          />
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
