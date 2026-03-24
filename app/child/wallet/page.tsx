"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Search, CalendarDays, ArrowUpRight, ArrowDownLeft, Award, Wallet, Sparkles, ExternalLink, X, MessageSquareQuote, ClipboardList, Image as ImageIcon } from "lucide-react";
import { Button, DatePicker } from "@/components/ui";
import Image from "@/components/ui/Image";
import { useRouter } from "next/navigation";
import { formatDate } from "@/utils/date";
import request from "@/utils/request";

interface LedgerItem {
  _id: string;
  type: "income" | "expense" | "deduction" | "reward";
  name: string;
  points: number;
  date: string;
  icon: string;
  sourceType?: "task" | "order";
  sourceId?: string;
  taskDetail?: {
    _id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    status: string;
    requirePhoto: boolean;
    submittedAt?: string | null;
    approvedAt?: string | null;
    updatedAt?: string;
    rejectionReason: string;
    photoUrl: string;
    imageUrl: string;
    auditHistory: Array<{
      submittedAt: string;
      photoUrl: string;
      submitNote: string;
      auditedAt?: string | null;
      status?: "approved" | "rejected";
      auditNote: string;
    }>;
  };
  feedback?: string;
}

export default function WalletPage() {
  const { currentUser } = useApp();
  const router = useRouter();

  // Ledger State
  const [ledgerData, setLedgerData] = useState<LedgerItem[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLimit] = useState(10);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerStartDate, setLedgerStartDate] = useState<Date | null>(null);
  const [ledgerEndDate, setLedgerEndDate] = useState<Date | null>(null);
  const [ledgerKeyword, setLedgerKeyword] = useState("");
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<LedgerItem | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<"all" | "income" | "expense">("all");

  const fetchLedger = useCallback(async (page = 1, typeFilter: "all" | "income" | "expense" = ledgerTypeFilter) => {
    if (!currentUser?.token) return;
    setLedgerLoading(true);
    try {
      const params = {
        page,
        limit: ledgerLimit,
        ...(ledgerStartDate && { startDate: ledgerStartDate.toISOString() }),
        ...(ledgerEndDate && { endDate: ledgerEndDate.toISOString() }),
        ...(ledgerKeyword && { keyword: ledgerKeyword }),
        typeFilter,
      };

      const data = await request(`/api/ledger`, { params });
      if (data.success) {
        setLedgerData(data.data);
        setLedgerTotal(data.pagination.total);
        setLedgerPage(page);
      }
    } catch (error) {
      console.error("Fetch ledger error:", error);
    } finally {
      setLedgerLoading(false);
    }
  }, [currentUser?.token, ledgerLimit, ledgerStartDate, ledgerEndDate, ledgerKeyword, ledgerTypeFilter]);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.token) {
        await fetchLedger(1, ledgerTypeFilter);
      }
    };
    void loadData();
  }, [currentUser, fetchLedger, ledgerTypeFilter]);

  const totalPages = useMemo(
    () => Math.ceil(ledgerTotal / ledgerLimit),
    [ledgerLimit, ledgerTotal],
  );

  const summary = useMemo(() => {
    const income = ledgerData.filter((item) => item.type === "income" || item.type === "reward").reduce((sum, item) => sum + item.points, 0);
    const expense = ledgerData.filter((item) => item.type === "expense" || item.type === "deduction").reduce((sum, item) => sum + item.points, 0);
    return { income, expense };
  }, [ledgerData]);

  const quickRanges = [
    {
      label: "近7天",
      onClick: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        setLedgerStartDate(start);
        setLedgerEndDate(end);
      },
    },
    {
      label: "本月",
      onClick: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setLedgerStartDate(start);
        setLedgerEndDate(now);
      },
    },
    {
      label: "清空",
      onClick: () => {
        setLedgerStartDate(null);
        setLedgerEndDate(null);
        setLedgerKeyword("");
      },
    },
  ];

  const handleKeywordSearch = (value: string) => {
    setLedgerKeyword(value);
  };

  const typeFilters = [
    { key: "all" as const, label: "全部" },
    { key: "income" as const, label: "收入" },
    { key: "expense" as const, label: "支出" },
  ];
  const hasLedgerData = ledgerData.length > 0;

  return (
    <div className="pb-8 space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-slate-900 to-blue-900 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.32)]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -right-10 -top-8 h-28 w-28 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-cyan-200/30 blur-3xl" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md shadow-sm">
              <Wallet size={14} />
              我的钱包
            </div>
            <p className="text-sm text-white/80">查看积分明细和收支变化</p>
            <div className="mt-4 text-4xl font-black tracking-tight">🪙 {currentUser?.availablePoints || 0}</div>
            <p className="mt-1 text-sm text-white/75">当前可用积分</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-slate-950/35 px-4 py-3 backdrop-blur-md shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
            <Sparkles size={18} className="mb-2 text-yellow-300" />
            <p className="text-xs text-white/75">最近收入</p>
            <p className="text-lg font-bold">+{summary.income}</p>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/20 bg-slate-950/35 p-3 backdrop-blur-md shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
            <ArrowUpRight size={16} className="text-emerald-200" />
            <p className="mt-2 text-xs text-white/70">收入</p>
            <p className="text-base font-bold">+{summary.income}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-slate-950/35 p-3 backdrop-blur-md shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
            <ArrowDownLeft size={16} className="text-rose-200" />
            <p className="mt-2 text-xs text-white/70">支出</p>
            <p className="text-base font-bold">-{summary.expense}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-slate-950/35 p-3 backdrop-blur-md shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
            <Award size={16} className="text-amber-200" />
            <p className="mt-2 text-xs text-white/70">记录</p>
            <p className="text-base font-bold">{ledgerTotal}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CalendarDays size={16} className="text-blue-600" />
            筛选记录
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            当前页 {ledgerData.length} 条
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickRanges.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <DatePicker
            selected={ledgerStartDate}
            onChange={(date: Date | null) => setLedgerStartDate(date)}
            placeholderText="开始日期"
            className="border-slate-200 text-gray-800 bg-slate-50"
          />
          <DatePicker
            selected={ledgerEndDate}
            onChange={(date: Date | null) => setLedgerEndDate(date)}
            placeholderText="结束日期"
            className="border-slate-200 text-gray-800 bg-slate-50"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="搜索记录..."
            value={ledgerKeyword}
            onChange={(e) => handleKeywordSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-9 py-3 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {typeFilters.map((item) => (
            <button
              key={item.key}
              onClick={() => setLedgerTypeFilter(item.key)}
              disabled={ledgerLoading}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                ledgerTypeFilter === item.key
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              } ${ledgerLoading ? "cursor-wait opacity-80" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm">
          <div className={`flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 ${ledgerLoading ? "bg-slate-50/80 rounded-t-[1.5rem]" : ""}`}>
            <p className="text-sm font-semibold text-slate-600">
              {ledgerLoading ? "正在更新结果" : "结果列表"}
            </p>
            {ledgerLoading ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                保留当前结果，加载新数据中
              </div>
            ) : (
              <p className="text-xs text-slate-400">共 {ledgerTotal} 条记录</p>
            )}
          </div>

          <div className={`space-y-3 p-4 transition-opacity duration-150 ${ledgerLoading ? "opacity-90" : "opacity-100"}`}>
            {hasLedgerData ? (
              ledgerData.map((item) => {
                const isIncome = item.type === "income";
                const isExpense = item.type === "expense" || item.type === "deduction";
                const isDeduction = item.type === "deduction";
                const isReward = item.type === "reward";
                const tone = isIncome
                  ? "bg-sky-50 border-sky-200"
                  : isExpense
                    ? "bg-rose-50 border-rose-200"
                    : "bg-emerald-50 border-emerald-200";
                const textColor = isIncome
                  ? "text-sky-600"
                  : isExpense
                    ? "text-rose-600"
                    : "text-emerald-600";
                const sign = isIncome || isReward ? "+" : "-";
                const badgeText = isIncome || isReward ? "收入" : "支出";

                let displayName = item.name;
                if (isDeduction) {
                  displayName = `家长扣除：${item.name}`;
                } else if (isReward) {
                  displayName = `家长奖励：${item.name}`;
                }

                return (
                  <div
                    key={item._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedLedgerItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedLedgerItem(item);
                    }}
                    className={`group flex cursor-pointer items-center gap-4 rounded-[1.5rem] border ${tone} px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-2xl shadow-sm">
                      {item.icon || "🪙"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-800">
                          {displayName}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${textColor} bg-white`}>
                          {badgeText}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(item.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${textColor}`}>
                        {sign}
                        {item.points}
                      </p>
                      <p className="text-[11px] text-slate-400">积分</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200/80 bg-white py-12 text-center text-slate-500 shadow-sm">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                  🪙
                </div>
                <p className="font-semibold text-slate-700">暂无记录</p>
                <p className="mt-1 text-sm text-slate-500">试试换个筛选条件、日期范围或清空搜索条件</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => fetchLedger(ledgerPage - 1)}
                  disabled={ledgerPage === 1 || ledgerLoading}
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-full px-4"
                >
                  上一页
                </Button>
                <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                  {ledgerPage} / {totalPages}
                </span>
                <Button
                  onClick={() => fetchLedger(ledgerPage + 1)}
                  disabled={ledgerPage === totalPages || ledgerLoading}
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-full px-4"
                >
                  下一页
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedLedgerItem && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelectedLedgerItem(null)}
        >
          <div
            className="w-full max-w-md rounded-t-[2rem] bg-white p-5 text-slate-800 shadow-2xl sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">账单详情</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{selectedLedgerItem.name}</h3>
              </div>
              <button
                onClick={() => setSelectedLedgerItem(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-[1.5rem] bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    {selectedLedgerItem.icon || "🪙"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">
                      {selectedLedgerItem.type === "income" ? "任务奖励" : selectedLedgerItem.type === "expense" ? "兑换礼物" : "家长反馈"}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(selectedLedgerItem.date)}</p>
                  </div>
                </div>
                <p className={`text-2xl font-black ${selectedLedgerItem.type === "income" ? "text-sky-600" : "text-rose-600"}`}>
                  {selectedLedgerItem.type === "income" ? "+" : "-"}
                  {selectedLedgerItem.points}
                </p>
              </div>

              {selectedLedgerItem.sourceType === "task" && selectedLedgerItem.taskDetail ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <ClipboardList size={16} className="text-blue-600" />
                      任务内容
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{selectedLedgerItem.taskDetail.description || "暂无任务描述"}</p>
                    {selectedLedgerItem.taskDetail.imageUrl && (
                      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <ImageIcon size={15} className="text-slate-400" />
                        任务包含图片说明
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <MessageSquareQuote size={16} className="text-violet-600" />
                      审核过程
                    </div>
                    {selectedLedgerItem.taskDetail.auditHistory.length > 0 ? (
                      <div className="space-y-3">
                        {selectedLedgerItem.taskDetail.auditHistory.map((record, index) => (
                          <div key={`${record.submittedAt}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-500">第 {index + 1} 次提交</span>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                                {record.status === "approved" ? "通过" : record.status === "rejected" ? "驳回" : "审核中"}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">提交时间: {formatDate(record.submittedAt)}</p>
                            {record.photoUrl && (
                              <div className="mt-2">
                                <p className="mb-1 text-xs text-slate-500">提交的照片：</p>
                                <div className="h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                  <Image
                                    src={record.photoUrl}
                                    alt={`第 ${index + 1} 次提交的照片`}
                                    className="h-full w-full object-cover"
                                    enableZoom={true}
                                    containerClassName="h-full w-full"
                                  />
                                </div>
                              </div>
                            )}
                            {record.auditNote && <p className="mt-2 text-sm text-slate-700">{record.auditNote}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">暂无审核记录</p>
                    )}
                  </div>

                  <Button className="w-full" onClick={() => setShowTaskDetailModal(true)}>
                    打开任务详情
                    <ExternalLink size={16} />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <MessageSquareQuote size={16} className="text-rose-600" />
                      家长反馈
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{selectedLedgerItem.feedback || "暂无反馈内容"}</p>
                  </div>
                  {selectedLedgerItem.type === "expense" && (
                    <Button className="w-full" onClick={() => router.push("/child/gift")}>
                      查看兑换的礼物
                      <ExternalLink size={16} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTaskDetailModal && selectedLedgerItem?.sourceType === "task" && selectedLedgerItem.taskDetail && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowTaskDetailModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-t-[2rem] bg-white p-5 text-slate-800 shadow-2xl sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">任务详情</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{selectedLedgerItem.taskDetail.name}</h3>
              </div>
              <button
                onClick={() => setShowTaskDetailModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                      {selectedLedgerItem.taskDetail.icon || "⭐"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">任务内容</p>
                      <p className="text-xs text-slate-500">{formatDate(selectedLedgerItem.date)}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-sky-600">+{selectedLedgerItem.taskDetail.points}</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {selectedLedgerItem.taskDetail.description || "暂无任务描述"}
                </p>
                {selectedLedgerItem.taskDetail.imageUrl && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                    <ImageIcon size={15} className="text-slate-400" />
                    任务包含图片说明
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <MessageSquareQuote size={16} className="text-violet-600" />
                  审核过程
                </div>
                {selectedLedgerItem.taskDetail.auditHistory.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLedgerItem.taskDetail.auditHistory.map((record, index) => (
                      <div key={`${record.submittedAt}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-500">
                            第 {index + 1} 次提交
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                            {record.status === "approved" ? "通过" : record.status === "rejected" ? "驳回" : "审核中"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">提交时间: {formatDate(record.submittedAt)}</p>
                        {record.photoUrl && (
                          <div className="mt-2">
                            <p className="mb-1 text-xs text-slate-500">提交的照片：</p>
                            <div className="h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                              <Image
                                src={record.photoUrl}
                                alt={`第 ${index + 1} 次提交的照片`}
                                className="h-full w-full object-cover"
                                enableZoom={true}
                                containerClassName="h-full w-full"
                              />
                            </div>
                          </div>
                        )}
                        {record.auditNote && <p className="mt-2 text-sm text-slate-700">{record.auditNote}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">暂无审核记录</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
