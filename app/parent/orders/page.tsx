'use client';

import { IDisplayedOrder } from '@/app/typings';
import ConfirmModal from '@/components/ConfirmModal';
import ChildFilterSelect from '@/components/parent/ChildFilterSelect';
import { Badge, EmptyState, StatCard } from '@/components/store/RewardUI';
import { Button, Input, TabFilter } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/utils/date';
import request from '@/utils/request';
import {
  BadgeCheck,
  CircleCheckBig,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Gift,
  Ticket,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

function OrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');
  const initialActiveTab: 'pending' | 'verified' | 'cancelled' =
    initialStatus === 'cancelled'
      ? 'cancelled'
      : initialStatus === 'history' || initialStatus === 'verified'
        ? 'verified'
        : 'pending';
  const initialChildFilter = searchParams.get('childId') || 'all';
  const { childList } = useApp();
  const [activeTab, setActiveTab] = useState<
    'pending' | 'verified' | 'cancelled'
  >(initialActiveTab);
  const [pendingOrders, setPendingOrders] = useState<IDisplayedOrder[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [verifiedOrders, setVerifiedOrders] = useState<IDisplayedOrder[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<IDisplayedOrder[]>([]);
  const [verifiedPage, setVerifiedPage] = useState(1);
  const [verifiedTotal, setVerifiedTotal] = useState(0);
  const [cancelledPage, setCancelledPage] = useState(1);
  const [cancelledTotal, setCancelledTotal] = useState(0);
  const [selectedChildFilter, setSelectedChildFilter] =
    useState<string>(initialChildFilter);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pendingPageCount = useMemo(
    () => Math.max(1, Math.ceil(pendingTotal / 10)),
    [pendingTotal],
  );
  const verifiedPageCount = useMemo(
    () => Math.max(1, Math.ceil(verifiedTotal / 10)),
    [verifiedTotal],
  );
  const cancelledPageCount = useMemo(
    () => Math.max(1, Math.ceil(cancelledTotal / 10)),
    [cancelledTotal],
  );

  const fetchOrders = useCallback(
    async (status: string, page: number = 1, fetchLimit: number = 100) => {
      const params: Record<string, string | number> = {
        status,
        page,
        limit: fetchLimit,
      };

      if (selectedChildFilter !== 'all') {
        params.childId = selectedChildFilter;
      }

      const data = (await request('/api/orders', {
        params,
      })) as { success: boolean; orders: IDisplayedOrder[]; total: number };

      if (data.success) {
        return { orders: data.orders, total: data.total };
      }
      return { orders: [], total: 0 };
    },
    [selectedChildFilter],
  );

  const refreshPending = useCallback(async () => {
    const { orders, total } = await fetchOrders('pending', pendingPage, 10);
    setPendingOrders(orders);
    setPendingTotal(total);
  }, [fetchOrders, pendingPage]);

  const refreshVerified = useCallback(async () => {
    const { orders, total } = await fetchOrders('verified', verifiedPage, 10);
    setVerifiedOrders(orders);
    setVerifiedTotal(total);
  }, [fetchOrders, verifiedPage]);

  const refreshCancelled = useCallback(async () => {
    const { orders, total } = await fetchOrders('cancelled', cancelledPage, 10);
    setCancelledOrders(orders);
    setCancelledTotal(total);
  }, [fetchOrders, cancelledPage]);

  useEffect(() => {
    void Promise.all([refreshPending(), refreshVerified(), refreshCancelled()]);
  }, [refreshCancelled, refreshPending, refreshVerified]);

  useEffect(() => {
    if (activeTab === 'pending') {
      void refreshPending();
    }
    if (activeTab === 'verified') {
      void refreshVerified();
    }
    if (activeTab === 'cancelled') {
      void refreshCancelled();
    }
  }, [activeTab, refreshCancelled, refreshPending, refreshVerified]);

  useEffect(() => {
    setPendingPage(1);
    setVerifiedPage(1);
    setCancelledPage(1);
  }, [selectedChildFilter]);

  const handleVerifyOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      await request('/api/orders', {
        method: 'PUT',
        body: { orderId, action: 'verify' },
      });
      await refreshPending();
      await refreshVerified();
      if (activeTab === 'cancelled') {
        await refreshCancelled();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      await request('/api/orders', {
        method: 'PUT',
        body: { orderId, action: 'cancel' },
      });
      await refreshPending();
      await refreshCancelled();
      if (activeTab === 'verified') await refreshVerified();
      setCancelOrderId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const orderTabs = [
    { key: 'pending', label: `待核销 (${pendingTotal})` },
    { key: 'verified', label: `已核销 (${verifiedTotal})` },
    { key: 'cancelled', label: `已取消 (${cancelledTotal})` },
  ] as const;

  const pendingTotalPoints = useMemo(
    () =>
      pendingOrders.reduce((sum, order) => sum + (order.pointsSpent || 0), 0),
    [pendingOrders],
  );

  const verifiedCount = useMemo(
    () => verifiedTotal,
    [verifiedTotal],
  );

  const cancelledCount = useMemo(
    () => cancelledTotal,
    [cancelledTotal],
  );

  const filteredPendingOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return pendingOrders;
    return pendingOrders.filter((order) => {
      return (
        order.rewardName.toLowerCase().includes(keyword) ||
        order.childName.toLowerCase().includes(keyword) ||
        order.verificationCode.toLowerCase().includes(keyword)
      );
    });
  }, [pendingOrders, searchQuery]);

  const filteredVerifiedOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return verifiedOrders;
    return verifiedOrders.filter((order) => {
      return (
        order.rewardName.toLowerCase().includes(keyword) ||
        order.childName.toLowerCase().includes(keyword) ||
        order.verificationCode.toLowerCase().includes(keyword)
      );
    });
  }, [verifiedOrders, searchQuery]);

  const filteredCancelledOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return cancelledOrders;
    return cancelledOrders.filter((order) => {
      return (
        order.rewardName.toLowerCase().includes(keyword) ||
        order.childName.toLowerCase().includes(keyword) ||
        order.verificationCode.toLowerCase().includes(keyword)
      );
    });
  }, [cancelledOrders, searchQuery]);

  return (
    <div className='space-y-6'>
      <ConfirmModal
        isOpen={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirm={() => cancelOrderId && handleCancelOrder(cancelOrderId)}
        title='取消兑换'
        message='确定取消这个兑换吗？积分将退还给孩子。'
        confirmText='确认取消'
        cancelText='返回'
        type='danger'
      />

      <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          title='待核销'
          value={pendingTotal}
          icon={<Ticket size={16} className='text-blue-500' />}
          hint='需要你确认的订单'
        />
        <StatCard
          title='待扣积分'
          value={pendingTotalPoints}
          icon={<CreditCard size={16} className='text-amber-500' />}
          hint='待核销订单消耗总分'
        />
        <StatCard
          title='已核销'
          value={verifiedCount}
          icon={<CircleCheckBig size={16} className='text-emerald-500' />}
          hint='已完成核销的订单总数'
        />
        <StatCard
          title='已取消'
          value={cancelledCount}
          icon={<X size={16} className='text-rose-500' />}
          hint='需要退回积分的订单'
        />
      </section>

      <section className='rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]'>
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center'>
          <div className='flex min-w-0 items-center gap-3 overflow-x-auto xl:overflow-visible'>
            <TabFilter
              items={orderTabs}
              activeKey={activeTab}
              onFilterChange={(key) =>
                setActiveTab(key as 'pending' | 'verified' | 'cancelled')
              }
              className='shrink-0 [&_button]:h-11 [&_button]:px-5 [&_button]:py-0 [&_button]:tracking-wide'
            />
            <div className='w-[300px] shrink-0'>
              <Input
                type='text'
                placeholder='搜索孩子、商品或核销码'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                isSearch
                allowClear
                size='md'
                containerClassName='w-full'
              />
            </div>
          </div>

          <ChildFilterSelect
            childList={childList.map((child) => ({
              id: child.id,
              username: child.username,
              avatar: child.avatar,
            }))}
            selectedChildId={
              selectedChildFilter === 'all' ? null : selectedChildFilter
            }
            onChange={(value) => {
              setSelectedChildFilter(value ?? 'all');
            }}
            className='shrink-0 justify-self-start xl:justify-self-end'
            buttonClassName='h-11 min-w-[140px] justify-between rounded-2xl border-slate-200 bg-white px-4 text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50'
          />
        </div>
      </section>

      {activeTab === 'pending' ? (
        filteredPendingOrders.length === 0 ? (
          <EmptyState
            title='暂无待核销记录'
            hint='孩子兑换后会出现在这里，等你确认处理。'
          />
        ) : (
          <div className='grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]'>
            <div className='space-y-4'>
              {filteredPendingOrders.map((order) => (
                <OrderCard
                  key={order._id.toString()}
                  order={order}
                  statusLabel='待核销'
                  statusTone='amber'
                  actionArea={
                    <div className='flex w-full items-center gap-2 whitespace-nowrap'>
                      <Button
                        size='sm'
                        variant='success'
                        onClick={() => handleVerifyOrder(order._id)}
                        disabled={actionLoading}
                        className='min-w-0 flex-1'
                      >
                        <BadgeCheck size={16} />
                        确认核销
                      </Button>
                      <Button
                        size='sm'
                        variant='error'
                        onClick={() => setCancelOrderId(order._id)}
                        disabled={actionLoading}
                        className='min-w-0 px-4'
                      >
                        取消
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>

            <div className='space-y-4'>
              <SummaryPanel
                title='待核销分页'
                rows={[
                  ['当前页', `${pendingPage}`],
                  ['总页数', `${pendingPageCount}`],
                  ['总记录', `${pendingTotal}`],
                ]}
                compact
              >
                <InlinePagination
                  currentPage={pendingPage}
                  totalPages={pendingPageCount}
                  onPageChange={setPendingPage}
                  onPrev={() => setPendingPage((p) => Math.max(1, p - 1))}
                  onNext={() =>
                    setPendingPage((p) => Math.min(pendingPageCount, p + 1))
                  }
                />
              </SummaryPanel>

              <SummaryPanel
                title='当前筛选'
                rows={[
                  [
                    '孩子范围',
                    selectedChildFilter === 'all'
                      ? '全部孩子'
                      : childList.find(
                          (child) => child.id === selectedChildFilter,
                        )?.username || '未知',
                  ],
                  ['待核销数', String(filteredPendingOrders.length)],
                  ['待扣积分', String(pendingTotalPoints)],
                ]}
              />
            </div>
          </div>
        )
      ) : activeTab === 'verified' ? (
        <>
          {filteredVerifiedOrders.length === 0 ? (
            <EmptyState
              title='暂无已核销记录'
              hint='完成核销后的订单会在这里显示。'
            >
              <div className='mt-2 text-xs text-slate-400'>
                可以切换孩子筛选或输入关键字查找记录。
              </div>
            </EmptyState>
          ) : (
            <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]'>
              <div className='space-y-4'>
                {filteredVerifiedOrders.map((order) => (
                  <OrderCard
                    key={order._id.toString()}
                    order={order}
                    statusLabel='已核销'
                    statusTone='emerald'
                    actionArea={
                      <div className='flex w-full items-center justify-between gap-2 whitespace-nowrap text-sm'>
                        <div className='text-xs font-semibold text-slate-500'>
                          完成时间
                        </div>
                        <div className='text-sm font-medium text-slate-900'>
                          {order.verifiedAt
                            ? formatDate(order.verifiedAt)
                            : formatDate(order.updatedAt)}
                        </div>
                      </div>
                    }
                  />
                ))}
              </div>

              <div className='space-y-4'>
                <SummaryPanel
                  title='已核销分页'
                  rows={[
                    ['当前页', `${verifiedPage}`],
                    ['总页数', `${verifiedPageCount}`],
                    ['总记录', `${verifiedTotal}`],
                  ]}
                  compact
                >
                  <InlinePagination
                    currentPage={verifiedPage}
                    totalPages={verifiedPageCount}
                    onPageChange={setVerifiedPage}
                    onPrev={() => setVerifiedPage((p) => Math.max(1, p - 1))}
                    onNext={() =>
                      setVerifiedPage((p) => Math.min(verifiedPageCount, p + 1))
                    }
                  />
                </SummaryPanel>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {filteredCancelledOrders.length === 0 ? (
            <EmptyState
              title='暂无已取消记录'
              hint='取消兑换后的订单会在这里显示。'
            >
              <div className='mt-2 text-xs text-slate-400'>
                可以切换孩子筛选或输入关键字查找记录。
              </div>
            </EmptyState>
          ) : (
            <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]'>
              <div className='space-y-4'>
                {filteredCancelledOrders.map((order) => (
                  <OrderCard
                    key={order._id.toString()}
                    order={order}
                    statusLabel='已取消'
                    statusTone='rose'
                    actionArea={
                      <div className='flex w-full items-center justify-between gap-2 whitespace-nowrap text-sm'>
                        <div className='text-xs font-semibold text-slate-500'>
                          取消时间
                        </div>
                        <div className='text-sm font-medium text-slate-900'>
                          {formatDate(order.updatedAt)}
                        </div>
                      </div>
                    }
                  />
                ))}
              </div>

              <div className='space-y-4'>
                <SummaryPanel
                  title='已取消分页'
                  rows={[
                    ['当前页', `${cancelledPage}`],
                    ['总页数', `${cancelledPageCount}`],
                    ['总记录', `${cancelledTotal}`],
                  ]}
                  compact
                >
                  <InlinePagination
                    currentPage={cancelledPage}
                    totalPages={cancelledPageCount}
                    onPageChange={setCancelledPage}
                    onPrev={() =>
                      setCancelledPage((p) => Math.max(1, p - 1))
                    }
                    onNext={() =>
                      setCancelledPage((p) =>
                        Math.min(cancelledPageCount, p + 1),
                      )
                    }
                  />
                </SummaryPanel>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryPanel({
  title,
  rows,
  children,
  compact = false,
}: {
  title: string;
  rows: [string, string | undefined][];
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className='rounded-[28px] border border-slate-200/70 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]'>
      <h3 className='text-base font-bold text-slate-900'>{title}</h3>
      <div
        className={
          compact
            ? 'mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600'
            : 'mt-4 space-y-2 text-sm text-slate-600'
        }
      >
        {rows.map(([label, value]) => (
          <div
            key={label}
            className={
              compact
                ? 'inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2.5'
                : 'flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3'
            }
          >
            <span>{label}</span>
            <span className='font-medium text-slate-900'>{value || '-'}</span>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function InlinePagination({
  currentPage,
  totalPages,
  onPageChange,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [jumpValue, setJumpValue] = useState('');

  useEffect(() => {
    setJumpValue('');
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages] as const;
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        'ellipsis',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ] as const;
    }

    return [
      1,
      'ellipsis',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      'ellipsis',
      totalPages,
    ] as const;
  }, [currentPage, totalPages]);

  const handleJump = () => {
    const page = Number(jumpValue);
    if (!Number.isFinite(page)) return;
    const nextPage = Math.min(totalPages, Math.max(1, page));
    onPageChange(nextPage);
  };

  return (
    <div className='mt-4 flex flex-wrap items-center gap-3'>
      <Button
        variant='secondary'
        disabled={currentPage === 1}
        onClick={onPrev}
        className='min-w-0 rounded-2xl px-3 text-slate-600 disabled:opacity-30'
      >
        <ChevronLeft size={16} />
      </Button>

      <div className='flex items-center gap-2'>
        {pageItems.map((item, index) =>
          item === 'ellipsis' ? (
            <div
              key={`ellipsis-${index}`}
              className='inline-flex h-11 min-w-[2.75rem] items-center justify-center text-lg font-bold tracking-[0.2em] text-slate-300'
            >
              ...
            </div>
          ) : (
            <button
              key={item}
              type='button'
              onClick={() => onPageChange(item)}
              className={
                item === currentPage
                  ? 'inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-2xl border border-blue-300 bg-blue-50 text-base font-bold text-blue-600 shadow-[0_8px_18px_rgba(59,130,246,0.12)]'
                  : 'inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-2xl border border-transparent bg-transparent text-base font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800'
              }
            >
              {item}
            </button>
          ),
        )}
      </div>

      <Button
        variant='secondary'
        disabled={currentPage >= totalPages}
        onClick={onNext}
        className='min-w-0 rounded-2xl px-3 text-slate-600 disabled:opacity-30'
      >
        <ChevronRight size={16} />
      </Button>

      <div className='inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm'>
        10 条/页
      </div>

      <div className='flex items-center gap-2 text-sm font-medium text-slate-600'>
        <span>跳至</span>
        <input
          type='number'
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleJump();
            }
          }}
          className='h-11 w-20 rounded-2xl border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100'
        />
        <span>页</span>
      </div>

      <Button
        variant='secondary'
        onClick={handleJump}
        disabled={!jumpValue.trim()}
        className='rounded-2xl px-4 text-slate-600 disabled:opacity-30'
      >
        跳转
      </Button>
    </div>
  );
}

function OrderCard({
  order,
  statusLabel,
  statusTone,
  actionArea,
}: {
  order: IDisplayedOrder;
  statusLabel: string;
  statusTone: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue';
  actionArea: ReactNode;
}) {
  const isPending = statusTone === 'amber';
  const accentClassMap: Record<typeof statusTone, string> = {
    slate:
      'from-slate-100/90 via-white to-slate-50 border-slate-200/80 text-slate-700 shadow-[0_12px_28px_rgba(100,116,139,0.12)]',
    emerald:
      'from-emerald-100/90 via-white to-emerald-50 border-emerald-200/80 text-emerald-700 shadow-[0_12px_28px_rgba(16,185,129,0.12)]',
    amber:
      'from-amber-100/90 via-white to-orange-50 border-amber-200/80 text-amber-700 shadow-[0_12px_28px_rgba(245,158,11,0.14)]',
    rose:
      'from-rose-100/90 via-white to-rose-50 border-rose-200/80 text-rose-700 shadow-[0_12px_28px_rgba(244,63,94,0.12)]',
    blue:
      'from-blue-100/90 via-white to-cyan-50 border-blue-200/80 text-blue-700 shadow-[0_12px_28px_rgba(59,130,246,0.12)]',
  };

  const accentGlowMap: Record<typeof statusTone, string> = {
    slate: 'bg-slate-200/60',
    emerald: 'bg-emerald-200/60',
    amber: 'bg-amber-200/60',
    rose: 'bg-rose-200/60',
    blue: 'bg-blue-200/60',
  };

  return (
    <div className='group relative overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.92)_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(15,23,42,0.11)] sm:p-6'>
      <div
        className={`pointer-events-none absolute right-[-28px] top-[-36px] h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${accentGlowMap[statusTone]} opacity-80`}
      />

      <div className='relative flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-start gap-4'>
            <div className='flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-100 via-white to-orange-100 text-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_26px_rgba(251,191,36,0.16)] ring-1 ring-white/80'>
              {order.rewardIcon || '🎁'}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge tone={statusTone}>{statusLabel}</Badge>
                <span className='inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-white/90'>
                  {isPending ? '等待处理' : '处理已完成'}
                </span>
              </div>
              <h3 className='mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-[22px]'>
                {order.rewardName}
              </h3>
              <div className='mt-3 flex flex-wrap items-center gap-2.5 text-sm text-slate-500'>
                <span className='inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 font-semibold text-amber-700'>
                  <Gift size={14} />
                  {order.pointsSpent} 积分
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5'>
                  <Clock3 size={14} />
                  {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className='mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(220px,1.05fr)]'>
            <div className='flex items-center gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]'>
              <div className='flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-50 text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_10px_rgba(15,23,42,0.05)]'>
                {order.childAvatar}
              </div>
              <div className='min-w-0'>
                <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>
                  兑换人
                </div>
                <div className='mt-1 truncate text-base font-bold text-slate-900'>
                  {order.childName}
                </div>
              </div>
            </div>

            <div
              className={`rounded-[24px] border bg-gradient-to-r px-4 py-4 ${accentClassMap[statusTone]}`}
            >
              <div className='text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80'>
                Verification Code
              </div>
              <div className='mt-2 font-mono text-lg font-black tracking-[0.22em] text-slate-950 sm:text-[20px]'>
                {order.verificationCode}
              </div>
            </div>
          </div>
        </div>

        <div className='md:w-[198px] md:shrink-0'>
          <div className='w-full overflow-x-auto'>{actionArea}</div>
        </div>
      </div>
    </div>
  );
}

// 包装组件以添加 Suspense
export default function OrdersPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-[400px] items-center justify-center'>
          <div className='text-center'>
            <div className='mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500'></div>
            <p className='text-slate-500'>加载中...</p>
          </div>
        </div>
      }
    >
      <OrdersPage />
    </Suspense>
  );
}
