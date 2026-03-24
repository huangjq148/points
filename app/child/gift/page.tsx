"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Gift, Wallet, BadgeCheck, Clock3, Sparkles } from "lucide-react";
import { Button, DatePicker, Modal } from "@/components/ui";
import { formatDate } from "@/utils/date";
import { useToast } from "@/components/ui/Toast";
import request from "@/utils/request";

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

export default function GiftPage() {
  const { currentUser } = useApp();
  const toast = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [giftSearchQuery, setGiftSearchQuery] = useState("");
  const [giftDate, setGiftDate] = useState<Date | null>(null);
  const [giftStatusFilter, setGiftStatusFilter] = useState<"all" | "pending" | "verified" | "cancelled">("pending");
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!currentUser?.token) return;
    const data = await request(`/api/orders`);
    if (data.success) {
      setOrders(data.orders);
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
    let filtered = orders;
    if (giftSearchQuery) {
      filtered = filtered.filter((o) => o.rewardName.toLowerCase().includes(giftSearchQuery.toLowerCase()));
    }
    if (giftDate) {
      const filterDate = giftDate.toDateString();
      filtered = filtered.filter((o) => new Date(o.createdAt).toDateString() === filterDate);
    }
    if (giftStatusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === giftStatusFilter);
    }
    return filtered;
  }, [giftDate, giftSearchQuery, giftStatusFilter, orders]);

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

  return (
    <>
      <Modal
        title="兑换详情"
        isOpen={!!showOrderDetail}
        onClose={() => setShowOrderDetail(null)}
        width={560}
        className="overflow-hidden !rounded-[2rem] !p-0 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
        showCloseButton
        noInternalScroll
      >
        {showOrderDetail && (
          <div className="flex flex-col overflow-hidden bg-white">
            <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-amber-50 px-6 pt-6 pb-5">
              <div className="absolute -right-8 -top-6 h-24 w-24 rounded-full bg-sky-200/60 blur-2xl" />
              <div className="absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-amber-200/60 blur-2xl" />
              <div className="relative text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-[0_10px_30px_rgba(59,130,246,0.12)] ring-1 ring-sky-100 text-4xl">
                  {showOrderDetail.rewardIcon}
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900">{showOrderDetail.rewardName}</h3>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                    <Sparkles size={12} />
                    -{showOrderDetail.pointsSpent} 积分
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${showOrderDetail.status === "verified"
                        ? "bg-emerald-100 text-emerald-700"
                        : showOrderDetail.status === "cancelled"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-amber-100 text-amber-700"
                      }`}
                  >
                    {showOrderDetail.status === "verified" && <BadgeCheck size={12} />}
                    {showOrderDetail.status === "pending" && <Clock3 size={12} />}
                    {showOrderDetail.status === "verified"
                      ? "已核销"
                      : showOrderDetail.status === "cancelled"
                        ? "已取消"
                        : "待核销"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              {showOrderDetail.status === "pending" && (
                <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-4">
                  <p className="mb-1 text-sm font-bold text-amber-800">请向家长出示核销码</p>
                  <p className="font-mono text-3xl font-black tracking-[0.28em] text-amber-900">
                    {showOrderDetail.verificationCode}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">兑换时间</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{formatDate(showOrderDetail.createdAt)}</p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">核销时间</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {showOrderDetail.verifiedAt ? formatDate(showOrderDetail.verifiedAt) : "暂无"}
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

      <div className="mb-4 flex items-center gap-2">
        <Button
          onClick={() => navigateTo("store")}
          variant="secondary"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border-none bg-white/85 p-0 shadow-[0_8px_24px_rgba(59,130,246,0.12)] transition hover:bg-white"
        >
          <ChevronRight size={24} className="text-sky-600 rotate-180" />
        </Button>
        <div>
          <h2 className="text-xl font-black tracking-tight text-sky-800 md:text-2xl">我的礼物</h2>
          <p className="text-xs font-medium text-sky-500">看看已经兑换了哪些小惊喜</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            onClick={() => navigateTo("wallet")}
            variant="secondary"
            size="sm"
            className="rounded-full border-none bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          >
            <Wallet size={16} className="mr-1" />
            钱包
          </Button>
        </div>
      </div>

      {/* 礼物筛选区 */}
      <div className="mb-4 space-y-3 rounded-[1.75rem] border border-white/70 bg-white/70 p-3 shadow-[0_10px_30px_rgba(59,130,246,0.08)] backdrop-blur">
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" size={18} />
            <input
              type="text"
              placeholder="搜索礼物..."
              value={giftSearchQuery}
              onChange={(e) => setGiftSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-sky-100 bg-white/90 py-3 pl-10 pr-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-200 focus:ring-4 focus:ring-sky-100"
            />
          </div>
          <DatePicker
            selected={giftDate}
            onChange={(date: Date | null) => setGiftDate(date)}
            placeholderText="兑换日期"
            className="rounded-2xl border-sky-100 text-slate-700"
          />
        </div>
        <div className="flex overflow-x-auto rounded-[1.35rem] border border-sky-100 bg-sky-50/70 p-1 backdrop-blur">
          {(["all", "pending", "verified", "cancelled"] as const).map((status) => (
            <Button
              key={status}
              onClick={() => setGiftStatusFilter(status)}
              variant="secondary"
              className={`flex-1 whitespace-nowrap rounded-[1rem] border-none py-2 text-xs font-bold transition md:text-sm ${giftStatusFilter === status
                  ? "bg-white text-sky-700 shadow-[0_8px_18px_rgba(14,165,233,0.14)]"
                  : "bg-transparent text-slate-500 hover:bg-white/70 hover:text-sky-600"
                }`}
            >
              {status === "all"
                ? "全部"
                : status === "pending"
                  ? "未核销"
                  : status === "verified"
                    ? "已核销"
                    : "已取消"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div
              key={order._id}
              className={`group relative flex cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-[1.6rem] border p-3 text-center transition active:scale-[0.98] ${order.status === "verified"
                  ? "border-emerald-100 bg-emerald-50/70 shadow-[0_10px_24px_rgba(16,185,129,0.08)]"
                  : order.status === "cancelled"
                    ? "border-slate-100 bg-slate-50/80 opacity-75"
                    : "border-sky-100 bg-white shadow-[0_10px_24px_rgba(59,130,246,0.08)]"
                }`}
              onClick={() => setShowOrderDetail(order)}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-sky-200 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 text-3xl">
                {order.rewardIcon}
              </div>
              <h3 className="line-clamp-1 text-sm font-black tracking-tight text-slate-800">{order.rewardName}</h3>
              <div className="flex w-full flex-col gap-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${order.status === "verified"
                        ? "bg-emerald-500"
                        : order.status === "cancelled"
                          ? "bg-gray-400"
                          : "bg-amber-500"
                      }`}
                  />
                  <span className="text-xs font-semibold text-slate-500">
                    {order.status === "verified" ? "已核销" : order.status === "cancelled" ? "已取消" : "待核销"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-black/5 pt-1 text-[10px] text-slate-400">
                  <span>🪙 {order.pointsSpent}</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 rounded-[1.75rem] border border-sky-100 bg-white/80 py-14 text-center text-slate-500 shadow-[0_10px_28px_rgba(59,130,246,0.06)]">
            <Gift size={48} className="mx-auto mb-3 text-sky-300" />
            <p className="font-semibold text-slate-600">还没兑换过礼物哦</p>
            <Button
              onClick={() => navigateTo("store")}
              variant="secondary"
              className="mt-3 border-none bg-transparent text-sky-500 shadow-none"
            >
              去商城看看
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
