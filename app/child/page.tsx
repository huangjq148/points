'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Image } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gift,
  ListChecks,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import {
  ChildEmptyState,
  ChildPanel,
  ChildPageTitle,
  ChildStatCard,
  ChildStatusPill,
} from '@/components/child/ChildUI';
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
    if (recallingTaskId === task._id) return;

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
  const rewardCtaPath =
    privilegeRewards.length > 0 ? '/child/store?category=privilege' : '/child/store';

  const getTaskTone = (task: Task, isFutureToday: boolean) => {
    if (task.status === 'approved') return 'emerald' as const;
    if (task.status === 'submitted') return 'amber' as const;
    if (task.status === 'rejected') return 'rose' as const;
    if (isFutureToday) return 'slate' as const;
    return 'sky' as const;
  };

  const getTaskStateLabel = (task: Task, isFutureToday: boolean, isCompletedToday: boolean) => {
    if (isCompletedToday) return '今日已完成';
    if (isFutureToday) return '未开始';
    if (task.status === 'submitted') return '审核中';
    if (task.status === 'rejected') return '需修改';
    if (task.status === 'approved') return '已完成';
    return '进行中';
  };

  const handleHomeTaskClick = (task: Task, isFutureToday: boolean) => {
    if (isFutureToday) return;
    if (task.status === 'pending' || task.status === 'rejected') {
      openSubmitModal(task);
      return;
    }
    openTaskDetail(task);
  };

  return (
    <>
      <div className='child-page-grid pb-2'>
        <ChildPanel className='overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(224,242,254,0.82)_52%,rgba(220,252,231,0.78)_100%)]'>
          <div className='grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-center'>
            <div>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <ChildPageTitle
                  icon='🌤️'
                  title='今天的学习岛'
                  description='完成一点点，也是在变厉害。'
                />
                <ChildStatusPill tone='sky'>{dayjs().format('M月D日 dddd')}</ChildStatusPill>
              </div>
              <div className='mt-5 grid gap-3 sm:grid-cols-3'>
                <ChildStatCard
                  label='总任务'
                  value={totalTasks}
                  hint='今天看到的任务'
                  tone='sky'
                  icon={<ListChecks size={18} />}
                  onClick={() => router.push(buildTaskListUrl('all'))}
                />
                <ChildStatCard
                  label='已完成'
                  value={completedTaskCount}
                  hint={`${completionRate}% 完成`}
                  tone='emerald'
                  icon={<CheckCircle2 size={18} />}
                  onClick={() => router.push(buildTaskListUrl('approved'))}
                />
                <ChildStatCard
                  label='待完成'
                  value={pendingVisibleCount}
                  hint='继续加油'
                  tone='amber'
                  icon={<Clock3 size={18} />}
                  onClick={() => router.push(buildTaskListUrl('pending'))}
                />
              </div>
            </div>
            <div className='rounded-[30px] bg-white/80 p-5 text-center shadow-sm ring-1 ring-white'>
              <div className='inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-sky-50 text-sky-600 ring-1 ring-sky-100'>
                <WalletCards size={28} />
              </div>
              <div className='mt-3 text-sm font-black text-[var(--child-text-muted)]'>当前积分</div>
              <div className='mt-2 text-5xl font-black text-sky-700'>🪙 {displayPoints.toLocaleString()}</div>
              <div className='mt-3 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100'>
                完成任务就能兑换奖励
              </div>
            </div>
          </div>
        </ChildPanel>

        <div className='child-page-grid child-two-column'>
          <ChildPanel>
            <div className='mb-4 flex items-center justify-between gap-3'>
              <ChildPageTitle
                icon={<ListChecks size={22} />}
                title='今天要做'
                description='点开任务，完成后提交给家长。'
              />
              <button
                type='button'
                onClick={() => router.push('/child/task')}
                className='rounded-full bg-white/80 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100'
              >
                全部任务
              </button>
            </div>
            <div className='space-y-3'>
              {visibleTasks.length > 0 ? (
                visibleTasks.map((task) => {
                  const startDate = task.startDate ? dayjs(task.startDate) : null;
                  const deadline = task.deadline ? dayjs(task.deadline) : null;
                  const isFutureToday =
                    !!startDate &&
                    startDate.valueOf() > nowValue &&
                    startDate.valueOf() <= todayEndValue;
                  const isCompletedToday =
                    task.status === 'approved' &&
                    !!deadline &&
                    deadline.valueOf() >= todayStartValue &&
                    deadline.valueOf() <= todayEndValue;
                  const tone = getTaskTone(task, isFutureToday);
                  const stateLabel = getTaskStateLabel(task, isFutureToday, isCompletedToday);

                  return (
                    <div
                      key={task._id}
                      role={isFutureToday ? undefined : 'button'}
                      tabIndex={isFutureToday ? -1 : 0}
                      onClick={() => handleHomeTaskClick(task, isFutureToday)}
                      onKeyDown={(event) => {
                        if (isFutureToday) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleHomeTaskClick(task, isFutureToday);
                        }
                      }}
                      className={`child-card flex w-full items-center gap-4 text-left ${isFutureToday ? 'cursor-not-allowed opacity-60' : 'cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200'}`}
                    >
                      <span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-sky-50 text-3xl ring-1 ring-sky-100'>
                        {task.icon}
                      </span>
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate text-base font-black text-[var(--child-text)]'>
                          {task.name}
                        </span>
                        <span className='mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--child-text-muted)]'>
                          <ChildStatusPill tone={tone}>{stateLabel}</ChildStatusPill>
                          <span className='inline-flex items-center gap-1'>
                            <Clock3 size={14} />
                            {task.startDate
                              ? `${dayjs(task.startDate).format('M/D HH:mm')} 开始`
                              : '随时可以开始'}
                          </span>
                          {task.deadline && (
                            <span>截止 {dayjs(task.deadline).format('M/D HH:mm')}</span>
                          )}
                          <span>+{task.points} 分</span>
                        </span>
                      </span>
                      {isFutureToday ? (
                        <span className='rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-500 ring-1 ring-slate-200/70'>
                          未开始
                        </span>
                      ) : task.status === 'pending' || task.status === 'rejected' ? (
                        <span className='rounded-full bg-sky-500 px-4 py-2 text-sm font-black text-white'>
                          {task.status === 'rejected' ? '重新提交' : '去完成'}
                        </span>
                      ) : task.status === 'submitted' ? (
                        <button
                          type='button'
                          disabled={recallingTaskId === task._id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRecallTask(task);
                          }}
                          className='rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100 transition disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          {recallingTaskId === task._id ? '撤回中...' : '撤回'}
                        </button>
                      ) : (
                        <span className='rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-100'>
                          查看
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <ChildEmptyState
                  title='今天很轻松'
                  hint='现在没有待做任务，可以去看看奖励。'
                  icon='🎉'
                />
              )}
            </div>
          </ChildPanel>

          <ChildPanel>
            <ChildPageTitle
              icon={<Gift size={22} />}
              title='奖励提醒'
              description='看看有没有想兑换的奖励。'
            />
            <div className='mt-4 rounded-[26px] bg-white/75 p-4 ring-1 ring-white'>
              <div className='flex flex-wrap items-center gap-2'>
                <ChildStatusPill tone={urgentPrivilegeRewards.length > 0 ? 'amber' : 'teal'}>
                  <Sparkles size={14} />
                  {privilegeRewards.length > 0 ? '特权奖励开放中' : '奖励商店等你来逛'}
                </ChildStatusPill>
              </div>
              <p className='mt-3 text-sm font-semibold text-[var(--child-text-muted)]'>
                {urgentPrivilegeRewards.length > 0
                  ? `${urgentPrivilegeRewards.length} 个特权快截止了。`
                  : privilegeRewards.length > 0
                    ? `现在有 ${privilegeRewards.length} 个特权奖励。`
                    : '完成任务获得积分后，就能兑换喜欢的奖励。'}
              </p>
              {urgentPrivilegeRewards.length > 0 && (
                <div className='mt-3 flex flex-wrap gap-2'>
                  {urgentPrivilegeRewards.slice(0, 3).map((reward) => (
                    <ChildStatusPill key={reward._id} tone='amber'>
                      {dayjs(reward.expiresAt).format('MM-DD')} 截止
                    </ChildStatusPill>
                  ))}
                </div>
              )}
              <button
                type='button'
                onClick={() => handleNavigate(rewardCtaPath)}
                className='mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-teal-500 px-4 py-2 text-sm font-black text-white'
              >
                去奖励商店
                <ArrowRight size={16} />
              </button>
            </div>
            <div className='mt-4'>
              <FeatureGrid
                completedTasksCount={completedTaskCount}
                privilegedCount={privilegeRewards.length}
                urgentPrivilegeRewards={urgentPrivilegeRewards}
                onNavigate={handleNavigate}
              />
            </div>
          </ChildPanel>
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
                disabled={!!selectedTask && recallingTaskId === selectedTask._id}
                className='w-full py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-xl hover:shadow-orange-500/25 transition-shadow disabled:cursor-not-allowed disabled:opacity-60'
                onClick={() => handleRecallTask(selectedTask!)}
              >
                {selectedTask && recallingTaskId === selectedTask._id ? '🔙 撤回中...' : '🔙 撤回修改'}
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
