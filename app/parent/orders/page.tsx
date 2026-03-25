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
  const initialActiveTab: 'pending' | 'history' =
    initialStatus === 'history' ? 'history' : 'pending';
  const initialChildFilter = searchParams.get('childId') || 'all';
  const { childList } = useApp();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>(
    initialActiveTab,
  );
  const [pendingOrders, setPendingOrders] = useState<IDisplayedOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<IDisplayedOrder[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [selectedChildFilter, setSelectedChildFilter] =
    useState<string>(initialChildFilter);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const historyPageCount = useMemo(
    () => Math.max(1, Math.ceil(historyTotal / 10)),
    [historyTotal],
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
    const { orders } = await fetchOrders('pending', 1, 100);
    setPendingOrders(orders);
  }, [fetchOrders]);

  const refreshHistory = useCallback(async () => {
    const { orders, total } = await fetchOrders(
      'verified,cancelled',
      historyPage,
      10,
    );
    setHistoryOrders(orders);
    setHistoryTotal(total);
  }, [fetchOrders, historyPage]);

  useEffect(() => {
    void Promise.all([refreshPending(), refreshHistory()]);
  }, [refreshHistory, refreshPending]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    void refreshHistory();
  }, [activeTab, refreshHistory]);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedChildFilter]);

  const handleVerifyOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      await request('/api/orders', {
        method: 'PUT',
        body: { orderId, action: 'verify' },
      });
      await refreshPending();
      if (activeTab === 'history') {
        await refreshHistory();
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
      if (activeTab === 'history') {
        await refreshHistory();
      }
      setCancelOrderId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const orderTabs = [
    { key: 'pending', label: `待核销 (${pendingOrders.length})` },
    { key: 'history', label: '核销记录' },
  ] as const;

  const pendingTotalPoints = useMemo(
    () =>
      pendingOrders.reduce((sum, order) => sum + (order.pointsSpent || 0), 0),
    [pendingOrders],
  );

  const verifiedCount = useMemo(
    () => historyOrders.filter((order) => order.status === 'verified').length,
    [historyOrders],
  );

  const cancelledCount = useMemo(
    () => historyOrders.filter((order) => order.status === 'cancelled').length,
    [historyOrders],
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

  const filteredHistoryOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return historyOrders;
    return historyOrders.filter((order) => {
      return (
        order.rewardName.toLowerCase().includes(keyword) ||
        order.childName.toLowerCase().includes(keyword) ||
        order.verificationCode.toLowerCase().includes(keyword)
      );
    });
  }, [historyOrders, searchQuery]);

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
          value={pendingOrders.length}
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
          hint='历史列表中的成功订单'
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
                setActiveTab(key as 'pending' | 'history')
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
                    <div className='flex flex-wrap items-center gap-2'>
                      <Button
                        size='sm'
                        variant='success'
                        onClick={() => handleVerifyOrder(order._id)}
                        disabled={actionLoading}
                        className='min-w-[110px]'
                      >
                        <BadgeCheck size={16} />
                        确认核销
                      </Button>
                      <Button
                        size='sm'
                        variant='error'
                        onClick={() => setCancelOrderId(order._id)}
                        disabled={actionLoading}
                        className='min-w-[90px]'
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
      ) : (
        <>
          {filteredHistoryOrders.length === 0 ? (
            <EmptyState
              title='暂无核销记录'
              hint='完成或取消的订单会在这里显示。'
            >
              <div className='mt-2 text-xs text-slate-400'>
                可以切换孩子筛选或输入关键字查找记录。
              </div>
            </EmptyState>
          ) : (
            <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]'>
              <div className='space-y-4'>
                {filteredHistoryOrders.map((order) => (
                  <OrderCard
                    key={order._id.toString()}
                    order={order}
                    statusLabel={
                      order.status === 'verified' ? '已核销' : '已取消'
                    }
                    statusTone={
                      order.status === 'verified' ? 'emerald' : 'rose'
                    }
                    actionArea={
                      <div className='text-right'>
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
                  title='历史分页'
                  rows={[
                    ['当前页', `${historyPage}`],
                    ['总页数', `${historyPageCount}`],
                    ['总记录', `${historyTotal}`],
                  ]}
                >
                  <div className='mt-4 flex items-center justify-between gap-3'>
                    <Button
                      variant='secondary'
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className='text-slate-600 disabled:opacity-30'
                    >
                      上一页
                    </Button>
                    <Button
                      variant='secondary'
                      disabled={historyPage >= historyPageCount}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className='text-slate-600 disabled:opacity-30'
                    >
                      下一页
                    </Button>
                  </div>
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
}: {
  title: string;
  rows: [string, string | undefined][];
  children?: ReactNode;
}) {
  return (
    <div className='rounded-[28px] border border-slate-200/70 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]'>
      <h3 className='text-base font-bold text-slate-900'>{title}</h3>
      <div className='mt-4 space-y-2 text-sm text-slate-600'>
        {rows.map(([label, value]) => (
          <div
            key={label}
            className='flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3'
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
  return (
    <div className='group overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,250,251,0.9)_100%)] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition-transform duration-300 hover:-translate-y-1'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div className='flex items-start gap-4'>
          <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-[26px] bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 text-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_10px_20px_rgba(251,191,36,0.12)]'>
            {order.rewardIcon || '🎁'}
          </div>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='text-lg font-black tracking-tight text-slate-950'>
                {order.rewardName}
              </h3>
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
            <div className='mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500'>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5'>
                <Gift size={14} />
                {order.pointsSpent} 积分
              </span>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5'>
                <Clock3 size={14} />
                {formatDate(order.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {actionArea}
      </div>

      <div className='mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center'>
        <div className='flex items-center gap-3 rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3'>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm'>
            {order.childAvatar}
          </div>
          <div>
            <div className='text-sm font-semibold text-slate-900'>
              {order.childName}
            </div>
            <div className='text-xs text-slate-500'>兑换人</div>
          </div>
        </div>
        <div className='rounded-[22px] border border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500'>
            Verification Code
          </div>
          <div className='mt-1 font-mono text-lg font-black tracking-[0.2em] text-blue-900'>
            {order.verificationCode}
          </div>
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
