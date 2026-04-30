"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Gift,
  BadgeCheck,
  Clock3,
  Sparkles,
  Trophy,
  PackageOpen,
} from "lucide-react";
import { Button, DatePicker, Input, Modal, TabFilter } from "@/components/ui";
import { formatDate } from "@/utils/date";
import { useToast } from "@/components/ui/Toast";
import request from "@/utils/request";
import {
  ChildEmptyState,
  ChildPanel,
  ChildPageTitle,
  ChildStatCard,
  ChildStatusPill,
} from "@/components/child/ChildUI";

export interface Order {
  _id: string;
  rewardName: string;
  rewardIcon: string;
  pointsSpent: number;
  status: "pending" | "verified" | "cancelled";
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

  const summary = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + order.pointsSpent, 0);
    const pending = orders.filter((order) => order.status === "pending").length;
    const verified = orders.filter((order) => order.status === "verified").length;
    const cancelled = orders.filter((order) => order.status === "cancelled").length;
    return {
      totalSpent,
      pending,
      verified,
      cancelled,
    };
  }, [orders]);

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

  const statusTabs = [
    { key: "all", label: `全部 (${orderStats.all})` },
    { key: "pending", label: `待核销 (${orderStats.pending})` },
    { key: "verified", label: `已核销 (${orderStats.verified})` },
    { key: "cancelled", label: `已取消 (${orderStats.cancelled})` },
  ] as const;

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

  const getStatusStory = (status: Order["status"]) => {
    if (status === "verified") return "已经带回家啦";
    if (status === "cancelled") return "这次先放回收藏册";
    return "等家长帮你发放";
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
          <div className="child-gift-detail-modal flex flex-col overflow-hidden">
            <div className="child-gift-detail-hero rounded-[1.75rem] px-4 py-4 shadow-sm sm:px-5 sm:py-5">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                {showOrderDetail.rewardIcon ? (
                  <div className="child-gift-detail-icon flex h-14 w-14 flex-none items-center justify-center rounded-[1.4rem] text-3xl sm:h-16 sm:w-16 sm:text-4xl">
                    {showOrderDetail.rewardIcon}
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black leading-tight text-[var(--ui-text-primary)] sm:text-xl">
                    {showOrderDetail.rewardName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[var(--ui-text-muted)]">
                    {getStatusStory(showOrderDetail.status)}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <span className="child-gift-detail-points inline-flex items-center rounded-full px-2.5 py-1 text-sm font-black">
                    -{showOrderDetail.pointsSpent} 积分
                  </span>
                  <ChildStatusPill tone={statusToneMap[showOrderDetail.status]}>
                    {getStatusIcon(showOrderDetail.status)}
                    {getStatusLabel(showOrderDetail.status)}
                  </ChildStatusPill>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              {showOrderDetail.status === "pending" && (
                <div className="child-gift-detail-callout rounded-[1.5rem] p-4">
                  <p className="mb-1 text-sm font-bold text-[var(--ui-text-primary)]">
                    等待家长处理
                  </p>
                  <p className="text-sm font-semibold leading-6 text-[var(--ui-text-secondary)]">
                    兑换后会出现在这里，等待家长确认即可。
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="child-gift-detail-card rounded-[1.25rem] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ui-text-muted)]">
                    兑换时间
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ui-text-primary)]">
                    {formatDate(showOrderDetail.createdAt)}
                  </p>
                </div>
                <div className="child-gift-detail-card rounded-[1.25rem] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ui-text-muted)]">
                    核销时间
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ui-text-primary)]">
                    {showOrderDetail.verifiedAt
                      ? formatDate(showOrderDetail.verifiedAt)
                      : "暂无"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--ui-border)] px-6 py-5">
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowOrderDetail(null)}
                  variant="secondary"
                  className="flex-1 rounded-full border-none bg-[var(--ui-surface-2)] py-3 text-[var(--ui-text-secondary)] shadow-none hover:bg-[var(--ui-surface-3)]"
                >
                  关闭
                </Button>
                {showOrderDetail.status === "pending" && (
                  <Button
                    onClick={() => handleCancelOrder(showOrderDetail)}
                    variant="secondary"
                    className="flex-1 rounded-full border-none bg-rose-50 py-3 text-rose-600 shadow-none hover:bg-rose-100"
                  >
                    撤销兑换
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div className="child-page-grid">
        <ChildPanel className="child-gift-hero overflow-hidden">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-center">
            <div className="space-y-4">
              <ChildPageTitle
                icon={<Gift size={22} />}
                title="我的奖品收藏册"
                description="这里放着你兑换过的宝贝。待领取的放前面，已经带回家的会留在收藏册里。"
              />
              <div className="flex flex-wrap gap-2">
                <span className="child-gift-hero-chip">
                  <PackageOpen size={14} />
                  待领取宝贝 {summary.pending}
                </span>
                <span className="child-gift-hero-chip">
                  <Trophy size={14} />
                  已经带回家 {summary.verified}
                </span>
                <span className="child-gift-hero-chip">
                  <Sparkles size={14} />
                  一共花了 {summary.totalSpent} 积分
                </span>
              </div>
            </div>

            <div className="child-gift-highlight rounded-[30px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-[var(--child-text-muted)]">收藏进度</div>
                  <div className="mt-2 text-4xl font-black text-[var(--child-text)]">
                    {summary.verified} / {Math.max(1, orderStats.all)}
                  </div>
                </div>
                <div className="child-gift-highlight-badge">
                  {summary.pending > 0 ? "待领取" : "已整理"}
                </div>
              </div>
              <div className="mt-4 text-sm font-semibold leading-6 text-[var(--child-text-muted)]">
                {summary.pending > 0
                  ? `还有 ${summary.pending} 个奖品在等家长发给你。`
                  : orderStats.all > 0
                    ? "现在收藏册里每个奖品都已经处理好了。"
                    : "先去商店挑一个喜欢的奖品吧。"}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ChildStatCard
              label="待领取宝贝"
              value={summary.pending}
              hint="等家长处理"
              tone="amber"
              icon={<PackageOpen size={18} />}
            />
            <ChildStatCard
              label="已经带回家"
              value={summary.verified}
              hint="已核销完成"
              tone="emerald"
              icon={<Trophy size={18} />}
            />
            <ChildStatCard
              label="收藏花费"
              value={summary.totalSpent}
              hint={`取消 ${summary.cancelled} 个`}
              tone="sky"
              icon={<Sparkles size={18} />}
            />
          </div>
        </ChildPanel>

        <ChildPanel className="child-filter-panel">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <ChildPageTitle
              icon={<Gift size={22} />}
              title="翻翻奖品柜"
              description="按名字、日期或状态查找你兑换过的奖品。"
              level="section"
            />
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <ChildStatusPill tone="sky">全部 {orderStats.all}</ChildStatusPill>
              <ChildStatusPill tone="amber">待核销 {orderStats.pending}</ChildStatusPill>
              <ChildStatusPill tone="emerald">已核销 {orderStats.verified}</ChildStatusPill>
              <ChildStatusPill tone="slate">已取消 {orderStats.cancelled}</ChildStatusPill>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,300px)_minmax(0,220px)_max-content] xl:items-end">
            <div className="min-w-0">
              <Input
                allowClear
                isSearch
                value={giftSearchQuery}
                onChange={(e) => setGiftSearchQuery(e.target.value)}
                placeholder="搜索礼物..."
                size="sm"
                containerClassName="w-full"
                className="!h-11 !min-h-11 !rounded-[18px]"
              />
            </div>

            <div className="min-w-0">
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

            <div className="flex min-w-0 flex-col gap-2">
              <TabFilter
                items={statusTabs}
                activeKey={giftStatusFilter}
                onFilterChange={(key) => setGiftStatusFilter(key as typeof giftStatusFilter)}
                className="w-fit max-w-full shrink-0 overflow-hidden [&_button]:h-11 [&_button]:px-3 [&_button]:text-sm [&_button]:font-black"
              />
            </div>
          </div>
        </ChildPanel>

        <ChildPanel className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <ChildPageTitle
              icon={<Gift size={16} className="text-sky-500" />}
              title="奖品展示墙"
              description="轻触任意奖品卡片可以查看详情。"
              level="section"
            />
            <div className="child-gift-result-chip hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex">
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
                  className={`child-card child-gift-card child-gift-card-${order.status} group w-full text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200`}
                >
                  <div className="mb-3 h-1 rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-amber-300 opacity-80" />
                  <div className="flex items-start gap-4">
                    <div className="child-gift-card-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-[24px] text-[30px]">
                      {order.rewardIcon || "🎁"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="child-card-title truncate">
                            {order.rewardName}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <ChildStatusPill tone={statusToneMap[order.status]}>
                              {getStatusIcon(order.status)}
                              {getStatusLabel(order.status)}
                            </ChildStatusPill>
                            <span className="child-gift-points-pill rounded-full px-2.5 py-1 text-xs font-semibold">
                              积分 {order.pointsSpent}
                            </span>
                          </div>
                          <p className="child-card-meta mt-2">
                            {getStatusStory(order.status)}
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="mt-1 shrink-0 text-[var(--child-text-muted)]/50 transition group-hover:translate-x-0.5 group-hover:text-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="child-gift-card-note rounded-[18px] px-3 py-2 text-left">
                      <div className="child-card-kicker text-[var(--child-text-soft)]">
                        兑换时间
                      </div>
                      <div className="mt-0.5 text-[13px] font-bold leading-4 text-[var(--child-text)]">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                    <div className="child-gift-card-status rounded-[18px] px-3 py-2 text-left shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                        兑换状态
                      </div>
                      <div className="font-mono text-[13px] font-black leading-4 tracking-[0.14em]">
                        {order.status === "pending" ? "待处理" : order.status === "verified" ? "已完成" : "已取消"}
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
