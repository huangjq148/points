'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  useMemo,
} from 'react';
import { useApp } from '@/context/AppContext';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Button, Modal, Image, Input, FilterSelect } from '@/components/ui';
import {
  ChildEmptyState,
  ChildPanel,
  ChildPageTitle,
  ChildStatusPill,
} from '@/components/child/ChildUI';
import ChildTaskSubmitModal from '@/components/child/ChildTaskSubmitModal';
import TaskDateRangeFilter from '@/components/tasks/TaskDateRangeFilter';
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
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  auditHistory?: AuditRecord[];
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'in_progress', label: '进行中' },
  { value: 'pending', label: '待开始' },
  { value: 'submitted', label: '审核中' },
  { value: 'approved', label: '已完成' },
  { value: 'rejected', label: '需修改' },
];

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'daily', label: '日常任务' },
  { value: 'custom', label: '自定义任务' },
];

function TaskPage() {
  const { currentUser } = useApp();
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get('taskId');
  const statusFromQuery = searchParams.get('status');
  const normalizedStatusFromQuery =
    statusFromQuery === 'all' ? '' : statusFromQuery;
  const initialStatusFilter = normalizedStatusFromQuery ?? 'in_progress';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [initialFilterApplied, setInitialFilterApplied] = useState(false);
  const [pendingOpenTaskId, setPendingOpenTaskId] = useState<string | null>(
    initialTaskId,
  );

  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [recallingTaskId, setRecallingTaskId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFilters = useMemo(
    () => ({
      searchName,
      statusFilter,
      typeFilter,
      startDate,
      endDate,
    }),
    [endDate, searchName, startDate, statusFilter, typeFilter],
  );

  const fetchTasks = useCallback(
    async (
      pageNum: number = 1,
      filters = currentFilters,
    ) => {
      if (!currentUser?.token) return;

      setLoading(true);
      try {
        const params = {
          page: pageNum,
          limit: limit,
          ...(filters.statusFilter &&
            filters.statusFilter !== 'in_progress' && {
              status: filters.statusFilter,
            }),
          ...(filters.statusFilter === 'in_progress' && { inProgress: 'true' }),
          ...(filters.typeFilter && { type: filters.typeFilter }),
          ...(filters.searchName && { searchName: filters.searchName }),
          ...(filters.startDate && {
            startDate: dayjs(filters.startDate).format('YYYY-MM-DD'),
          }),
          ...(filters.endDate && {
            endDate: dayjs(filters.endDate).format('YYYY-MM-DD'),
          }),
        };

        const data = await request('/api/tasks', {
          params,
        });
        if (data.success) {
          setTasks(data.tasks);
          setTotal(data.total);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('获取任务失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.token, currentFilters, limit],
  );

  // 处理URL查询参数（从首页跳转或探索日志进入）
  useEffect(() => {
    if (initialFilterApplied) return;

    const filter = searchParams.get('filter');
    const searchNameParam = searchParams.get('searchName') || '';
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (searchNameParam) {
      setSearchName(searchNameParam);
    }
    if (status) {
      setStatusFilter(status === 'all' ? '' : status);
    }
    if (type) {
      setTypeFilter(type);
    }

    if (startDateParam) {
      setStartDate(dayjs(startDateParam).startOf('day').toDate());
    }

    if (endDateParam) {
      setEndDate(dayjs(endDateParam).endOf('day').toDate());
    }

    if (filter === 'thisWeek' && !startDateParam && !endDateParam) {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      setStartDate(monday);
      setEndDate(sunday);
    }

    setInitialFilterApplied(true);
  }, [
    searchParams,
    initialFilterApplied,
    normalizedStatusFromQuery,
  ]);

  useEffect(() => {
    if (!currentUser?.token || !initialFilterApplied) return;

    const timer = window.setTimeout(() => {
      void fetchTasks(1, currentFilters);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [currentFilters, currentUser?.token, fetchTasks, initialFilterApplied]);

  useEffect(() => {
    if (!pendingOpenTaskId || tasks.length === 0) return;
    const matchedTask = tasks.find((task) => task._id === pendingOpenTaskId);
    if (matchedTask) {
      openTaskDetail(matchedTask);
      setPendingOpenTaskId(null);
    }
  }, [pendingOpenTaskId, tasks]);

  const handlePageChange = (newPage: number) => {
    fetchTasks(newPage, currentFilters);
  };

  const handleRefreshTasks = () => {
    fetchTasks(1, currentFilters);
  };

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
        fetchTasks(page);
      }
    } catch (error) {
      console.error('Submit error:', error);
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
        fetchTasks(page);
      }
    } catch (error) {
      console.error('Recall error:', error);
    } finally {
      setRecallingTaskId(null);
    }
  };

  const handleStartTask = async (task: Task) => {
    if (!task._id || !currentUser?.token) return;

    setSelectedTask(task);
    try {
      const data = await request('/api/tasks', {
        method: 'PUT',
        body: {
          taskId: task._id,
          status: 'in_progress',
        },
      });

      if (data.success) {
        const nextTask = { ...task, status: 'in_progress' };
        setTasks((prev) =>
          prev.map((item) => (item._id === task._id ? nextTask : item)),
        );
        setSelectedTask(nextTask);
        if (showTaskDetail?._id === task._id) {
          setShowTaskDetail(nextTask);
        }
      }
    } catch (error) {
      console.error('Start task error:', error);
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
    switch (status) {
      case 'in_progress':
        return {
          label: '进行中',
          tone: 'teal' as const,
          iconWrap: 'bg-teal-50 text-teal-700',
          card: 'border-teal-200/70 bg-white/95',
          action: 'bg-teal-500 hover:bg-teal-600 text-white',
        };
      case 'approved':
        return {
          label: '已完成',
          tone: 'emerald' as const,
          iconWrap: 'bg-emerald-50 text-emerald-700',
          card: 'border-emerald-200/70 bg-emerald-50/60',
          action:
            'bg-slate-200 text-slate-500 cursor-not-allowed pointer-events-none',
        };
      case 'submitted':
        return {
          label: '审核中',
          tone: 'amber' as const,
          iconWrap: 'bg-amber-50 text-amber-700',
          card: 'border-amber-200/70 bg-white/95',
          action: 'bg-amber-500 hover:bg-amber-600 text-white',
        };
      case 'pending':
        return {
          label: '待开始',
          tone: 'slate' as const,
          iconWrap: 'bg-slate-100 text-slate-700',
          card: 'border-slate-200/70 bg-white/95',
          action: 'bg-slate-900 hover:bg-slate-800 text-white',
        };
      case 'rejected':
        return {
          label: '需修改',
          tone: 'rose' as const,
          iconWrap: 'bg-rose-50 text-rose-700',
          card: 'border-rose-200/70 bg-rose-50/60',
          action: 'bg-rose-500 hover:bg-rose-600 text-white',
        };
      default:
        return {
          label: '未知',
          tone: 'slate' as const,
          iconWrap: 'bg-slate-100 text-slate-700',
          card: 'border-slate-200 bg-white/95',
          action: 'bg-blue-500 hover:bg-blue-600 text-white',
        };
    }
  };

  const getLatestAuditRecord = (task: Task) => {
    if (!task.auditHistory?.length) return null;
    return task.auditHistory[0];
  };

  const getParentFeedback = (task: Task) => {
    const latestAudit = getLatestAuditRecord(task);
    if (latestAudit?.auditNote) {
      return {
        label: latestAudit.status === 'approved' ? '家长反馈' : '驳回原因',
        text: latestAudit.auditNote,
        className:
          latestAudit.status === 'approved'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
            : 'bg-rose-50 text-rose-700 border-rose-100',
      };
    }

    if (task.rejectionReason) {
      return {
        label: '驳回原因',
        text: task.rejectionReason,
        className: 'bg-rose-50 text-rose-700 border-rose-100',
      };
    }

    return null;
  };

  const getDeadlineInfo = (deadline?: string, status?: string) => {
    if (!deadline || status === 'approved') return null;
    const now = dayjs();
    const end = dayjs(deadline);
    const hoursLeft = end.diff(now, 'hour');

    if (hoursLeft < 0) {
      return {
        label: `已逾期 ${Math.abs(hoursLeft)} 小时`,
        className: 'bg-rose-100 text-rose-700',
      };
    }
    if (hoursLeft <= 24) {
      return {
        label: `剩余 ${Math.max(hoursLeft, 0)} 小时`,
        className: 'bg-amber-100 text-amber-700',
      };
    }

    return {
      label: `截止 ${end.format('MM/DD')}`,
      className: 'bg-slate-100 text-slate-600',
    };
  };

  const totalPages = Math.ceil(total / limit);
  const selectedTaskStatusInfo = selectedTask
    ? getStatusInfo(selectedTask.status)
    : null;

  return (
    <>
      <style jsx global>{`
        * {
          font-family: 'Nunito', sans-serif;
        }
        .glass {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .glass-strong {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 255, 255, 0.5);
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .react-datepicker__popper {
          z-index: var(--z-datepicker) !important;
        }
        .react-datepicker-popper {
          z-index: var(--z-datepicker) !important;
        }
      `}</style>

      <div className='child-page-grid'>
        <ChildPanel className='child-filter-panel'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <ChildPageTitle
              icon={<Filter size={22} />}
              title='任务工作台'
              description='筛选任务，找到今天要完成的事情。'
            />
            <Button
              type='button'
              onClick={handleRefreshTasks}
              disabled={loading || !initialFilterApplied}
              variant='secondary'
              className='min-h-11 rounded-2xl !border-none !bg-[var(--child-surface-muted)] !px-4 !py-2 !text-sm !font-black !text-sky-700 ring-1 ring-[color:rgba(125,211,252,0.24)] hover:!bg-[color:rgba(14,165,233,0.12)] hover:!text-sky-800 disabled:!cursor-not-allowed disabled:!opacity-60'
            >
              <RefreshCw
                size={16}
                className={`mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? '刷新中' : '刷新'}
            </Button>
          </div>
          <div className='mt-4 grid gap-3 lg:grid-cols-[minmax(0,300px)_180px_180px] xl:grid-cols-[minmax(0,300px)_180px_180px_minmax(280px,1fr)]'>
            <Input
              allowClear
              isSearch
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder='搜索任务名称...'
            />
            <FilterSelect
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(value) => setStatusFilter(String(value ?? ''))}
              placeholder='筛选状态'
              wrapperClassName='rounded-[18px]'
            />
            <FilterSelect
              options={TYPE_OPTIONS}
              value={typeFilter}
              onChange={(value) => setTypeFilter(String(value ?? ''))}
              placeholder='类型'
              wrapperClassName='rounded-[18px]'
            />
            <TaskDateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              className='xl:col-span-1'
            />
          </div>
        </ChildPanel>

        <ChildPanel>
          <div className='mb-4 flex items-start justify-between gap-3'>
            <ChildPageTitle
              title={loading ? '正在更新任务' : '任务列表'}
              description={`共 ${total} 个任务`}
              level='section'
            />
            <ChildStatusPill tone='sky'>第 {page} 页</ChildStatusPill>
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='h-9 w-9 animate-spin rounded-full border-4 border-sky-500 border-t-transparent' />
            </div>
          ) : tasks.length === 0 ? (
            <ChildEmptyState
              title='没有找到任务'
              hint='换个筛选条件，或者晚一点再看看。'
              icon='📭'
            />
          ) : null}

          {!loading && tasks.length > 0 && (
            <>
              <div className='space-y-3'>
                {tasks.map((task, index) => {
                  const statusInfo = getStatusInfo(task.status);
                  const deadlineInfo = getDeadlineInfo(
                    task.deadline,
                    task.status,
                  );
                  const isPending = task.status === 'pending';
                  const isInProgress = task.status === 'in_progress';
                  const isRejected = task.status === 'rejected';
                  const isSubmitted = task.status === 'submitted';
                  const parentFeedback = getParentFeedback(task);

                  return (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`child-card group cursor-pointer transition hover:-translate-y-0.5 md:p-5 ${statusInfo.card}`}
                      onClick={() => {
                        if (
                          task.status === 'pending' ||
                          task.status === 'rejected'
                        ) {
                          openSubmitModal(task);
                        } else {
                          openTaskDetail(task);
                        }
                      }}
                    >
                      <div className='flex items-start gap-4'>
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-[18px] text-2xl font-bold shadow-sm md:h-14 md:w-14 ${statusInfo.iconWrap}`}
                        >
                          {task.status === 'approved' ? '✓' : task.icon}
                        </div>

                        <div className='min-w-0 flex-1'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                              <h3 className='child-card-title truncate'>
                                {task.name}
                              </h3>
                              <p className='child-card-meta mt-1 line-clamp-2'>
                                {task.description || '暂无描述'}
                              </p>
                            </div>
                            <span className='shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100'>
                              +{task.points} 分
                            </span>
                          </div>

                          <div className='mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--child-text-muted)]'>
                            <ChildStatusPill tone={statusInfo.tone}>
                              {statusInfo.label}
                            </ChildStatusPill>

                            {deadlineInfo && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${deadlineInfo.className}`}
                              >
                                <Calendar size={12} />
                                {deadlineInfo.label}
                              </span>
                            )}

                            {task.startDate && (
                              <span className='inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100'>
                                <span className='h-1.5 w-1.5 rounded-full bg-indigo-500' />
                                开始 {dayjs(task.startDate).format('MM/DD')}
                              </span>
                            )}

                            {task.deadline && (
                              <span className='inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100'>
                                <span className='h-1.5 w-1.5 rounded-full bg-rose-500' />
                                截止 {dayjs(task.deadline).format('MM/DD')}
                              </span>
                            )}

                            {task.updatedAt && (
                              <span className='text-xs font-medium text-slate-400'>
                                更新于{' '}
                                {dayjs(task.updatedAt).format('YYYY/MM/DD')}
                              </span>
                            )}
                          </div>

                          {parentFeedback ? (
                            <div
                              className={`mt-3 rounded-[1rem] border px-3 py-2 text-xs ${parentFeedback.className}`}
                            >
                              <span className='font-bold'>
                                {parentFeedback.label}：
                              </span>
                              <span className='ml-1 font-medium'>
                                {parentFeedback.text}
                              </span>
                            </div>
                          ) : task.rejectionReason ? (
                            <p className='mt-3 rounded-[1rem] bg-rose-50/80 px-3 py-2 text-xs font-medium text-rose-600 ring-1 ring-rose-100'>
                              ✏️ {task.rejectionReason}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className='mt-4 flex justify-end'>
                        {isPending && (
                          <Button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTask(task);
                            }}
                            variant='secondary'
                            className='!border-none !shadow-none !bg-slate-900 !px-4 !py-2 !text-sm !font-black !text-white hover:!bg-slate-800 hover:!text-white'
                          >
                            开始任务
                          </Button>
                        )}
                        {isRejected && (
                          <Button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              openSubmitModal(task);
                            }}
                            variant='secondary'
                            className='!border-none !shadow-none !bg-rose-500 !px-4 !py-2 !text-sm !font-black !text-white hover:!bg-rose-600 hover:!text-white'
                          >
                            重新提交
                          </Button>
                        )}
                        {isInProgress && (
                          <Button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              openSubmitModal(task);
                            }}
                            variant='secondary'
                            className='!border-none !shadow-none !bg-teal-500 !px-4 !py-2 !text-sm !font-black !text-white hover:!bg-teal-600 hover:!text-white'
                          >
                            提交审核
                          </Button>
                        )}
                        {isSubmitted && (
                          <Button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecallTask(task);
                            }}
                            disabled={recallingTaskId === task._id}
                            variant='secondary'
                            className='!border-none !shadow-none !bg-amber-500 !px-4 !py-2 !text-sm !font-black !text-white hover:!bg-amber-600 hover:!text-white disabled:!cursor-not-allowed disabled:!opacity-50'
                          >
                            {recallingTaskId === task._id
                              ? '撤回中...'
                              : '撤回修改'}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className='mt-6 flex items-center justify-center gap-2'>
                  <Button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    variant='secondary'
                    className='h-10 w-10 rounded-2xl p-0'
                  >
                    <ChevronLeft size={20} />
                  </Button>
                  <div className='flex gap-1'>
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
                          className={`h-10 w-10 rounded-2xl text-sm font-black ${
                            page === pageNum
                              ? 'bg-slate-900 text-white'
                              : 'bg-white/80 text-slate-500 ring-1 ring-slate-200/70 hover:bg-slate-50'
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
                    variant='secondary'
                    className='h-10 w-10 rounded-2xl p-0'
                  >
                    <ChevronRight size={20} />
                  </Button>
                </div>
              )}
            </>
          )}
        </ChildPanel>
      </div>

      {/* 任务详情弹窗 */}
      <Modal
        isOpen={!!showTaskDetail}
        onClose={() => setShowTaskDetail(null)}
        width={640}
        className='overflow-hidden !rounded-[2rem] shadow-[0_24px_80px_rgba(14,116,144,0.22)]'
        showCloseButton={false}
        footer={
          selectedTask?.status === 'pending' ? (
            <button
              className='min-h-12 w-full rounded-[1.25rem] bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-3 text-lg font-black text-white shadow-lg'
              onClick={() => {
                setShowTaskDetail(null);
                handleStartTask(selectedTask);
              }}
            >
              🚀 开始任务
            </button>
          ) : selectedTask?.status === 'rejected' ? (
            <button
              className='min-h-12 w-full rounded-[1.25rem] bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-3 text-lg font-black text-white shadow-lg'
              onClick={() => openSubmitModal(selectedTask)}
            >
              💪 重新提交
            </button>
          ) : selectedTask?.status === 'in_progress' ? (
            <button
              className='min-h-12 w-full rounded-[1.25rem] bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500 px-4 py-3 text-lg font-black text-white shadow-lg'
              onClick={() => {
                setShowTaskDetail(null);
                openSubmitModal(selectedTask);
              }}
            >
              ✅ 提交审核
            </button>
          ) : selectedTask?.status === 'submitted' ? (
            <button
              disabled={!!selectedTask && recallingTaskId === selectedTask._id}
              className='min-h-12 w-full rounded-[1.25rem] bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-3 text-lg font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60'
              onClick={() => {
                setShowTaskDetail(null);
                handleRecallTask(selectedTask);
              }}
            >
              {selectedTask && recallingTaskId === selectedTask._id
                ? '🔙 撤回中...'
                : '🔙 撤回修改'}
            </button>
          ) : (
            <button
              className='min-h-12 w-full rounded-[1.25rem] bg-gradient-to-r from-slate-700 to-slate-900 px-4 py-3 text-lg font-black text-white shadow-lg'
              onClick={() => setShowTaskDetail(null)}
            >
              知道啦
            </button>
          )
        }
      >
        {selectedTask && (
          <div className='space-y-4'>
            <div className='rounded-[1.75rem] border border-[var(--child-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(224,242,254,0.94)_48%,rgba(254,249,195,0.85)_100%)] px-4 py-4 shadow-sm sm:px-5 sm:py-5'>
              <div className='flex min-w-0 items-center gap-3 sm:gap-4'>
                <div className='flex h-14 w-14 flex-none items-center justify-center rounded-[1.4rem] border border-amber-200/70 bg-white/90 text-3xl shadow-[0_12px_30px_rgba(251,146,60,0.15)] sm:h-16 sm:w-16 sm:text-4xl'>
                  {selectedTask.icon}
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='truncate text-lg font-black leading-tight text-slate-950 sm:text-xl'>
                    {selectedTask.name}
                  </h3>
                </div>
                <div className='flex flex-none items-center gap-2'>
                  <span className='inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-sm font-black text-amber-700'>
                    +{selectedTask.points}
                  </span>
                  {selectedTaskStatusInfo && (
                    <ChildStatusPill tone={selectedTaskStatusInfo.tone}>
                      {selectedTaskStatusInfo.label}
                    </ChildStatusPill>
                  )}
                </div>
              </div>
            </div>

            <div className='max-h-[45vh] space-y-4 overflow-y-auto pr-1 custom-scrollbar'>
              {selectedTask.imageUrl ||
              selectedTask.description ||
              selectedTask.requirePhoto ? (
                <div className='rounded-[1.5rem] border border-[var(--child-border)] bg-white/90 p-5 shadow-sm'>
                  {selectedTask.imageUrl ? (
                    <>
                      <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-slate-500'>
                        任务图片
                      </h4>
                      <div className='relative mb-6 aspect-video overflow-hidden rounded-xl'>
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
                      <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-slate-500'>
                        任务描述
                      </h4>
                      <p className='font-medium leading-relaxed text-slate-700'>
                        {selectedTask.description || '快去完成这个任务吧！'}
                      </p>
                    </>
                  ) : null}

                  {selectedTask.requirePhoto && (
                    <div className='mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2'>
                      <span className='text-amber-500'>📸</span>
                      <span className='text-sm font-bold text-amber-700'>
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
                        <div className='mb-4 rounded-[1.5rem] border border-[var(--child-border)] bg-white/90 p-5 shadow-sm'>
                          <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-sky-500'>
                            📸 提交的照片
                          </h4>
                          <div className='relative aspect-video overflow-hidden rounded-xl'>
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

                    <div className='rounded-[1.5rem] border border-[var(--child-border)] bg-white/90 p-5 shadow-sm'>
                      <h4 className='mb-2 text-xs font-black uppercase tracking-wider text-emerald-600'>
                        {selectedTask.status === 'approved'
                          ? '✅ 审核通过'
                          : selectedTask.status === 'rejected'
                            ? '❌ 已拒绝'
                            : '⏳ 审核中'}
                      </h4>
                      <div className='space-y-2'>
                        {selectedTask.startDate && (
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-slate-600'>
                              开始时间
                            </span>
                            <span className='text-sm font-bold text-slate-800'>
                              {dayjs(selectedTask.startDate).format(
                                'M月D日 HH:mm',
                              )}
                            </span>
                          </div>
                        )}
                        {selectedTask.deadline && (
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-slate-600'>
                              截止时间
                            </span>
                            <span className='text-sm font-bold text-slate-800'>
                              {dayjs(selectedTask.deadline).format(
                                'M月D日 HH:mm',
                              )}
                            </span>
                          </div>
                        )}
                        {selectedTask.submittedAt && (
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-slate-600'>
                              提交时间
                            </span>
                            <span className='text-sm font-bold text-slate-800'>
                              {dayjs(selectedTask.submittedAt).format(
                                'M月D日 HH:mm',
                              )}
                            </span>
                          </div>
                        )}
                        {selectedTask.status === 'approved' &&
                          selectedTask.approvedAt && (
                            <div className='flex items-center justify-between'>
                              <span className='text-sm text-slate-600'>
                                审核时间
                              </span>
                              <span className='text-sm font-bold text-green-700'>
                                {dayjs(selectedTask.approvedAt).format(
                                  'M月D日 HH:mm',
                                )}
                              </span>
                            </div>
                          )}
                        {selectedTask.rejectionReason && (
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-slate-600'>
                              审核意见
                            </span>
                            <span className='text-sm font-bold text-slate-800'>
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
                    <div className='rounded-[1.5rem] border border-[var(--child-border)] bg-white/90 p-5 shadow-sm'>
                      <h4 className='mb-4 text-xs font-black uppercase tracking-wider text-slate-500'>
                        📋 操作记录 ({selectedTask.auditHistory.length})
                      </h4>
                      <div className='max-h-[200px] space-y-3 overflow-y-auto custom-scrollbar'>
                        {selectedTask.auditHistory.map((record, index) => (
                          <div
                            key={record._id || index}
                            className={`relative pl-4 pb-3 ${index !== selectedTask.auditHistory!.length - 1 ? 'border-l-2 border-slate-200' : ''}`}
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
                              <div className='mb-1 flex items-center gap-2'>
                                <span className='rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700'>
                                  第 {index + 1} 次操作
                                </span>
                                {record.status === 'approved' ? (
                                  <span className='rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700'>
                                    通过
                                  </span>
                                ) : record.status === 'rejected' ? (
                                  <span className='rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700'>
                                    驳回
                                  </span>
                                ) : (
                                  <span className='rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700'>
                                    审核中
                                  </span>
                                )}
                              </div>
                              <p className='mb-1 text-xs text-slate-500'>
                                提交:{' '}
                                {dayjs(record.submittedAt).format(
                                  'M月D日 HH:mm',
                                )}
                              </p>
                              {record.auditedAt && (
                                <p className='mb-1 text-xs text-slate-500'>
                                  审核:{' '}
                                  {dayjs(record.auditedAt).format(
                                    'M月D日 HH:mm',
                                  )}
                                </p>
                              )}
                              {/* 提交的照片 */}
                              {record.photoUrl && (
                                <div className='mt-2'>
                                  <p className='mb-1 text-xs text-slate-500'>
                                    提交的照片：
                                  </p>
                                  <div className='h-20 w-20 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm'>
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
                                <div className='mt-2 rounded-lg border border-slate-200 bg-white p-2'>
                                  <p className='mb-1 text-xs text-slate-500'>
                                    家长意见：
                                  </p>
                                  <p className='text-xs text-slate-700'>
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
          </div>
        )}
      </Modal>

      <ChildTaskSubmitModal
        isOpen={showSubmitModal}
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

      {/* 图片全屏预览 Modal */}
    </>
  );
}

// 包装组件以添加 Suspense
export default function TaskPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50'>
          <div className='text-center'>
            <div className='mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500'></div>
            <p className='text-slate-600'>加载中...</p>
          </div>
        </div>
      }
    >
      <TaskPage />
    </Suspense>
  );
}
