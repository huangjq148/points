'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Button, Modal, Image, Input } from '@/components/ui';
import DatePicker from '@/components/ui/DatePicker';
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
  const normalizedStatusFromQuery = statusFromQuery === 'all' ? '' : statusFromQuery;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [initialFilterApplied, setInitialFilterApplied] = useState(false);
  const [pendingOpenTaskId, setPendingOpenTaskId] = useState<string | null>(initialTaskId);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    searchName: '',
    statusFilter: '',
    typeFilter: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });

  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [recallingTaskId, setRecallingTaskId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(
    async (
      pageNum: number = 1,
      filters = appliedFilters,
    ) => {
      if (!currentUser?.token) return;

      setLoading(true);
      try {
        const params = {
          page: pageNum,
          limit: limit,
          ...(filters.statusFilter && filters.statusFilter !== 'in_progress' && { status: filters.statusFilter }),
          ...(filters.statusFilter === 'in_progress' && { inProgress: 'true' }),
          ...(filters.typeFilter && { type: filters.typeFilter }),
          ...(filters.searchName && { searchName: filters.searchName }),
          ...(filters.startDate && { startDate: dayjs(filters.startDate).format('YYYY-MM-DD') }),
          ...(filters.endDate && { endDate: dayjs(filters.endDate).format('YYYY-MM-DD') }),
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
    [currentUser?.token, appliedFilters],
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

    const nextFilters = {
      searchName: searchNameParam,
      statusFilter: normalizedStatusFromQuery || '',
      typeFilter: type || '',
      startDate: startDateParam ? dayjs(startDateParam).startOf('day').toDate() : null,
      endDate: endDateParam ? dayjs(endDateParam).endOf('day').toDate() : null,
    };
    setAppliedFilters(nextFilters);
    setInitialFilterApplied(true);
  }, [searchParams, initialFilterApplied, fetchTasks, normalizedStatusFromQuery]);

  useEffect(() => {
    if (!currentUser?.token || !initialFilterApplied || hasInitialLoaded) return;
    void fetchTasks(1);
    setHasInitialLoaded(true);
  }, [currentUser?.token, fetchTasks, hasInitialLoaded, initialFilterApplied]);

  useEffect(() => {
    if (!pendingOpenTaskId || tasks.length === 0) return;
    const matchedTask = tasks.find((task) => task._id === pendingOpenTaskId);
    if (matchedTask) {
      openTaskDetail(matchedTask);
      setPendingOpenTaskId(null);
    }
  }, [pendingOpenTaskId, tasks]);

  const handleSearch = () => {
    const nextFilters = {
      searchName,
      statusFilter,
      typeFilter,
      startDate,
      endDate,
    };
    setAppliedFilters(nextFilters);
    fetchTasks(1, nextFilters);
  };

  const handleReset = () => {
    setSearchName('');
    setStatusFilter('');
    setTypeFilter('');
    setStartDate(null);
    setEndDate(null);
    const nextFilters = {
      searchName: '',
      statusFilter: '',
      typeFilter: '',
      startDate: null,
      endDate: null,
    };
    setAppliedFilters(nextFilters);
    fetchTasks(1, nextFilters);
  };

  const handlePageChange = (newPage: number) => {
    fetchTasks(newPage);
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
        setTasks((prev) => prev.map((item) => (item._id === task._id ? nextTask : item)));
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
          bg: 'bg-sky-50',
          text: 'text-sky-700',
          dot: 'bg-blue-500',
          iconWrap: 'bg-sky-50 text-sky-700',
          card: 'border-sky-200/70 bg-sky-50/60',
          action: 'bg-sky-600 hover:bg-sky-700 text-white',
        };
      case 'approved':
        return {
          label: '已完成',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          dot: 'bg-emerald-500',
          iconWrap: 'bg-emerald-50 text-emerald-700',
          card: 'border-emerald-200/70 bg-emerald-50/60',
          action:
            'bg-slate-200 text-slate-500 cursor-not-allowed pointer-events-none',
        };
      case 'submitted':
        return {
          label: '审核中',
          bg: 'bg-blue-50',
          text: 'text-sky-700',
          dot: 'bg-sky-500',
          iconWrap: 'bg-blue-50 text-sky-700',
          card: 'border-sky-200/70 bg-white',
          action: 'bg-amber-500 hover:bg-amber-600 text-white',
        };
      case 'pending':
        return {
          label: '待开始',
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          dot: 'bg-slate-500',
          iconWrap: 'bg-slate-100 text-slate-700',
          card: 'border-slate-200/70 bg-white',
          action: 'bg-slate-900 hover:bg-slate-800 text-white',
        };
      case 'rejected':
        return {
          label: '需修改',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          dot: 'bg-rose-500',
          iconWrap: 'bg-rose-50 text-rose-700',
          card: 'border-rose-200/70 bg-rose-50/60',
          action: 'bg-rose-500 hover:bg-rose-600 text-white',
        };
      default:
        return {
          label: '未知',
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          dot: 'bg-slate-500',
          iconWrap: 'bg-slate-100 text-slate-700',
          card: 'border-slate-200 bg-white',
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

      <div className='relative min-h-screen px-4 py-4'>
        {/* 搜索区域 */}
        <div className='glass-strong relative z-10 mb-4 rounded-[28px] border border-white/65 bg-white/72 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl'>
          <div className='flex flex-col gap-4'>
            {/* 筛选条件 */}
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
              {/* 搜索框 */}
              <Input
                labelPosition="left"
                allowClear
                isSearch
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="搜索任务名称..."
              />
              <div className='flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-sm'>
                <Filter size={16} className='shrink-0 text-slate-400' />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className='w-full bg-transparent text-sm text-slate-700 focus:outline-none'
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className='flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-sm'>
                <span className='shrink-0 text-sm font-bold text-slate-400'>类型</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className='w-full bg-transparent text-sm text-slate-700 focus:outline-none'
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className='flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-sm md:col-span-2 xl:col-span-1'>
              <Calendar size={16} className='shrink-0 text-slate-400' />
              <div className='grid grid-cols-2 gap-2 flex-1'>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholderText='开始日期'
                  className='border-0 bg-white/80'
                />
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  placeholderText='结束日期'
                  className='border-0 bg-white/80'
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className='flex gap-2'>
              <Button onClick={handleSearch} className='flex-1 rounded-full'>
                搜索
              </Button>
              <Button onClick={handleReset} variant='secondary' className='rounded-full'>
                重置
              </Button>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className='glass-strong min-h-[400px] rounded-[28px] border border-white/65 bg-white/72 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-black text-slate-900'>任务列表</h2>
            <span className='text-sm text-slate-500'>共 {total} 个任务</span>
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent'></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className='py-12 text-center text-slate-500'>
              <div className='mb-4 text-4xl'>📭</div>
              <p>暂无任务</p>
            </div>
          ) : (
            <>
              <div className='space-y-3'>
                {tasks.map((task, index) => {
                  const statusInfo = getStatusInfo(task.status);
                  const deadlineInfo = getDeadlineInfo(task.deadline, task.status);
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
                      className={`group cursor-pointer rounded-[24px] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.1)] md:p-5 ${statusInfo.card}`}
                      onClick={() => {
                        if (task.status === 'pending' || task.status === 'rejected') {
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

                        <div className='flex-1 min-w-0'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                              <h3 className='truncate text-[15px] font-extrabold text-slate-900 md:text-base'>
                                {task.name}
                              </h3>
                              <p className='mt-1 line-clamp-2 text-xs text-slate-500'>
                                {task.description || '暂无描述'}
                              </p>
                            </div>
                            <span className='shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100'>
                              +{task.points} 分
                            </span>
                          </div>

                          <div className='flex flex-wrap items-center gap-2 mt-3'>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}
                              />
                              {statusInfo.label}
                            </span>

                            {deadlineInfo && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${deadlineInfo.className}`}
                              >
                                <Calendar size={12} />
                                {deadlineInfo.label}
                              </span>
                            )}

                            {task.startDate && (
                              <span className='inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100'>
                                <span className='h-1.5 w-1.5 rounded-full bg-indigo-500' />
                                开始 {dayjs(task.startDate).format('MM/DD')}
                              </span>
                            )}

                            {task.deadline && (
                              <span className='inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100'>
                                <span className='h-1.5 w-1.5 rounded-full bg-rose-500' />
                                截止 {dayjs(task.deadline).format('MM/DD')}
                              </span>
                            )}

                            {task.updatedAt && (
                              <span className='text-xs text-slate-400'>
                                更新于 {dayjs(task.updatedAt).format('YYYY/MM/DD')}
                              </span>
                            )}
                          </div>

                          {parentFeedback ? (
                            <div className={`mt-2 rounded-xl border px-2 py-1.5 text-xs ${parentFeedback.className}`}>
                              <span className='font-bold'>{parentFeedback.label}：</span>
                              <span className='ml-1 font-medium'>{parentFeedback.text}</span>
                            </div>
                          ) : task.rejectionReason ? (
                            <p className='mt-2 rounded-xl bg-rose-50/80 px-2 py-1.5 text-xs text-rose-600 ring-1 ring-rose-100'>
                              ✏️ {task.rejectionReason}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className='mt-3 flex justify-end'>
                        {isPending && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTask(task);
                            }}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${statusInfo.action}`}
                          >
                            开始任务
                          </button>
                        )}
                        {isRejected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSubmitModal(task);
                            }}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${statusInfo.action}`}
                          >
                            重新提交
                          </button>
                        )}
                        {isInProgress && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSubmitModal(task);
                            }}
                            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
                          >
                            提交审核
                          </button>
                        )}
                        {isSubmitted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecallTask(task);
                            }}
                            disabled={recallingTaskId === task._id}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${statusInfo.action}`}
                          >
                            {recallingTaskId === task._id
                              ? '撤回中...'
                              : '撤回修改'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className='flex justify-center items-center gap-2 mt-6'>
                  <Button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    variant='secondary'
                    className='h-10 w-10 rounded-full p-0'
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
                          className={`h-10 w-10 rounded-full text-sm font-bold ${page === pageNum
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
                    className='h-10 w-10 rounded-full p-0'
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
      <Modal
        isOpen={!!showTaskDetail}
        onClose={() => setShowTaskDetail(null)}
        showCloseButton={false}
        footer={
          selectedTask?.status === 'pending' ? (
            <button
              className='w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 py-4 !font-bold text-lg text-white shadow-xl'
              onClick={() => {
                setShowTaskDetail(null);
                handleStartTask(selectedTask);
              }}
            >
              🚀 开始任务
            </button>
          ) : selectedTask?.status === 'rejected' ? (
            <button
              className='w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 py-4 !font-bold text-lg text-white shadow-xl'
              onClick={() => openSubmitModal(selectedTask)}
            >
              💪 重新提交
            </button>
          ) : selectedTask?.status === 'in_progress' ? (
            <button
              className='w-full rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 py-4 !font-bold text-lg text-white shadow-xl'
              onClick={() => {
                setShowTaskDetail(null);
                openSubmitModal(selectedTask);
              }}
            >
              ✅ 提交审核
            </button>
          ) : selectedTask?.status === 'submitted' ? (
            <button
              className='w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 py-4 !font-bold text-lg text-white shadow-xl'
              onClick={() => {
                setShowTaskDetail(null);
                handleRecallTask(selectedTask);
              }}
            >
              🔙 撤回修改
            </button>
          ) : (
            <button
              className='w-full rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 py-4 !font-bold text-lg text-white shadow-xl'
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
              <div className='w-24 h-24 bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 rounded-[2rem] flex items-center justify-center text-6xl shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_30px_rgba(251,146,60,0.15)] border border-amber-200/70'>
                {selectedTask.icon}
              </div>
              <div className='flex-1'>
                <h3 className='text-2xl font-black text-slate-950 leading-tight'>
                  {selectedTask.name}
                </h3>
                <div className='flex items-center gap-2 mt-2 flex-wrap'>
                  <span className='text-amber-600 font-black text-lg'>
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
                <div className='bg-white p-5 rounded-2xl border border-slate-200 shadow-sm'>
                  {selectedTask.imageUrl ? (
                    <>
                      <h4 className='text-xs font-black text-slate-500 uppercase tracking-wider mb-2'>
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
                      <h4 className='text-xs font-black text-slate-500 uppercase tracking-wider mb-2'>
                        任务描述
                      </h4>
                      <p className='text-slate-700 font-medium leading-relaxed'>
                        {selectedTask.description || '快去完成这个任务吧！'}
                      </p>
                    </>
                  ) : null}

                  {selectedTask.requirePhoto && (
                    <div className='mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200'>
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

                      <div className='bg-white p-5 rounded-2xl border border-slate-200 shadow-sm'>
                        <h4 className='text-xs font-black text-green-600 uppercase tracking-wider mb-2'>
                          {selectedTask.status === 'approved'
                            ? '✅ 审核通过'
                            : selectedTask.status === 'rejected'
                              ? '❌ 已拒绝'
                              : '⏳ 审核中'}
                        </h4>
                        <div className='space-y-2'>
                          {selectedTask.startDate && (
                            <div className='flex justify-between items-center'>
                              <span className='text-sm text-slate-600'>开始时间</span>
                              <span className='text-sm font-bold text-slate-800'>
                                {dayjs(selectedTask.startDate).format('M月D日 HH:mm')}
                              </span>
                            </div>
                          )}
                          {selectedTask.deadline && (
                            <div className='flex justify-between items-center'>
                              <span className='text-sm text-slate-600'>截止时间</span>
                              <span className='text-sm font-bold text-slate-800'>
                                {dayjs(selectedTask.deadline).format('M月D日 HH:mm')}
                              </span>
                            </div>
                          )}
                          {selectedTask.submittedAt && (
                            <div className='flex justify-between items-center'>
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
                              <div className='flex justify-between items-center'>
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
                            <div className='flex justify-between items-center'>
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
                    <div className='bg-white p-5 rounded-2xl border border-slate-200 shadow-sm'>
                      <h4 className='text-xs font-black text-slate-500 uppercase tracking-wider mb-4'>
                        📋 操作记录 ({selectedTask.auditHistory.length})
                      </h4>
                      <div className='space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar'>
                        {selectedTask.auditHistory.map((record, index) => (
                          <div
                            key={record._id || index}
                            className={`relative pl-4 pb-3 ${index !== selectedTask.auditHistory!.length - 1 ? 'border-l-2 border-slate-200' : ''}`}
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
                                <span className='text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100'>
                                  第 {index + 1}{' '}
                                  次操作
                                </span>
                                {record.status === 'approved' ? (
                                  <span className='text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100'>
                                    通过
                                  </span>
                                ) : record.status === 'rejected' ? (
                                  <span className='text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100'>
                                    驳回
                                  </span>
                                ) : (
                                  <span className='text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100'>
                                    审核中
                                  </span>
                                )}
                              </div>
                              <p className='text-xs text-slate-500 mb-1'>
                                提交:{' '}
                                {dayjs(record.submittedAt).format(
                                  'M月D日 HH:mm',
                                )}
                              </p>
                              {record.auditedAt && (
                                <p className='text-xs text-slate-500 mb-1'>
                                  审核:{' '}
                                  {dayjs(record.auditedAt).format(
                                    'M月D日 HH:mm',
                                  )}
                                </p>
                              )}
                              {/* 提交的照片 */}
                              {record.photoUrl && (
                                <div className='mt-2'>
                                  <p className='text-xs text-slate-500 mb-1'>
                                    提交的照片：
                                  </p>
                                  <div className='w-20 h-20 rounded-xl overflow-hidden border border-blue-200 shadow-sm bg-white'>
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
                                <div className='mt-2 bg-white rounded-lg p-2 border border-slate-200'>
                                  <p className='text-xs text-slate-500 mb-1'>
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
            {/* 滚动区域结束 */}
          </>
        )}
      </Modal>

      {/* 提交任务弹窗 */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => {
          setShowSubmitModal(false);
          setPhotoPreview('');
        }}
        showCloseButton={false}
        footer={
          <>
            <button
              className='flex-1 py-4 !rounded-2xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 border-none'
              onClick={() => {
                setShowSubmitModal(false);
                setPhotoPreview('');
              }}
            >
              取消
            </button>
            <button
              className='flex-1 py-4 !rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-xl hover:shadow-2xl hover:shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed'
              onClick={handleSubmitTask}
              disabled={
                submitting || (selectedTask?.requirePhoto && !photoFile)
              }
            >
              {submitting ? '提交中...' : '提交审核'}
            </button>
          </>
        }
      >
        {selectedTask && (
          <>
            <div className='text-center mb-8'>
              <div className='mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-sky-50 via-blue-100 to-indigo-100 text-7xl shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_30px_rgba(59,130,246,0.12)] border border-sky-100'>
                {selectedTask.icon}
              </div>
              <h3 className='text-2xl font-black text-slate-900'>
                {selectedTask.name}
              </h3>
              <div className='mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 font-black text-white shadow-[0_12px_24px_rgba(59,130,246,0.18)]'>
                <span>⚡</span>
                <span>+{selectedTask.points} 积分</span>
              </div>
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
                className='group relative cursor-pointer rounded-[2rem] border-4 border-dashed border-slate-200 p-2 transition-all hover:border-sky-300 hover:bg-sky-50/30'
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
                    <div className='absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100'>
                      <span className='rounded-full bg-white/95 px-5 py-2.5 text-sm font-bold text-slate-800 backdrop-blur-sm'>
                        📷 更换照片
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className='flex flex-col items-center gap-4 py-10'>
                    <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-indigo-100'>
                      <span className='text-4xl'>📸</span>
                    </div>
                    <div className='text-center'>
                      <p className='text-lg font-black text-slate-800'>
                        上传任务照片
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {selectedTask.requirePhoto
                          ? '⚠️ 必须上传照片'
                          : '✨ 上传更容易通过'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* 图片全屏预览 Modal */}
    </>
  );
}

// 包装组件以添加 Suspense
export default function TaskPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    }>
      <TaskPage />
    </Suspense>
  );
}
