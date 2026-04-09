"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  CalendarDays,
  ArrowUpRight,
  ArrowDownLeft,
  Award,
  Wallet,
  ExternalLink,
  X,
  MessageSquareQuote,
  ClipboardList,
  Image as ImageIcon,
} from "lucide-react";
import { Button, DatePicker, Input, TabFilter } from "@/components/ui";
import Image from "@/components/ui/Image";
import { useRouter } from "next/navigation";
import { formatDate } from "@/utils/date";
import request from "@/utils/request";
import {
  ChildEmptyState,
  ChildPanel,
  ChildPageTitle,
  ChildStatCard,
  ChildStatusPill,
} from "@/components/child/ChildUI";

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
  ] as const;

  const hasLedgerData = ledgerData.length > 0;

  return (
    <div className="child-page-grid child-wallet-page">
      <ChildPanel className="child-wallet-hero overflow-hidden">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)] lg:items-center">
          <ChildPageTitle
            icon={<Wallet size={24} />}
            title="积分钱包"
            description="看看积分从哪里来，又花到哪里去。"
          />
          <div className="child-wallet-points-card rounded-[30px] p-5 text-center">
            <div className="text-sm font-black text-[var(--child-text-muted)]">当前可用积分</div>
            <div className="mt-2 text-5xl font-black text-sky-700">
              🪙 {currentUser?.availablePoints || 0}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ChildStatCard
            label="收入"
            value={`+${summary.income}`}
            hint="最近记录"
            tone="emerald"
            icon={<ArrowUpRight size={18} />}
          />
          <ChildStatCard
            label="支出"
            value={`-${summary.expense}`}
            hint="兑换和扣除"
            tone="rose"
            icon={<ArrowDownLeft size={18} />}
          />
          <ChildStatCard
            label="记录"
            value={ledgerTotal}
            hint="账本条数"
            tone="sky"
            icon={<Award size={18} />}
          />
        </div>
      </ChildPanel>

      <ChildPanel className="child-filter-panel">
        <ChildPageTitle
          icon={<CalendarDays size={22} />}
          title="筛选记录"
          description={`当前页 ${ledgerData.length} 条记录`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {quickRanges.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="child-wallet-range-button shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,240px)_minmax(0,360px)_max-content] xl:items-end">
          <div className="min-w-0">
            <Input
              allowClear
              isSearch
              value={ledgerKeyword}
              onChange={(e) => handleKeywordSearch(e.target.value)}
              placeholder="搜索记录..."
              size="sm"
              containerClassName="w-full"
              className="!h-11 !min-h-11 !rounded-[18px] !border-[color:var(--ui-border)] !bg-[var(--ui-surface-1)] !text-sm !text-[var(--ui-text-primary)] !shadow-sm placeholder:!text-[var(--ui-text-soft)] focus:!border-[color:var(--ui-focus)] focus:!bg-[var(--ui-surface-1)]"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <DatePicker
              selected={ledgerStartDate}
              onChange={(date: Date | null) => setLedgerStartDate(date)}
              placeholderText="开始日期"
              className="!border-[color:var(--ui-border)] !bg-[var(--ui-surface-1)] !text-[var(--ui-text-primary)] placeholder:!text-[var(--ui-text-soft)]"
            />
            <DatePicker
              selected={ledgerEndDate}
              onChange={(date: Date | null) => setLedgerEndDate(date)}
              placeholderText="结束日期"
              className="!border-[color:var(--ui-border)] !bg-[var(--ui-surface-1)] !text-[var(--ui-text-primary)] placeholder:!text-[var(--ui-text-soft)]"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <TabFilter
              items={typeFilters}
              activeKey={ledgerTypeFilter}
              onFilterChange={(key) => setLedgerTypeFilter(key as typeof ledgerTypeFilter)}
              className="w-fit max-w-full shrink-0 overflow-hidden [&_button]:h-11 [&_button]:px-3 [&_button]:text-sm [&_button]:font-black"
            />
          </div>
        </div>
      </ChildPanel>

      <ChildPanel className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <ChildPageTitle
            title={ledgerLoading ? "正在更新结果" : "结果列表"}
            description={`共 ${ledgerTotal} 条记录`}
          />
          {ledgerLoading ? (
            <div className="child-wallet-loading-chip flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-sky-700">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              更新中
            </div>
          ) : (
            <div className="child-wallet-pagination-chip hidden rounded-full px-3 py-1 text-xs font-bold text-[var(--child-text-muted)] sm:inline-flex">
              第 {ledgerPage} / {totalPages || 1} 页
            </div>
          )}
        </div>

        <div
          className={`space-y-3 transition-opacity duration-150 ${
            ledgerLoading ? "opacity-90" : "opacity-100"
          }`}
        >
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
              const badgeTone = isIncome || isReward ? "emerald" : "rose";
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
                  className={`child-card group flex cursor-pointer items-center gap-4 transition hover:-translate-y-0.5 ${ledgerLoading ? "opacity-90" : ""} ${tone}`}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white bg-white text-2xl shadow-sm">
                    {item.icon || "🪙"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-800">{displayName}</p>
                      <ChildStatusPill tone={badgeTone}>{badgeText}</ChildStatusPill>
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
            <ChildEmptyState
              title="暂无记录"
              hint="换个筛选条件，或者完成任务后再回来看看。"
              icon="🪙"
            />
          )}
        </div>

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
      </ChildPanel>

      {selectedLedgerItem && (
        <div
          className="fixed inset-0 flex items-end justify-center bg-black/50 px-0 backdrop-blur-sm sm:items-center sm:p-4"
          style={{ zIndex: "var(--z-child-overlay)" }}
          onClick={() => setSelectedLedgerItem(null)}
        >
          <div
            className="child-wallet-detail-modal flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-4 flex items-start justify-between gap-4 px-5 pt-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">账单详情</p>
                  <h3 className="mt-1 text-xl font-black text-slate-900">{selectedLedgerItem.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedLedgerItem(null)}
                  className="child-wallet-detail-close flex h-10 w-10 items-center justify-center rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 hide-scrollbar">
                <div className="child-wallet-detail-surface space-y-4 rounded-[1.5rem] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                        {selectedLedgerItem.icon || "🪙"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">
                          {selectedLedgerItem.type === "income"
                            ? "任务奖励"
                            : selectedLedgerItem.type === "expense"
                              ? "兑换礼物"
                              : "家长反馈"}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(selectedLedgerItem.date)}</p>
                      </div>
                    </div>
                    <p
                      className={`text-2xl font-black ${
                        selectedLedgerItem.type === "income" || selectedLedgerItem.type === "reward"
                          ? "text-sky-600"
                          : "text-rose-600"
                      }`}
                    >
                      {selectedLedgerItem.type === "income" || selectedLedgerItem.type === "reward" ? "+" : "-"}
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
                        <p className="text-sm leading-6 text-slate-600">
                          {selectedLedgerItem.taskDetail.description || "暂无任务描述"}
                        </p>
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
                                  <span className="text-xs font-bold text-slate-500">
                                    第 {index + 1} 次提交
                                  </span>
                                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                                    {record.status === "approved"
                                      ? "通过"
                                      : record.status === "rejected"
                                        ? "驳回"
                                        : "审核中"}
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
                        <p className="text-sm leading-6 text-slate-600">
                          {selectedLedgerItem.feedback || "暂无反馈内容"}
                        </p>
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
          </div>
        </div>
      )}

      {showTaskDetailModal && selectedLedgerItem?.sourceType === "task" && selectedLedgerItem.taskDetail && (
        <div
          className="fixed inset-0 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
          style={{ zIndex: "var(--z-child-overlay-strong)" }}
          onClick={() => setShowTaskDetailModal(false)}
        >
          <div
            className="child-wallet-detail-modal flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4 px-5 pt-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">任务详情</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{selectedLedgerItem.taskDetail.name}</h3>
              </div>
              <button
                onClick={() => setShowTaskDetailModal(false)}
                className="child-wallet-detail-close flex h-10 w-10 items-center justify-center rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pr-1 hide-scrollbar">
              <div className="child-wallet-detail-surface rounded-[1.5rem] p-4">
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
                          <span className="text-xs font-bold text-slate-500">第 {index + 1} 次提交</span>
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                            {record.status === "approved"
                              ? "通过"
                              : record.status === "rejected"
                                ? "驳回"
                                : "审核中"}
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
