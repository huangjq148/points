"use client";

import { IDisplayedOrder } from "@/app/typings";
import { Button, TabFilter } from "@/components/ui";
import Select, { SelectOption } from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import { Clock3, CircleCheckBig, CreditCard, Gift, RefreshCw, Ticket, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import request from "@/utils/request";
import { formatDate } from "@/utils/date";
import ConfirmModal from "@/components/ConfirmModal";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";

function OrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const initialActiveTab: "pending" | "history" = initialStatus === "history" ? "history" : "pending";
  const initialChildFilter = searchParams.get("childId") || "all";
  const { childList } = useApp();
  const [activeTab, setActiveTab] = useState<"pending" | "history">(initialActiveTab);
  const [pendingOrders, setPendingOrders] = useState<IDisplayedOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<IDisplayedOrder[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>(initialChildFilter);
  const [isLoading, setIsLoading] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const historyPageCount = useMemo(() => Math.ceil(historyTotal / 10), [historyTotal]);

  const childOptions: SelectOption[] = useMemo(
    () => [
      { value: "all", label: "全部孩子" },
      ...childList.map((child) => ({
        value: child.id.toString(),
        label: child.username,
      })),
    ],
    [childList],
  );

  const fetchOrders = useCallback(
    async (status: string, page: number = 1, fetchLimit: number = 100) => {
      const params: Record<string, string | number> = {
        status,
        page,
        limit: fetchLimit,
      };

      if (selectedChildFilter !== "all") {
        params.childId = selectedChildFilter;
      }

      const data = (await request("/api/orders", {
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
    try {
      setIsLoading(true);
      const { orders } = await fetchOrders("pending", 1, 100);
      setPendingOrders(orders);
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrders]);

  const refreshHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const { orders, total } = await fetchOrders("verified,cancelled", historyPage, 10);
      setHistoryOrders(orders);
      setHistoryTotal(total);
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrders, historyPage]);

  useEffect(() => {
    const init = async () => {
      await refreshPending();
    };
    init();
  }, [refreshPending]);

  useEffect(() => {
    const initHistory = async () => {
      if (activeTab === "history") {
        await refreshHistory();
      }
    };
    initHistory();
  }, [activeTab, refreshHistory]);

  const handleVerifyOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      await request("/api/orders", {
        method: "PUT",
        body: { orderId, action: "verify" },
      });
      await refreshPending();
      if (activeTab === "history") {
        await refreshHistory();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      await request("/api/orders", {
        method: "PUT",
        body: { orderId, action: "cancel" },
      });
      await refreshPending();
      if (activeTab === "history") {
        await refreshHistory();
      }
      setCancelOrderId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const orderTabs = [
    { key: "pending", label: `待核销 (${pendingOrders.length})` },
    { key: "history", label: "核销记录" },
  ] as const;

  const pendingTotalPoints = useMemo(
    () => pendingOrders.reduce((sum, order) => sum + (order.pointsSpent || 0), 0),
    [pendingOrders],
  );

  const verifiedCount = useMemo(
    () => historyOrders.filter((order) => order.status === "verified").length,
    [historyOrders],
  );

  const cancelledCount = useMemo(
    () => historyOrders.filter((order) => order.status === "cancelled").length,
    [historyOrders],
  );

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirm={() => cancelOrderId && handleCancelOrder(cancelOrderId)}
        title="取消兑换"
        message="确定取消这个兑换吗？积分将退还给孩子。"
        confirmText="确认取消"
        cancelText="返回"
        type="danger"
      />

      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-500 shadow-sm">
                <RefreshCw size={14} className="animate-spin" />
                刷新中
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>待核销</span>
              <Ticket size={16} className="text-blue-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{pendingOrders.length}</div>
            <div className="mt-1 text-xs text-slate-500">当前需要处理的兑换单</div>
          </div>
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>待扣积分</span>
              <CreditCard size={16} className="text-amber-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{pendingTotalPoints}</div>
            <div className="mt-1 text-xs text-slate-500">待核销订单消耗的积分总和</div>
          </div>
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>已核销</span>
              <CircleCheckBig size={16} className="text-emerald-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{verifiedCount}</div>
            <div className="mt-1 text-xs text-slate-500">历史列表中已完成的记录</div>
          </div>
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>已取消</span>
              <X size={16} className="text-rose-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{cancelledCount}</div>
            <div className="mt-1 text-xs text-slate-500">需要回退积分的核销单</div>
          </div>
        </div>

        <div className="flex flex-row gap-3 xl:flex-row xl:items-center xl:justify-between">
          <TabFilter
            items={orderTabs}
            activeKey={activeTab}
            onFilterChange={(key) => setActiveTab(key as "pending" | "history")}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-44">
              <Select
                value={selectedChildFilter}
                onChange={(value) => {
                  if (value) {
                    setSelectedChildFilter(value.toString());
                  }
                }}
                options={childOptions}
                placeholder="选择孩子"
              />
            </div>
          </div>
        </div>
      </div>

      {activeTab === "pending" ? (
        pendingOrders.length === 0 ? (
          <div className="card-parent border border-dashed border-slate-200 text-center py-16 text-slate-500">
            <Ticket size={52} className="mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium text-slate-600">暂无待核销记录</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div
                  key={order._id.toString()}
                  className="group overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,250,251,0.9)_100%)] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[26px] bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 text-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_10px_20px_rgba(251,191,36,0.12)]">
                        {order.rewardIcon || "🎁"}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black tracking-tight text-slate-950">{order.rewardName}</h3>
                          <span className="rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-sm">
                            待核销
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5">
                            <Gift size={14} />
                            {order.pointsSpent} 积分
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5">
                            <Clock3 size={14} />
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleVerifyOrder(order._id)}
                        disabled={actionLoading}
                        className="min-w-[110px]"
                      >
                        确认核销
                      </Button>
                      <Button
                        size="sm"
                        variant="error"
                        onClick={() => setCancelOrderId(order._id)}
                        disabled={actionLoading}
                        className="min-w-[90px]"
                      >
                        取消
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                        {order.childAvatar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{order.childName}</div>
                        <div className="text-xs text-slate-500">兑换人</div>
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500">
                        Verification Code
                      </div>
                      <div className="mt-1 font-mono text-lg font-black tracking-[0.2em] text-blue-900">
                        {order.verificationCode}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="card-parent border border-slate-200/70">
                <h3 className="text-base font-bold text-slate-900">当前筛选</h3>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span>孩子范围</span>
                    <span className="font-medium text-slate-900">
                      {selectedChildFilter === "all" ? "全部孩子" : childOptions.find((opt) => opt.value.toString() === selectedChildFilter)?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span>待核销数</span>
                    <span className="font-medium text-slate-900">{pendingOrders.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span>待扣积分</span>
                    <span className="font-medium text-slate-900">{pendingTotalPoints}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <>
          {historyOrders.length === 0 ? (
            <div className="card-parent border border-dashed border-slate-200 text-center py-16 text-slate-500">
              <Ticket size={52} className="mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium text-slate-600">暂无核销记录</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="space-y-4">
                {historyOrders.map((order) => (
                  <div
                    key={order._id.toString()}
                    className="overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(250,250,249,0.9)_100%)] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] opacity-95"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 text-3xl">
                          {order.rewardIcon || "🎁"}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black tracking-tight text-slate-950">{order.rewardName}</h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.status === "verified"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                                }`}
                            >
                              {order.status === "verified" ? "已核销" : "已取消"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5">
                              <Gift size={14} />
                              {order.pointsSpent} 积分
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5">
                              <Clock3 size={14} />
                              {formatDate(order.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                          {order.childAvatar}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{order.childName}</div>
                          <div className="text-xs text-slate-500">兑换人</div>
                        </div>
                      </div>
                      {order.verifiedAt ? (
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-500">完成时间</div>
                          <div className="text-sm font-medium text-slate-900">{formatDate(order.verifiedAt)}</div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-500">更新时间</div>
                          <div className="text-sm font-medium text-slate-900">{formatDate(order.updatedAt)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="card-parent border border-slate-200/70">
                  <h3 className="text-base font-bold text-slate-900">分页</h3>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Button
                      variant="secondary"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="text-slate-600 disabled:opacity-30"
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-slate-500">
                      第 {historyPage} 页 / 共 {historyPageCount} 页
                    </span>
                    <Button
                      variant="secondary"
                      disabled={historyPage >= historyPageCount}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="text-slate-600 disabled:opacity-30"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 包装组件以添加 Suspense
export default function OrdersPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    }>
      <OrdersPage />
    </Suspense>
  );
}
