"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  Gift,
  Wallet,
  BadgeCheck,
  Clock3,
  Sparkles,
} from "lucide-react";
import { Button, DatePicker, Modal } from "@/components/ui";
import { formatDate } from "@/utils/date";
import { useToast } from "@/components/ui/Toast";
import request from "@/utils/request";
import {
  ChildEmptyState,
  ChildPanel,
  ChildPageTitle,
  ChildStatusPill,
} from "@/components/child/ChildUI";

export interface Order {
  _id: string;
  rewardName: string;
  rewardIcon: string;
  pointsSpent: number;
  status: "pending" | "verified" | "cancelled";
  verificationCode: string;
  createdAt: string;
  verifiedAt?: string;
}

const statusToneMap: Record<Order["status"], "amber" | "emerald" | "slate"> = {
  pending: "amber",
  verified: "emerald",
  cancelled: "slate",
};

export default function GiftPage() {
  const { currentUser } = useApp();
  const toast = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [giftSearchQuery, setGiftSearchQuery] = useState("");
  const [giftDate, setGiftDate] = useState<Date | null>(null);
  const [giftStatusFilter, setGiftStatusFilter] = useState<
    "all" | "pending" | "verified" | "cancelled"
  >("pending");
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!currentUser?.token) return;
    setOrdersLoading(true);
    try {
      const data = await request(`/api/orders`);
      if (data.success) {
        setOrders(data.orders);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.token) {
        await fetchOrders();
      }
    };
    void loadData();
  }, [currentUser, fetchOrders]);

  const filteredOrders = useMemo(() => {
    const keyword = giftSearchQuery.trim().toLowerCase();
    let filtered = orders;

    if (keyword) {
      filtered = filtered.filter((order) =>
        order.rewardName.toLowerCase().includes(keyword),
      );
    }

    if (giftDate) {
      const filterDate = giftDate.toDateString();
      filtered = filtered.filter(
        (order) => new Date(order.createdAt).toDateString() === filterDate,
      );
    }

    if (giftStatusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === giftStatusFilter);
    }

    return filtered;
  }, [giftDate, giftSearchQuery, giftStatusFilter, orders]);

  const displayedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const rank = { pending: 0, verified: 1, cancelled: 2 };
      return rank[a.status] - rank[b.status];
    });
  }, [filteredOrders]);

  const orderStats = useMemo(() => {
    const counts = {
      all: orders.length,
      pending: 0,
      verified: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      counts[order.status] += 1;
    });

    return counts;
  }, [orders]);

  const handleCancelOrder = async (order: Order) => {
    const data = await request("/api/orders", {
      method: "PUT",
      body: {
        orderId: order._id,
        action: "cancel",
      },
    });
    if (data.success) {
      fetchOrders();
      setShowOrderDetail(null);
      toast.success(`已撤销兑换，${order.pointsSpent} 积分已退回`);
    } else {
      toast.error(data.message);
    }
  };

  const navigateTo = (path: string) => router.push(`/child/${path}`);

  const getStatusLabel = (status: Order["status"]) => {
    if (status === "verified") return "已核销";
    if (status === "cancelled") return "已取消";
    return "待核销";
  };

  const getStatusIcon = (status: Order["status"]) => {
    if (status === "verified") return <BadgeCheck size={12} />;
    if (status === "cancelled") return <Clock3 size={12} />;
    return <Clock3 size={12} />;
  };

  const loadingPlaceholder = (
    <ChildEmptyState
      title="礼物正在赶来"
      hint="正在整理兑换记录，请稍等一下。"
      icon="⏳"
    />
  );

  return (
    <>
      <Modal
        title="兑换详情"
        isOpen={!!showOrderDetail}
        onClose={() => setShowOrderDetail(null)}
        width={560}
        className="overflow-hidden !rounded-[2rem] !p-0 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
        showCloseButton
      >
        {showOrderDetail && (
          <div className="flex flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(248,251,255,0.98)_0%,rgba(255,255,255,0.98)_100%)]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(219,234,254,0.92)_0%,rgba(255,251,235,0.92)_100%)] px-6 pb-5 pt-6">
              <div className="absolute right-[-32px] top-[-24px] h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />
              <div className="absolute bottom-[-30px] left-[-18px] h-20 w-20 rounded-full bg-amber-200/40 blur-2xl" />
              <div className="relative text-center">
                {showOrderDetail.rewardIcon ? (
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white text-3xl shadow-[0_10px_24px_rgba(59,130,246,0.12)] ring-1 ring-sky-100">
                    {showOrderDetail.rewardIcon}
                  </div>
                ) : null}
                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                  {showOrderDetail.rewardName}
                </h3>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <ChildStatusPill tone="sky">
                    <Sparkles size={12} /> -{showOrderDetail.pointsSpent} 积分
                  </ChildStatusPill>
                  <ChildStatusPill tone={statusToneMap[showOrderDetail.status]}>
                    {getStatusIcon(showOrderDetail.status)}
                    {getStatusLabel(showOrderDetail.status)}
                  </ChildStatusPill>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              {showOrderDetail.status === "pending" && (
                <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-4">
                  <p className="mb-1 text-sm font-bold text-amber-800">
                    请向家长出示核销码
                  </p>
                  <p className="font-mono text-3xl font-black tracking-[0.28em] text-amber-900">
                    {showOrderDetail.verificationCode}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    兑换时间
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatDate(showOrderDetail.createdAt)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    核销时间
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {showOrderDetail.verifiedAt
                      ? formatDate(showOrderDetail.verifiedAt)
                      : "暂无"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-5">
              <Button
                onClick={() => setShowOrderDetail(null)}
                variant="secondary"
                fullWidth
                className="rounded-full border-none bg-slate-100 py-3 text-slate-700 shadow-none hover:bg-slate-200"
              >
                关闭
              </Button>
              {showOrderDetail.status === "pending" && (
                <Button
                  onClick={() => handleCancelOrder(showOrderDetail)}
                  variant="secondary"
                  fullWidth
                  className="mt-3 rounded-full border-none bg-rose-50 py-3 text-rose-600 shadow-none hover:bg-rose-100"
                >
                  撤销兑换
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <div className="child-page-grid">
        <ChildPanel className="child-filter-panel">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <ChildPageTitle
              icon={<Gift size={22} />}
              title="我的奖品"
              description="待核销的奖品会排在最前面。"
              action={
                <Button
                  onClick={() => navigateTo("wallet")}
                  variant="secondary"
                  size="sm"
                  className="rounded-full border-none bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                >
                  <Wallet size={16} className="mr-1" />
                  钱包
                </Button>
              }
            />
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <ChildStatusPill tone="sky">全部 {orderStats.all}</ChildStatusPill>
              <ChildStatusPill tone="amber">待核销 {orderStats.pending}</ChildStatusPill>
              <ChildStatusPill tone="emerald">已核销 {orderStats.verified}</ChildStatusPill>
              <ChildStatusPill tone="slate">已取消 {orderStats.cancelled}</ChildStatusPill>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_220px]">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="搜索礼物..."
                value={giftSearchQuery}
                onChange={(e) => setGiftSearchQuery(e.target.value)}
                className="h-11 w-full rounded-[18px] border border-slate-200/80 bg-white/95 py-0 pl-10 pr-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <DatePicker
              selected={giftDate}
              onChange={(date: Date | null) => setGiftDate(date)}
              placeholderText="兑换日期"
              wrapperClassName="w-full"
              className="h-11 rounded-[18px] border-slate-200/80 text-slate-700"
              popperPlacement="top-end"
              portalId="datepicker-portal"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "pending", "verified", "cancelled"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setGiftStatusFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  giftStatusFilter === status
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-white/85 text-slate-600 ring-1 ring-slate-200/70"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {status === "all"
                    ? "全部"
                    : status === "pending"
                      ? "未核销"
                      : status === "verified"
                        ? "已核销"
                        : "已取消"}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      giftStatusFilter === status
                        ? "bg-white/20 text-current"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {status === "all"
                      ? orderStats.all
                      : status === "pending"
                        ? orderStats.pending
                        : status === "verified"
                          ? orderStats.verified
                          : orderStats.cancelled}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </ChildPanel>

        <ChildPanel className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-lg font-extrabold text-[var(--child-text)]">
                <Gift size={16} className="text-sky-500" />
                礼物卡片
              </div>
              <p className="mt-1 text-sm font-semibold text-[var(--child-text-muted)]">
                轻触任意礼物可以查看兑换详情和核销码。
              </p>
            </div>
            <div className="hidden rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-white/80 shadow-sm sm:inline-flex">
              结果 {displayedOrders.length}
            </div>
          </div>

          {ordersLoading && orders.length === 0 ? (
            loadingPlaceholder
          ) : displayedOrders.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayedOrders.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => setShowOrderDetail(order)}
                  className={`child-card group w-full text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 ${
                    order.status === "verified"
                      ? "border-emerald-100/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.96)_0%,rgba(255,255,255,0.98)_100%)]"
                      : order.status === "cancelled"
                        ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.98)_100%)]"
                        : "border-amber-100/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,255,255,0.98)_100%)]"
                  }`}
                >
                  <div className="mb-3 h-1 rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-amber-300 opacity-80" />
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[24px] bg-white text-[30px] shadow-[0_10px_20px_rgba(15,23,42,0.08)] ring-1 ring-white">
                      {order.rewardIcon || "🎁"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[16px] font-black tracking-tight text-[var(--child-text)]">
                            {order.rewardName}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <ChildStatusPill tone={statusToneMap[order.status]}>
                              {getStatusIcon(order.status)}
                              {getStatusLabel(order.status)}
                            </ChildStatusPill>
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
                              积分 {order.pointsSpent}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-[18px] bg-white/80 px-3 py-2 text-right ring-1 ring-[var(--child-border)]">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--child-text-soft)]">
                        兑换时间
                      </div>
                      <div className="mt-0.5 text-[13px] font-bold leading-4 text-[var(--child-text)]">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-[linear-gradient(135deg,#0f766e_0%,#0ea5a4_100%)] px-3 py-2 text-right text-white shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                        核销码
                      </div>
                      <div className="font-mono text-[13px] font-black leading-4 tracking-[0.14em]">
                        {order.verificationCode}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <ChildEmptyState
              title="还没有奖品"
              hint="去奖励商店看看，兑换后就会出现在这里。"
              icon="🎁"
              action={
                <Button onClick={() => navigateTo("store")} variant="secondary">
                  去商店看看
                </Button>
              }
            />
          )}
        </ChildPanel>
      </div>
    </>
  );
}
