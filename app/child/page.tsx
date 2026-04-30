'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Image } from '@/components/ui';
import { useRouter } from 'next/navigation';
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
import ChildTaskSubmitModal from '@/components/child/ChildTaskSubmitModal';
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

interface ChildPrivilegeOrder {
  _id: string;
  rewardName: string;
  rewardIcon?: string;
  status: 'pending' | 'verified' | 'cancelled';
  createdAt: string;
  verifiedAt?: string;
  validUntil?: string | null;
  privilegeMeta?: {
    isPrivilege?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  };
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
  const [privilegeOrders, setPrivilegeOrders] = useState<ChildPrivilegeOrder[]>([]);
  const [showPrivilegeDetail, setShowPrivilegeDetail] = useState<ChildPrivilegeOrder | null>(null);
  const [showAllPrivilegeOrders, setShowAllPrivilegeOrders] = useState(false);

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

  const fetchPrivilegeOrders = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const data = await request('/api/orders', {
        params: {
          status: 'pending,verified',
          page: 1,
          limit: 50,
        },
      });
      if (data.success) {
        setPrivilegeOrders(data.orders || []);
      }
    } catch (error) {
      console.error('获取特权订单失败:', error);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    fetchTasks();
    fetchRewardSummary();
    fetchPrivilegeOrders();
  }, [fetchPrivilegeOrders, fetchRewardSummary, fetchTasks]);

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
  function getPrivilegeEndTime(order: ChildPrivilegeOrder) {
    if (order.privilegeMeta?.endsAt) {
      return dayjs(order.privilegeMeta.endsAt);
    }

    if (order.validUntil) {
      return dayjs(order.validUntil);
    }

    return null;
  }

  const activePrivilegeOrders = useMemo(() => {
    return privilegeOrders
      .filter((order) => order.privilegeMeta?.isPrivilege)
      .filter((order) => {
        if (order.status === 'cancelled') return false;
        if (order.status === 'pending') {
          const endTime = order.privilegeMeta?.endsAt ? dayjs(order.privilegeMeta.endsAt) : null;
          if (!endTime) return true;
          return !endTime.isBefore(dayjs());
        }
        if (order.status === 'verified') {
          const endTime = getPrivilegeEndTime(order);
          if (!endTime) return true;
          return !endTime.isBefore(dayjs());
        }
        return false;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'verified' ? -1 : 1;
        return dayjs(b.verifiedAt || b.createdAt).valueOf() - dayjs(a.verifiedAt || a.createdAt).valueOf();
      });
  }, [privilegeOrders]);
  const visiblePrivilegeOrders = useMemo(
    () => (showAllPrivilegeOrders ? activePrivilegeOrders : activePrivilegeOrders.slice(0, 2)),
    [activePrivilegeOrders, showAllPrivilegeOrders],
  );
  const collapsedPrivilegeCount = Math.max(activePrivilegeOrders.length - visiblePrivilegeOrders.length, 0);
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

  const formatPrivilegeTime = (value?: string | null) => {
    if (!value) return '长期有效';
    return dayjs(value).format('M月D日 HH:mm');
  };

  const getPrivilegeTimingText = (order: ChildPrivilegeOrder) => {
    if (order.status === 'verified') {
      const endTime = getPrivilegeEndTime(order);
      return {
        startLabel: '生效时间',
        startValue: order.privilegeMeta?.startsAt
          ? formatPrivilegeTime(order.privilegeMeta.startsAt)
          : order.verifiedAt
            ? formatPrivilegeTime(order.verifiedAt)
            : '已生效',
        endLabel: '截止时间',
        endValue: endTime ? formatPrivilegeTime(endTime.toISOString()) : '长期有效',
      };
    }

    return {
      startLabel: '生效时间',
      startValue: '待家长核销',
      endLabel: '截止时间',
      endValue: order.privilegeMeta?.endsAt ? formatPrivilegeTime(order.privilegeMeta.endsAt) : '待确认',
    };
  };

  const getPrivilegeDetailTone = (order: ChildPrivilegeOrder) =>
    order.status === 'verified' ? 'emerald' : 'amber';

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
        <Modal
          title='特权详情'
          isOpen={!!showPrivilegeDetail}
          onClose={() => setShowPrivilegeDetail(null)}
          width={480}
          className='!rounded-[1.75rem] !border-[color:var(--child-border)] !bg-[color:var(--child-surface-strong)]'
        >
          {showPrivilegeDetail && (
            <div className='space-y-3'>
              <div className='flex items-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,var(--child-surface-muted)_0%,rgba(14,165,233,0.14)_100%)] px-4 py-3 ring-1 ring-[color:rgba(125,211,252,0.24)]'>
                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--child-surface)] text-[26px] shadow-sm ring-1 ring-[color:var(--child-border)]'>
                  {showPrivilegeDetail.rewardIcon || '🎁'}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <ChildStatusPill tone={getPrivilegeDetailTone(showPrivilegeDetail)}>
                      {showPrivilegeDetail.status === 'verified' ? '已生效' : '待生效'}
                    </ChildStatusPill>
                  </div>
                  <h3 className='mt-1 truncate text-lg font-black tracking-tight text-[var(--child-text)]'>
                    {showPrivilegeDetail.rewardName}
                  </h3>
                </div>
              </div>

              <div className='grid gap-2.5 sm:grid-cols-2'>
                <div className='rounded-[18px] bg-[var(--child-surface-muted)] px-3 py-2.5 ring-1 ring-[color:var(--child-border)]'>
                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--child-text-muted)]'>
                    生效时间
                  </div>
                  <div className='mt-0.5 text-[13px] font-bold text-[var(--child-text)]'>
                    {showPrivilegeDetail.privilegeMeta?.startsAt
                      ? formatPrivilegeTime(showPrivilegeDetail.privilegeMeta.startsAt)
                      : showPrivilegeDetail.verifiedAt
                        ? formatPrivilegeTime(showPrivilegeDetail.verifiedAt)
                        : '待家长核销'}
                  </div>
                </div>
                <div className='rounded-[18px] bg-[var(--child-surface-muted)] px-3 py-2.5 ring-1 ring-[color:var(--child-border)]'>
                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--child-text-muted)]'>
                    截止时间
                  </div>
                  <div className='mt-0.5 text-[13px] font-bold text-[var(--child-text)]'>
                    {showPrivilegeDetail.privilegeMeta?.endsAt
                      ? formatPrivilegeTime(showPrivilegeDetail.privilegeMeta.endsAt)
                      : '长期有效'}
                  </div>
                </div>
              </div>

              <div className='rounded-[18px] bg-[linear-gradient(135deg,rgba(14,165,164,0.08)_0%,rgba(59,130,246,0.08)_100%)] px-3 py-2.5 text-xs font-semibold leading-5 text-[var(--child-text-muted)] ring-1 ring-sky-100'>
                {showPrivilegeDetail.status === 'verified'
                  ? '家长已经确认，这个特权现在可以使用。'
                  : '还在等待家长核销，核销后才会开始生效。'}
              </div>
            </div>
          )}
        </Modal>

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
            <div className='rounded-[30px] bg-[var(--child-surface-muted)] p-5 text-center shadow-sm ring-1 ring-[color:var(--child-border)]'>
              <div className='inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-[color:rgba(14,165,233,0.14)] text-sky-600 ring-1 ring-[color:rgba(125,211,252,0.24)]'>
                <WalletCards size={28} />
              </div>
              <div className='mt-3 text-sm font-black text-[var(--child-text-muted)]'>当前积分</div>
              <div className='mt-2 text-5xl font-black text-[var(--child-text)]'>🪙 {displayPoints.toLocaleString()}</div>
              <div className='mt-3 rounded-full bg-[color:rgba(14,165,233,0.14)] px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-[color:rgba(125,211,252,0.24)]'>
                完成任务就能兑换奖励
              </div>
            </div>
          </div>
        </ChildPanel>

        {activePrivilegeOrders.length > 0 && (
          <ChildPanel>
            <ChildPageTitle
              icon={<Clock3 size={22} />}
              title='特权奖励'
              level='section'
            />
            <div className='mt-3 grid gap-2.5'>
              {visiblePrivilegeOrders.map((order) => {
                const timing = getPrivilegeTimingText(order);
                return (
                  <button
                    key={order._id}
                    type='button'
                    onClick={() => setShowPrivilegeDetail(order)}
                    className='w-full rounded-[22px] border border-[color:var(--child-border)] bg-[var(--child-surface-muted)] px-4 py-2.5 text-left shadow-[0_10px_22px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-[var(--child-surface)] text-[22px] shadow-[0_6px_12px_rgba(15,23,42,0.08)] ring-1 ring-[color:var(--child-border)]'>
                        {order.rewardIcon || '🎁'}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <h3 className='child-card-title truncate'>
                          {order.rewardName}
                        </h3>
                      </div>
                      <div className='ml-auto min-w-0 text-right'>
                        <div className='child-card-meta truncate !font-bold !text-[var(--child-text)]'>
                          {timing.startValue} - {timing.endValue}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {activePrivilegeOrders.length > 2 && (
                <button
                  type='button'
                  onClick={() => setShowAllPrivilegeOrders((current) => !current)}
                  aria-expanded={showAllPrivilegeOrders}
                  className='flex items-center justify-between gap-3 rounded-[22px] border border-dashed border-[color:var(--child-border)] bg-[color:rgba(148,163,184,0.1)] px-4 py-2.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:bg-[color:rgba(148,163,184,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200'
                >
                  <div className='min-w-0'>
                    <div className='child-card-meta !font-black !text-[var(--child-text)]'>
                      {showAllPrivilegeOrders
                        ? `收起特权奖励，当前显示 ${activePrivilegeOrders.length} 个`
                        : `展开剩余 ${collapsedPrivilegeCount} 个特权奖励`}
                    </div>
                    <div className='child-card-meta mt-0.5 opacity-90'>
                      {showAllPrivilegeOrders ? '只保留最重要的前两个在上面' : '点一下就能看到全部特权'}
                    </div>
                  </div>
                  <ChildStatusPill tone='slate'>
                    {showAllPrivilegeOrders ? '收起' : '展开'}
                  </ChildStatusPill>
                </button>
              )}
            </div>
          </ChildPanel>
        )}

        <div className='child-page-grid child-two-column'>
          <ChildPanel>
            <div className='mb-4 flex items-center justify-between gap-3'>
              <ChildPageTitle
                icon={<ListChecks size={22} />}
                title='今天要做'
                description='点开任务，完成后提交给家长。'
                level='section'
              />
              <button
                type='button'
                onClick={() => router.push('/child/task')}
                className='rounded-full bg-[var(--child-surface-muted)] px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-[color:rgba(125,211,252,0.24)]'
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
                      <span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[color:rgba(14,165,233,0.14)] text-3xl ring-1 ring-[color:rgba(125,211,252,0.24)]'>
                        {task.icon}
                      </span>
                      <span className='min-w-0 flex-1'>
                        <span className='child-card-title block truncate'>
                          {task.name}
                        </span>
                        <span className='child-card-meta mt-1 flex flex-wrap items-center gap-2'>
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
                        <span className='rounded-full bg-[var(--child-surface-muted)] px-4 py-2 text-sm font-black text-[var(--child-text-muted)] ring-1 ring-[color:var(--child-border)]'>
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
                          className='rounded-full bg-[color:rgba(245,158,11,0.16)] px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-[color:rgba(252,211,77,0.24)] transition disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          {recallingTaskId === task._id ? '撤回中...' : '撤回'}
                        </button>
                      ) : (
                        <span className='rounded-full bg-[color:rgba(16,185,129,0.14)] px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-[color:rgba(110,231,183,0.24)]'>
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
              level='section'
            />
            <div className='mt-4 rounded-[26px] bg-[var(--child-surface-muted)] p-4 ring-1 ring-[color:var(--child-border)]'>
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
          </ChildPanel>
        </div>

        {/* 任务详情弹窗 */}
        <Modal
          isOpen={!!showTaskDetail && !!selectedTask}
          onClose={() => setShowTaskDetail(null)}
          showCloseButton={false}
          width={500}
          className='child-task-detail-modal !backdrop-blur-xl'
          footer={
            selectedTask?.status === 'pending' ||
              selectedTask?.status === 'rejected' ? (
              <button
                className='w-full rounded-2xl border border-[color:var(--child-border-strong)] bg-[linear-gradient(90deg,#0ea5e9_0%,#2563eb_52%,#4f46e5_100%)] py-4 text-lg font-black text-white shadow-[0_18px_38px_rgba(37,99,235,0.26)] transition hover:brightness-105'
                onClick={() => openSubmitModal(selectedTask!)}
              >
                {selectedTask?.status === 'rejected'
                  ? '💪 重新提交'
                  : '🚀 开始任务'}
              </button>
            ) : selectedTask?.status === 'submitted' ? (
              <button
                disabled={!!selectedTask && recallingTaskId === selectedTask._id}
                className='w-full rounded-2xl border border-[color:rgba(251,191,36,0.34)] bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_50%,#fb7185_100%)] py-4 text-lg font-black text-white shadow-[0_18px_38px_rgba(249,115,22,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={() => handleRecallTask(selectedTask!)}
              >
                {selectedTask && recallingTaskId === selectedTask._id ? '🔙 撤回中...' : '🔙 撤回修改'}
              </button>
            ) : (
              <button
                className='w-full rounded-2xl border border-[color:var(--child-border)] bg-[var(--child-surface-muted)] py-4 text-lg font-black text-[var(--child-text)] shadow-[var(--child-shadow-card)]'
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
                <div className='child-task-detail-hero flex h-24 w-24 items-center justify-center rounded-[2rem] text-6xl shadow-inner'>
                  {selectedTask.icon}
                </div>
                <div className='flex-1'>
                  <h3 className='text-2xl font-black text-[var(--child-text)] leading-tight'>
                    {selectedTask.name}
                  </h3>
                  <div className='flex items-center gap-2 mt-2 flex-wrap'>
                    <span className='text-lg font-black text-amber-500'>
                      +{selectedTask.points}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${selectedTask.status === 'approved'
                          ? 'bg-[color:rgba(16,185,129,0.14)] text-emerald-700 ring-1 ring-[color:rgba(110,231,183,0.24)]'
                          : selectedTask.status === 'submitted'
                            ? 'bg-[color:rgba(14,165,233,0.14)] text-sky-700 ring-1 ring-[color:rgba(125,211,252,0.24)]'
                            : selectedTask.status === 'rejected'
                              ? 'bg-[color:rgba(244,63,94,0.14)] text-rose-700 ring-1 ring-[color:rgba(253,164,175,0.24)]'
                              : 'bg-[var(--child-surface-muted)] text-[var(--child-text-muted)] ring-1 ring-[color:var(--child-border)]'
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
                  <div className='child-task-detail-surface rounded-2xl p-5'>
                    {selectedTask.imageUrl ? (
                      <>
                        <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-[var(--child-text-muted)]'>
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
                        <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-[var(--child-text-muted)]'>
                          任务描述
                        </h4>
                        <p className='font-medium leading-relaxed text-[var(--child-text)]'>
                          {selectedTask.description || '快去完成这个任务吧！'}
                        </p>
                      </>
                    ) : null}

                    {selectedTask.requirePhoto && (
                      <div className='child-task-detail-tip mt-3 flex items-center gap-2 rounded-xl px-3 py-2'>
                        <span>📸</span>
                        <span className='text-sm font-bold'>
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
                            <div className='child-task-detail-card child-task-detail-photo-card mb-4 rounded-2xl p-5'>
                              <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-sky-700'>
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

                        <div className='child-task-detail-card child-task-detail-audit-card rounded-2xl p-5'>
                          <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-emerald-700'>
                            {selectedTask.status === 'approved'
                              ? '✅ 审核通过'
                              : selectedTask.status === 'rejected'
                                ? '❌ 已拒绝'
                                : '⏳ 审核中'}
                          </h4>
                          <div className='space-y-2'>
                            {selectedTask.submittedAt && (
                              <div className='flex justify-between items-center'>
                                <span className='text-sm text-[var(--child-text-muted)]'>
                                  提交时间
                                </span>
                                <span className='text-sm font-bold text-[var(--child-text)]'>
                                  {dayjs(selectedTask.submittedAt).format(
                                    'M月D日 HH:mm',
                                  )}
                                </span>
                              </div>
                            )}
                            {selectedTask.status === 'approved' &&
                              selectedTask.approvedAt && (
                                <div className='flex justify-between items-center'>
                                  <span className='text-sm text-[var(--child-text-muted)]'>
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
                                <span className='text-sm text-[var(--child-text-muted)]'>
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
                      <div className='child-task-detail-surface rounded-2xl p-5'>
                        <h4 className='mb-4 text-xs font-black uppercase tracking-wider text-[var(--child-text-muted)]'>
                          📋 操作记录 ({selectedTask.auditHistory.length})
                        </h4>
                        <div className='space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar'>
                          {selectedTask.auditHistory.map((record, index) => (
                            <div
                              key={record._id || index}
                              className={`child-task-detail-timeline relative rounded-[18px] pl-4 pb-3 pt-3 pr-3 ${index !== selectedTask.auditHistory!.length - 1 ? 'border-l-2 border-[color:var(--child-border)]' : ''}`}
                            >
                              {/* 时间线节点 */}
                              <div
                                className={`absolute left-0 top-3 h-3 w-3 rounded-full border-2 border-white shadow-sm ${record.status === 'approved'
                                    ? 'bg-green-500'
                                    : record.status === 'rejected'
                                      ? 'bg-red-500'
                                      : 'bg-blue-500'
                                  }`}
                                style={{ transform: 'translateX(-50%)' }}
                              />

                              <div className='ml-2'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <span className='rounded-full bg-[color:rgba(14,165,233,0.14)] px-2 py-0.5 text-xs font-bold text-sky-700'>
                                    第{' '}
                                    {selectedTask.auditHistory!.length - index}{' '}
                                    次操作
                                  </span>
                                  {record.status === 'approved' ? (
                                    <span className='rounded-full bg-[color:rgba(16,185,129,0.14)] px-2 py-0.5 text-xs font-bold text-emerald-700'>
                                      通过
                                    </span>
                                  ) : record.status === 'rejected' ? (
                                    <span className='rounded-full bg-[color:rgba(244,63,94,0.14)] px-2 py-0.5 text-xs font-bold text-rose-700'>
                                      驳回
                                    </span>
                                  ) : (
                                    <span className='rounded-full bg-[color:rgba(14,165,233,0.14)] px-2 py-0.5 text-xs font-bold text-sky-700'>
                                      审核中
                                    </span>
                                  )}
                                </div>
                                <p className='mb-1 text-xs text-[var(--child-text-muted)]'>
                                  提交:{' '}
                                  {dayjs(record.submittedAt).format(
                                    'M月D日 HH:mm',
                                  )}
                                </p>
                                {record.auditedAt && (
                                  <p className='mb-1 text-xs text-[var(--child-text-muted)]'>
                                    审核:{' '}
                                    {dayjs(record.auditedAt).format(
                                      'M月D日 HH:mm',
                                    )}
                                  </p>
                                )}
                                {/* 提交的照片 */}
                                {record.photoUrl && (
                                  <div className='mt-2'>
                                    <p className='mb-1 text-xs text-[var(--child-text-muted)]'>
                                      提交的照片：
                                    </p>
                                    <div className='h-24 w-24 overflow-hidden rounded-xl border-2 border-[color:rgba(96,165,250,0.34)] shadow-sm'>
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
                                  <div className='child-task-detail-comment mt-2 rounded-lg p-2'>
                                    <p className='mb-1 text-xs text-[var(--child-text-muted)]'>
                                      家长意见：
                                    </p>
                                    <p className='text-xs text-[var(--child-text)]'>
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

        <ChildTaskSubmitModal
          isOpen={!!showSubmitModal && !!selectedTask}
          task={selectedTask}
          submitting={submitting}
          hasPhoto={!!photoFile}
          photoPreview={photoPreview}
          fileInputRef={fileInputRef}
          onClose={() => {
            setShowSubmitModal(false);
            setPhotoPreview('');
          }}
          onPhotoSelect={handlePhotoSelect}
          onSubmit={handleSubmitTask}
        />
      </div>
    </>
  );
}
