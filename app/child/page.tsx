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
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(2deg);
          }
        }

        .float-anim {
          animation: float 4s ease-in-out infinite;
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
          background: linear-gradient(to bottom, #e5e7eb 0%, #e5e7eb 100%);
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

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className='relative min-h-screen text-gray-800'>
        {/* 主内容区 - 不包含Header和用户信息，由ChildLayout提供 */}
        <div className='relative z-10 px-6 pt-4 pb-6'>
          {/* 主积分卡片 */}
          <div className='glass-strong rounded-3xl p-6 shadow-2xl relative overflow-hidden card-3d'>
            <div className='absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-300/30 to-orange-400/30 rounded-full blur-3xl -mr-10 -mt-10'></div>
            <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-2xl -ml-10 -mb-10'></div>

            <div className='relative z-10'>
              <div className='flex items-center justify-between mb-6'>
                {/* 左侧：星际能量和积分 */}
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-2xl'>💎</span>
                    <span className='text-gray-500 font-bold text-sm uppercase tracking-wider'>
                      星际能量
                    </span>
                  </div>
                  <div className='flex items-baseline gap-2'>
                    <span className='text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 drop-shadow-sm'>
                      {displayPoints.toLocaleString()}
                    </span>
                    <span className='text-2xl font-bold text-gray-400'>pts</span>
                  </div>
                </div>

                {/* 右侧：今日任务和已完成统计 */}
                <div className='flex flex-col gap-3'>
                  <div
                    className='bg-blue-50 rounded-xl px-4 py-2 text-center border-2 border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors min-w-[160px]'
                    onClick={() => {
                      router.push(
                        `/child/task?startDate=${dayjs().format(
                          'YYYY-MM-DD',
                        )}&endDate=${dayjs().format('YYYY-MM-DD')}`,
                      );
                    }}
                  >
                    <div className='text-lg font-black text-blue-600'>
                      {filteredTasks.length}
                    </div>
                    <div className='text-[10px] font-bold text-blue-400 uppercase'>
                      今日任务
                    </div>
                  </div>
                  <div
                    className='bg-green-50 rounded-xl px-4 py-2 text-center border-2 border-green-100 cursor-pointer hover:bg-green-100 transition-colors min-w-[160px]'
                    onClick={() => router.push('/child/task?status=approved')}
                  >
                    <div className='text-lg font-black text-green-600'>
                      {completedTasks.length}
                    </div>
                    <div className='text-[10px] font-bold text-green-400 uppercase'>
                      已完成
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 进行中的任务时间轴 */}
        <div className='relative z-10 px-6 mb-6'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-black text-white flex items-center gap-2 drop-shadow-md'>
              <span className='bg-white/20 p-2 rounded-xl backdrop-blur-sm'>
                🎯
              </span>
              进行中的任务
            </h2>
            <button
              className='text-white/80 text-sm font-bold hover:text-white transition-colors flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm'
              onClick={() => router.push('/child/task')}
            >
              查看全部 <span className='text-lg'>→</span>
            </button>
          </div>

          <div className='relative pl-2'>
            <div className='timeline-line'></div>
            <div className='space-y-4'>
              {filteredTasks.map((task, index) => {
                const isPending = task.status === 'pending';
                const isSubmitted = task.status === 'submitted';

                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className='relative flex items-start gap-4 group cursor-pointer'
                    id={`task-${task._id}`}
                    onClick={() => openTaskDetail(task)}
                  >
                    <div
                      className={`relative z-10 w-12 h-12 ${
                        isSubmitted ? 'bg-blue-500' : 'bg-gray-300'
                      } rounded-2xl flex items-center justify-center text-2xl shadow-lg border-4 border-white ${isPending ? 'pulse-ring' : ''}`}
                    >
                      {task.icon}
                    </div>
                    <div
                      className={`flex-1 ${
                        isSubmitted
                          ? 'glass rounded-2xl border-l-4 border-blue-400 opacity-75'
                          : 'glass-strong rounded-2xl border-l-4 border-blue-500 shadow-xl transform hover:scale-[1.02] transition-all'
                      }`}
                      style={{ padding: '16px' }}
                    >
                      <div className='flex justify-between items-start'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <h3 className='font-bold text-gray-800 text-lg'>
                              {task.name}
                            </h3>
                            {isPending && (
                              <span className='bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold'>
                                进行中
                              </span>
                            )}
                            {isSubmitted && (
                              <span className='bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold'>
                                审核中
                              </span>
                            )}
                          </div>
                          <p className='text-xs text-gray-500 flex items-center gap-1'>
                            <span>{task.icon}</span>{' '}
                            {isSubmitted ? '审核中' : '待完成'} • +{task.points}
                            分
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
                                return (
                                  <>
                                    {' '}
                                    • 截止 {dateStr}
                                    {timeStr}
                                  </>
                                );
                              })()}
                          </p>
                          {isPending && (
                            <div className='mt-2 flex gap-2'>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSubmitModal(task);
                                }}
                                className='bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-1'
                              >
                                <span>✓</span> 完成
                              </button>
                            </div>
                          )}
                          {isSubmitted && (
                            <div className='mt-2 flex gap-2'>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecallTask(task);
                                }}
                                disabled={recallingTaskId === task._id}
                                className='bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg hover:bg-amber-600 transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50'
                              >
                                <span>🔙</span>{' '}
                                {recallingTaskId === task._id
                                  ? '撤回中...'
                                  : '撤回修改'}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className='text-right'>
                          <div
                            className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl'
                          >
                            {task.icon}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className='text-center py-8 text-white/60'>
                  <p>暂无进行中的任务</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 功能入口 */}
        <div className='relative z-10 px-6 mb-24'>
          <h2 className='text-xl font-black text-white mb-4 flex items-center gap-2 drop-shadow-md'>
            <span className='bg-white/20 p-2 rounded-xl backdrop-blur-sm'>
              🚀
            </span>
            星际基地
          </h2>

          <FeatureGrid
            completedTasksCount={completedTasks.length}
            onNavigate={handleNavigate}
          />
        </div>

        {/* 任务详情弹窗 */}
        <Modal
          isOpen={!!showTaskDetail && !!selectedTask}
          onClose={() => setShowTaskDetail(null)}
          showCloseButton={false}
          width={500}
          footer={
            selectedTask?.status === 'pending' ||
            selectedTask?.status === 'rejected' ? (
              <button
                className='w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl'
                onClick={() => openSubmitModal(selectedTask!)}
              >
                {selectedTask?.status === 'rejected'
                  ? '💪 重新提交'
                  : '🚀 开始任务'}
              </button>
            ) : selectedTask?.status === 'submitted' ? (
              <button
                className='w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl'
                onClick={() => handleRecallTask(selectedTask!)}
              >
                🔙 撤回修改
              </button>
            ) : (
              <button
                className='w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-slate-700 to-slate-900 shadow-xl'
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
                <div className='w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-100 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner'>
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
                      className={`text-xs px-3 py-1.5 rounded-full font-black flex items-center gap-1 ${
                        selectedTask.status === 'approved'
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
                  <div className='bg-gradient-to-br from-slate-50 to-gray-100 p-5 rounded-2xl'>
                    {selectedTask.imageUrl ? (
                      <>
                        <h4 className='text-xs font-black text-gray-400 uppercase tracking-wider mb-2'>
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
                        <h4 className='text-xs font-black text-gray-400 uppercase tracking-wider mb-2'>
                          任务描述
                        </h4>
                        <p className='text-gray-700 font-medium leading-relaxed'>
                          {selectedTask.description || '快去完成这个任务吧！'}
                        </p>
                      </>
                    ) : null}

                    {selectedTask.requirePhoto && (
                      <div className='mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl'>
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
                          <div className='bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl mb-4'>
                            <h4 className='text-xs font-black text-blue-400 uppercase tracking-wider mb-2'>
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

                      <div className='bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl'>
                        <h4 className='text-xs font-black text-green-400 uppercase tracking-wider mb-2'>
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
                              <span className='text-sm font-bold text-gray-700'>
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
                              <span className='text-sm font-bold'>
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
                      <div className='bg-gradient-to-br from-slate-50 to-gray-100 p-5 rounded-2xl'>
                        <h4 className='text-xs font-black text-gray-400 uppercase tracking-wider mb-4'>
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
                                className={`absolute left-0 top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                                  record.status === 'approved'
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
                                <p className='text-xs text-gray-400 mb-1'>
                                  提交:{' '}
                                  {dayjs(record.submittedAt).format(
                                    'M月D日 HH:mm',
                                  )}
                                </p>
                                {record.auditedAt && (
                                  <p className='text-xs text-gray-400 mb-1'>
                                    审核:{' '}
                                    {dayjs(record.auditedAt).format(
                                      'M月D日 HH:mm',
                                    )}
                                  </p>
                                )}
                                {/* 提交的照片 */}
                                {record.photoUrl && (
                                  <div className='mt-2'>
                                    <p className='text-xs text-gray-400 mb-1'>
                                      提交的照片：
                                    </p>
                                    <div className='w-24 h-24 rounded-xl overflow-hidden border-2 border-blue-200 shadow-sm'>
                                      <Image
                                        src={record.photoUrl}
                                        alt={`第 ${selectedTask.auditHistory!.length - index} 次提交的照片`}
                                        className='w-full h-full object-cover'
                                        enableZoom={true}
                                        containerClassName='w-full h-full'
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 审核意见 */}
                                {record.auditNote && (
                                  <div className='mt-2 bg-white rounded-lg p-2 border border-gray-100'>
                                    <p className='text-xs text-gray-400 mb-1'>
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
          footer={
            <div className='flex gap-3 w-full'>
              <button
                className='flex-1 py-4 !rounded-2xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 border-none rounded-2xl'
                onClick={() => {
                  setShowSubmitModal(false);
                  setPhotoPreview('');
                }}
              >
                取消
              </button>
              <button
                className='flex-1 py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-xl hover:shadow-2xl hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed'
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
              className='w-28 h-28 bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 rounded-[2.5rem] flex items-center justify-center text-7xl mx-auto shadow-inner mb-4'
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
              className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-300 to-orange-400 text-white rounded-full mt-4 font-black shadow-lg'
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
              className='group relative border-4 border-dashed border-purple-200 rounded-[2rem] p-2 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all'
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
                    className='w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center'
                  >
                    <span className='text-4xl'>📸</span>
                  </motion.div>
                  <div className='text-center'>
                    <p className='font-black text-gray-700 text-lg'>
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
