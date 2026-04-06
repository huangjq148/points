"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Gift, Search, Filter, History } from "lucide-react";
import Button from "@/components/ui/Button";
import { Pagination } from "@/components/ui";
import ConfirmModal from "@/components/ConfirmModal";
import confetti from "canvas-confetti";
import { useToast } from "@/components/ui/Toast";
import request from "@/utils/request";
import dayjs from "dayjs";
import { EmptyState, RewardCard, SectionTitle } from "@/components/store/RewardUI";

export interface Reward {
  _id: string;
  name: string;
  icon: string;
  points: number;
  type: string;
  stock: number;
  isActive?: boolean;
  description?: string;
  expiresAt?: string | null;
  validDurationValue?: number | null;
  validDurationUnit?: "day" | "hour" | null;
}

interface OrderRecord {
  _id: string;
  rewardName: string;
  rewardIcon?: string;
  pointsSpent: number;
  status: "pending" | "verified" | "cancelled";
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  validUntil?: string | null;
}

const SHOP_LIMIT = 12;
const HISTORY_LIMIT = 5;

export default function StorePage() {
  const { currentUser } = useApp();
  const toast = useToast();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardSearchQuery, setRewardSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "sold-out" | "in-stock">("all");
  const [sortKey, setSortKey] = useState<"points-asc" | "points-desc" | "stock-desc">("points-asc");
  const [showConfirmRedeem, setShowConfirmRedeem] = useState<Reward | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const limit = SHOP_LIMIT;

  const fetchRewards = useCallback(
    async (pageNum: number = 1) => {
      if (!currentUser?.token) return;
      const data = await request(`/api/rewards`, {
        params: {
          isActive: true,
          page: pageNum,
          limit,
        },
      });
      if (data.success) {
        setRewards(data.rewards);
        setTotal(data.total);
      }
    },
    [currentUser?.token, limit],
  );

  const fetchOrders = useCallback(async () => {
    if (!currentUser?.token) return;
    setOrdersLoading(true);
    try {
      const data = await request("/api/orders", {
        params: {
          page: 1,
          limit: HISTORY_LIMIT,
        },
      });
      if (data.success) {
        setOrders(data.orders);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.token) return;
      await Promise.all([fetchRewards(page), fetchOrders()]);
    };
    void loadData();
  }, [currentUser, fetchOrders, fetchRewards, page]);

  const displayedPoints = currentUser?.availablePoints || 0;

  const formatDuration = (value?: number | null, unit?: "day" | "hour" | null) => {
    if (!value || !unit) return null;
    return `${value}${unit === "day" ? "天" : "小时"}`;
  };

  const isPrivilegeExpired = (reward: Reward) => {
    if (reward.type !== "privilege" || !reward.expiresAt) return false;
    return dayjs(reward.expiresAt).isBefore(dayjs(), "day");
  };

  const isPrivilegeUrgent = (reward: Reward) => {
    if (reward.type !== "privilege" || !reward.expiresAt) return false;
    const diffDays = dayjs(reward.expiresAt).startOf("day").diff(dayjs().startOf("day"), "day");
    return diffDays >= 0 && diffDays <= 3;
  };

  const filteredRewards = useMemo(() => {
    const keyword = rewardSearchQuery.trim().toLowerCase();
    const queryMatch = (reward: Reward) => !keyword || reward.name.toLowerCase().includes(keyword);
    const categoryMatch = (reward: Reward) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "sold-out") return reward.stock <= 0;
      if (activeCategory === "in-stock") return reward.stock > 0;
      return true;
    };

    const sorted = [...rewards].filter((reward) => queryMatch(reward) && categoryMatch(reward));
    return sorted.sort((a, b) => {
      if (sortKey === "points-desc") return b.points - a.points;
      if (sortKey === "stock-desc") return b.stock - a.stock;
      return a.points - b.points;
    });
  }, [activeCategory, rewardSearchQuery, rewards, sortKey]);

  const soldOutCount = useMemo(() => rewards.filter((reward) => reward.stock <= 0).length, [rewards]);
  const inStockCount = useMemo(() => rewards.filter((reward) => reward.stock > 0).length, [rewards]);
  const getPrivilegeRemainingLabel = (reward: Reward) => {
    if (reward.type !== "privilege" || !reward.expiresAt) return null;
    const now = dayjs();
    const target = dayjs(reward.expiresAt);
    if (target.isBefore(now, "day")) return "已过截止日期";
    const diffDays = target.startOf("day").diff(now.startOf("day"), "day");
    if (diffDays === 0) return "今天截止";
    if (diffDays === 1) return "剩余 1 天";
    if (diffDays <= 7) return `剩余 ${diffDays} 天`;
    return `截止 ${target.format("MM-DD")}`;
  };

  const getPrivilegeUrgencyTone = (reward: Reward) => {
    if (reward.type !== "privilege" || !reward.expiresAt) return "slate";
    const now = dayjs();
    const target = dayjs(reward.expiresAt);
    if (target.isBefore(now, "day")) return "rose";
    const diffDays = target.startOf("day").diff(now.startOf("day"), "day");
    if (diffDays === 0) return "rose";
    if (diffDays <= 3) return "amber";
    if (diffDays <= 7) return "blue";
    return "emerald";
  };

  const handleRedeemReward = async () => {
    if (!showConfirmRedeem) return;
    const reward = showConfirmRedeem;

    if (isPrivilegeExpired(reward)) {
      toast.error("这个特权奖励已经过了兑换截止日期");
      setShowConfirmRedeem(null);
      return;
    }

    if ((currentUser?.availablePoints || 0) < reward.points) {
      toast.error(`积分还差 ${reward.points - (currentUser?.availablePoints || 0)} 分，继续加油！`);
      setShowConfirmRedeem(null);
      return;
    }

    const data = await request("/api/orders", {
      method: "POST",
      body: {
        rewardId: reward._id,
      },
    });
    if (data.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#fde047", "#fbbf24"],
      });
      toast.success(`兑换成功！找爸妈领取吧~\n核销码: ${data.verificationCode}`);
      await Promise.all([fetchRewards(page), fetchOrders()]);
    } else {
      toast.error(data.message || "兑换失败");
    }
    setShowConfirmRedeem(null);
  };

  const formatStatusLabel = (status: OrderRecord["status"]) => {
    if (status === "pending") return "待核销";
    if (status === "verified") return "已完成";
    return "已取消";
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={!!showConfirmRedeem}
        onClose={() => setShowConfirmRedeem(null)}
        onConfirm={handleRedeemReward}
        title="兑换确认"
        message={`确定要消耗 ${showConfirmRedeem?.points} 积分兑换 "${showConfirmRedeem?.name}" 吗？`}
        confirmText="确认兑换"
        cancelText="我再想想"
        type="info"
      />

      <section className="rounded-[28px] border border-white/65 bg-white/72 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-lg">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索奖品名字..."
              value={rewardSearchQuery}
              onChange={(e) => setRewardSearchQuery(e.target.value)}
              className="w-full rounded-[18px] border border-slate-200/80 bg-white/95 px-11 py-3 text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/90 px-3 py-2 text-sm text-slate-500">
              <Filter size={16} />
              分类
            </div>
            {[
              { key: "all", label: "全部" },
              { key: "sold-out", label: "已售罄", count: soldOutCount },
              { key: "in-stock", label: "有库存", count: inStockCount },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveCategory(item.key as typeof activeCategory)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === item.key ? "bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]" : "bg-white/85 text-slate-500 ring-1 ring-slate-200/70 hover:bg-slate-50"
                  }`}
              >
                <span className="inline-flex items-center gap-2">
                  {item.label}
                  {"count" in item && typeof item.count === "number" && item.count > 0 && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-current">
                      {item.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500">排序：</span>
          {[
            { key: "points-asc", label: "积分从低到高" },
            { key: "points-desc", label: "积分从高到低" },
            { key: "stock-desc", label: "库存最多" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSortKey(item.key as typeof sortKey)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${sortKey === item.key ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-white/85 text-slate-500 ring-1 ring-slate-200/70 hover:bg-slate-50"
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200/70">共 {filteredRewards.length} 件商品</span>
          <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200/70">当前可用积分 {displayedPoints}</span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <SectionTitle
            icon={<Gift size={16} className="text-blue-500" />}
            title="商品列表"
            description="按库存状态筛选，再按积分或库存排序。"
          />
          <div className="hidden rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-white/80 shadow-sm sm:inline-flex">
            结果 {filteredRewards.length}
          </div>
        </div>

        {filteredRewards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRewards.map((reward) => {
              const canRedeem = reward.stock > 0 && reward.points <= displayedPoints;
              const expired = isPrivilegeExpired(reward);
              const urgent = isPrivilegeUrgent(reward);
              const remainingLabel = getPrivilegeRemainingLabel(reward);
              const urgencyTone = getPrivilegeUrgencyTone(reward);
              return (
                <RewardCard
                  key={reward._id}
                  title={reward.name}
                  icon={reward.icon}
                  points={reward.points}
                  stockLabel={reward.stock > 0 ? `库存 ${reward.stock}` : "已售完"}
                  typeLabel={reward.type === "physical" ? "实物" : "特权"}
                  description={reward.description}
                  tone={reward.type === "privilege" ? (urgent ? "time" : "default") : "default"}
                  meta={
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200/70">
                      {reward.type === "physical" ? "实物奖励" : "特权奖励"}
                    </span>
                  }
                  badges={
                    reward.type === "privilege" ? (
                      <>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            urgencyTone === "rose"
                              ? "bg-rose-50 text-rose-700 ring-rose-100"
                              : urgencyTone === "amber"
                                ? "bg-amber-50 text-amber-700 ring-amber-100"
                                : urgencyTone === "blue"
                                  ? "bg-sky-50 text-sky-700 ring-sky-100"
                                  : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          }`}
                        >
                          {remainingLabel || "无截止日期"}
                        </span>
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                          {formatDuration(reward.validDurationValue, reward.validDurationUnit) || "未设置有效期"}
                        </span>
                        {expired && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">已过截止日期</span>}
                      </>
                    ) : undefined
                  }
                  muted={!reward.stock}
                  primaryAction={
                    <Button
                      fullWidth
                      onClick={() => setShowConfirmRedeem(reward)}
                      disabled={!canRedeem || expired}
                      variant={canRedeem && !expired ? "primary" : "secondary"}
                    >
                      {expired ? "已过截止日期" : canRedeem ? "兑换" : reward.stock <= 0 ? "已售罄" : "积分不足"}
                    </Button>
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState title="没有找到符合条件的商品" hint="换个分类、关键词或者排序试试" />
        )}
      </section>

      <section className="rounded-[28px] border border-white/65 bg-white/72 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle
            icon={<History size={16} className="text-violet-500" />}
            title="我的兑换记录"
            description="最近 5 条记录，方便查看爸妈是否已经处理。"
            titleClassName="text-slate-900 text-lg font-extrabold"
            descriptionClassName="text-slate-500"
          />
          <Button variant="secondary" size="sm" onClick={() => void fetchOrders()} loading={ordersLoading}>
            刷新记录
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order._id}
                className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.95)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.1)] sm:px-5 sm:py-3.5"
              >
                <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-white text-[22px] shadow-[0_10px_20px_rgba(15,23,42,0.08)] ring-1 ring-white">
                      {order.rewardIcon || "🎁"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold leading-5 text-slate-900">{order.rewardName}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${order.status === "verified" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : order.status === "cancelled" ? "bg-slate-100 text-slate-500 ring-slate-200/70" : "bg-amber-50 text-amber-700 ring-amber-100"}`}>
                          {formatStatusLabel(order.status)}
                        </span>
                        <span className="rounded-full bg-white/90 px-2.5 py-1 font-medium text-slate-600 ring-1 ring-slate-200/70">积分 {order.pointsSpent}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:min-w-[240px]">
                    <div className="rounded-[18px] bg-slate-50 px-3 py-2 text-right ring-1 ring-slate-200/70">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">时间</div>
                      <div className="mt-0.5 text-[13px] font-bold leading-4 text-slate-700">{dayjs(order.createdAt).format("MM-DD HH:mm")}</div>
                    </div>
                    <div className="rounded-[18px] bg-sky-950 px-3 py-2 text-right text-white shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">核销码</div>
                      <div className="font-mono text-[13px] font-black leading-4 tracking-[0.14em]">{order.verificationCode}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/75 py-12 text-center text-slate-500">
              <History size={44} className="mx-auto mb-2 opacity-40" />
              <p>还没有兑换记录</p>
            </div>
          )}
        </div>
      </section>

      {total > limit && <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />}
    </div>
  );
}
