'use client';

import { IDisplayedOrder } from '@/app/typings';
import ConfirmModal from '@/components/ConfirmModal';
import ChildFilterSelect from '@/components/parent/ChildFilterSelect';
import { Badge, EmptyState, StatCard } from '@/components/store/RewardUI';
import { Button, Input, Pagination, TabFilter } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/utils/date';
import { resolveOrderActionResult } from '@/utils/orderActions.mjs';
import request from '@/utils/request';
import {
  BadgeCheck,
  CircleCheckBig,
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
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    'pending' | 'verified' | 'cancelled'
  >(initialActiveTab);
  const [pageSize, setPageSize] = useState(10);
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
    const { orders, total } = await fetchOrders('pending', pendingPage, pageSize);
    setPendingOrders(orders);
    setPendingTotal(total);
  }, [fetchOrders, pageSize, pendingPage]);

  const refreshVerified = useCallback(async () => {
    const { orders, total } = await fetchOrders('verified', verifiedPage, pageSize);
    setVerifiedOrders(orders);
    setVerifiedTotal(total);
  }, [fetchOrders, pageSize, verifiedPage]);

  const refreshCancelled = useCallback(async () => {
    const { orders, total } = await fetchOrders(
      'cancelled',
      cancelledPage,
      pageSize,
    );
    setCancelledOrders(orders);
    setCancelledTotal(total);
  }, [cancelledPage, fetchOrders, pageSize]);

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
  }, [pageSize, selectedChildFilter]);

  const handleVerifyOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      const data = (await request('/api/orders', {
        method: 'PUT',
        body: { orderId, action: 'verify' },
      })) as { success: boolean; message?: string };
      const result = resolveOrderActionResult(data, '核销成功', '核销失败');

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await refreshPending();
      await refreshVerified();
      if (activeTab === 'cancelled') {
        await refreshCancelled();
      }
    } catch {
      toast.error('核销失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      const data = (await request('/api/orders', {
        method: 'PUT',
        body: { orderId, action: 'cancel' },
      })) as { success: boolean; message?: string };
      const result = resolveOrderActionResult(data, '取消成功', '取消失败');

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await refreshPending();
      await refreshCancelled();
      if (activeTab === 'verified') await refreshVerified();
      setCancelOrderId(null);
    } catch {
      toast.error('取消失败');
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

  const verifiedCount = useMemo(() => verifiedTotal, [verifiedTotal]);

  const cancelledCount = useMemo(() => cancelledTotal, [cancelledTotal]);

  const filteredPendingOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return pendingOrders;
    return pendingOrders.filter((order) => {
      return (
        order.rewardName.toLowerCase().includes(keyword) ||
        order.childName.toLowerCase().includes(keyword)
      );
    });
  }, [pendingOrders, searchQuery]);

  const filteredVerifiedOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return verifiedOrders;
    return verifiedOrders.filter((order) => {
      return (
        order.rewardName.toLowerCase().includes(keyword) ||
        order.childName.toLowerCase().includes(keyword)
      );
    });
  }, [verifiedOrders, searchQuery]);

  const filteredCancelledOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return cancelledOrders;
    return cancelledOrders.filter((order) => {
      return (
        order.rewardName.toLowerCase().includes(keyword) ||
        order.childName.toLowerCase().includes(keyword)
      );
    });
  }, [cancelledOrders, searchQuery]);

  return (
    <div className='orders-page space-y-6'>
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

      <section className='orders-toolbar rounded-[28px] border border-[color:var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-panel-bg)_0%,var(--ui-panel-bg-subtle)_100%)] p-5 shadow-[var(--ui-shadow-md)] backdrop-blur-xl'>
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
                placeholder='搜索孩子或商品'
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
            buttonClassName='h-11 min-w-[140px] justify-between rounded-full border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-4 text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] transition-all duration-200 hover:border-[color:var(--ui-border-strong)] hover:bg-[var(--ui-surface-2)]'
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
                      className='order-action-confirm min-w-0 flex-1'
                    >
                      <BadgeCheck size={16} />
                      确认核销
                    </Button>
                    <Button
                      size='sm'
                      variant='error'
                      onClick={() => setCancelOrderId(order._id)}
                      disabled={actionLoading}
                      className='order-action-cancel min-w-0 px-4'
                    >
                      取消
                    </Button>
                  </div>
                }
              />
            ))}
            <div className='rounded-[28px] border border-[color:var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-panel-bg)_0%,var(--ui-panel-bg-subtle)_100%)] px-5 py-4 shadow-[var(--ui-shadow-md)] backdrop-blur'>
              <Pagination
                currentPage={pendingPage}
                totalItems={pendingTotal}
                pageSize={pageSize}
                onPageChange={setPendingPage}
                onPageSizeChange={setPageSize}
                variant='rich'
                alwaysShow
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
              <div className='mt-2 text-xs text-[var(--ui-text-soft)]'>
                可以切换孩子筛选或输入关键字查找记录。
              </div>
            </EmptyState>
          ) : (
            <div className='space-y-4'>
              {filteredVerifiedOrders.map((order) => (
                <OrderCard
                  key={order._id.toString()}
                  order={order}
                  statusLabel='已核销'
                  statusTone='emerald'
                  actionArea={
                    <div className='flex w-full flex-col gap-1.5 text-sm'>
                      <div className='text-xs font-semibold tracking-[0.14em] text-[var(--ui-text-muted)]'>
                        完成时间
                      </div>
                      <div className='text-sm font-medium tabular-nums text-[var(--ui-text-primary)]'>
                        {order.verifiedAt
                          ? formatDate(order.verifiedAt)
                          : formatDate(order.updatedAt)}
                      </div>
                    </div>
                  }
                />
              ))}
            <div className='rounded-[28px] border border-[color:var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-panel-bg)_0%,var(--ui-panel-bg-subtle)_100%)] px-5 py-4 shadow-[var(--ui-shadow-md)] backdrop-blur'>
              <Pagination
                  currentPage={verifiedPage}
                  totalItems={verifiedTotal}
                  pageSize={pageSize}
                  onPageChange={setVerifiedPage}
                  onPageSizeChange={setPageSize}
                  variant='rich'
                  alwaysShow
                />
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
              <div className='mt-2 text-xs text-[var(--ui-text-soft)]'>
                可以切换孩子筛选或输入关键字查找记录。
              </div>
            </EmptyState>
          ) : (
            <div className='space-y-4'>
              {filteredCancelledOrders.map((order) => (
                <OrderCard
                  key={order._id.toString()}
                  order={order}
                  statusLabel='已取消'
                  statusTone='rose'
                  actionArea={
                    <div className='flex w-full flex-col gap-1.5 text-sm'>
                      <div className='text-xs font-semibold tracking-[0.14em] text-[var(--ui-text-muted)]'>
                        取消时间
                      </div>
                      <div className='text-sm font-medium tabular-nums text-[var(--ui-text-primary)]'>
                        {formatDate(order.updatedAt)}
                      </div>
                    </div>
                  }
                />
              ))}
            <div className='rounded-[28px] border border-[color:var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-panel-bg)_0%,var(--ui-panel-bg-subtle)_100%)] px-5 py-4 shadow-[var(--ui-shadow-md)] backdrop-blur'>
              <Pagination
                  currentPage={cancelledPage}
                  totalItems={cancelledTotal}
                  pageSize={pageSize}
                  onPageChange={setCancelledPage}
                  onPageSizeChange={setPageSize}
                  variant='rich'
                  alwaysShow
                />
              </div>
            </div>
          )}
        </>
      )}
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
      'border-[color:var(--ui-border)] bg-[linear-gradient(135deg,var(--ui-surface-2)_0%,var(--ui-panel-bg)_100%)] text-[var(--ui-text-secondary)] shadow-[var(--ui-shadow-sm)]',
    emerald:
      'border-[color:var(--ui-success-border)] bg-[linear-gradient(135deg,var(--ui-success-bg)_0%,var(--ui-panel-bg)_100%)] text-[var(--ui-success-text)] shadow-[var(--ui-status-success-shadow)]',
    amber:
      'border-[color:var(--ui-warning-border)] bg-[linear-gradient(135deg,var(--ui-warning-bg)_0%,var(--ui-panel-bg)_100%)] text-[var(--ui-warning-text)] shadow-[var(--ui-status-warning-shadow)]',
    rose:
      'border-[color:var(--ui-danger-border)] bg-[linear-gradient(135deg,var(--ui-danger-bg)_0%,var(--ui-panel-bg)_100%)] text-[var(--ui-danger-text)] shadow-[var(--ui-status-error-shadow)]',
    blue:
      'border-[color:var(--ui-action-blue-border)] bg-[var(--ui-action-blue-bg)] text-[var(--ui-action-blue-text)] shadow-[var(--ui-primary-soft-shadow)]',
  };

  const accentGlowMap: Record<typeof statusTone, string> = {
    slate: 'bg-slate-400/20',
    emerald: 'bg-emerald-400/24',
    amber: 'bg-amber-300/28',
    rose: 'bg-rose-400/24',
    blue: 'bg-sky-400/24',
  };

  return (
    <div className='order-card group relative overflow-hidden rounded-[28px] border border-[color:var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-panel-bg)_0%,var(--ui-panel-bg-subtle)_100%)] p-5 shadow-[var(--ui-shadow-md)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--ui-shadow-lg)] sm:p-6'>
      <div
        className={`pointer-events-none absolute right-[-28px] top-[-36px] h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${accentGlowMap[statusTone]} opacity-80`}
      />

      <div className='relative flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-start gap-4'>
            <div className='flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[26px] border border-[color:var(--ui-warning-border)] bg-[linear-gradient(135deg,var(--ui-warning-bg)_0%,var(--ui-surface-1)_100%)] text-3xl shadow-[var(--ui-status-warning-shadow)]'>
              {order.rewardIcon || '🎁'}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge tone={statusTone}>{statusLabel}</Badge>
                <span className='inline-flex items-center rounded-full border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-[var(--ui-text-secondary)]'>
                  {isPending ? '等待处理' : '处理已完成'}
                </span>
              </div>
              <h3 className='mt-3 text-xl font-black tracking-tight text-[var(--ui-text-primary)] sm:text-[22px]'>
                {order.rewardName}
              </h3>
              <div className='mt-3 flex flex-wrap items-center gap-2.5 text-sm text-[var(--ui-text-muted)]'>
                <span className='inline-flex items-center gap-1.5 rounded-full border border-[color:var(--ui-warning-border)] bg-[var(--ui-warning-bg)] px-3 py-1.5 font-semibold text-[var(--ui-warning-text)]'>
                  <Gift size={14} />
                  {order.pointsSpent} 积分
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-3 py-1.5 text-[var(--ui-text-secondary)]'>
                  <Clock3 size={14} />
                  {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className='mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(220px,1.05fr)]'>
            <div className='flex items-center gap-3 rounded-[24px] border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-4 py-4 shadow-[var(--ui-shadow-sm)]'>
              <div className='flex h-12 w-12 items-center justify-center rounded-[18px] border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] text-xl shadow-[var(--ui-shadow-sm)]'>
                {order.childAvatar}
              </div>
              <div className='min-w-0'>
                <div className='text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-text-soft)]'>
                  兑换人
                </div>
                <div className='mt-1 truncate text-base font-bold text-[var(--ui-text-primary)]'>
                  {order.childName}
                </div>
              </div>
            </div>

            <div
              className={`rounded-[24px] border px-4 py-4 ${accentClassMap[statusTone]}`}
            >
              <div className='text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75'>
                兑换状态
              </div>
              <div className='mt-2 font-mono text-lg font-black tracking-[0.22em] text-current sm:text-[20px]'>
                {order.status === 'pending' ? '待核销' : order.status === 'verified' ? '已核销' : '已取消'}
              </div>
            </div>
          </div>
        </div>

        <div className='md:w-[198px] md:shrink-0'>
          <div className='w-full rounded-[22px]'>{actionArea}</div>
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
            <div className='mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-[color:var(--ui-border)] border-t-[color:var(--ui-focus)]'></div>
            <p className='text-[var(--ui-text-muted)]'>加载中...</p>
          </div>
        </div>
      }
    >
      <OrdersPage />
    </Suspense>
  );
}
