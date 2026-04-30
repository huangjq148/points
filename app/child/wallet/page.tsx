"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  CalendarDays,
  Award,
  Wallet,
  ExternalLink,
  X,
  MessageSquareQuote,
  ClipboardList,
  Image as ImageIcon,
  Sparkles,
  Compass,
  Star,
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

  const adventureSummary = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 6);

    let todayIncome = 0;
    let weekIncome = 0;

    ledgerData.forEach((item) => {
      const isIncome = item.type === "income" || item.type === "reward";
      if (!isIncome) return;

      const itemDate = new Date(item.date);
      if (itemDate >= startOfToday) todayIncome += item.points;
      if (itemDate >= startOfWeek) weekIncome += item.points;
    });

    const availablePoints = currentUser?.availablePoints || 0;
    const currentLevel = Math.max(1, Math.floor(availablePoints / 50) + 1);
    const currentLevelBase = (currentLevel - 1) * 50;
    const nextLevelTarget = currentLevel * 50;
    const progress = Math.min(
      100,
      Math.round(((availablePoints - currentLevelBase) / Math.max(1, nextLevelTarget - currentLevelBase)) * 100),
    );

    return {
      todayIncome,
      weekIncome,
      currentLevel,
      nextLevelTarget,
      progress,
    };
  }, [currentUser?.availablePoints, ledgerData]);

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

  const getLedgerStory = (item: LedgerItem) => {
    if (item.type === "deduction") return "这次被家长扣掉了一些积分";
    if (item.type === "expense") {
      if (item.sourceType === "order") return "你用积分兑换了一个奖励";
      return "这次花掉了一些积分";
    }
    if (item.type === "income") return "完成任务后收进了宝箱";
    if (item.type === "reward") {
      if (item.sourceType === "task") return "完成任务后收进了宝箱";
      return "家长给你加了一份惊喜奖励";
    }
    return "这是一条新的积分记录";
  };

  return (
    <div className="child-page-grid child-wallet-page">
      <ChildPanel className="child-wallet-hero overflow-hidden">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-center">
          <div className="space-y-4">
            <ChildPageTitle
              icon={<Wallet size={24} />}
              title="我的积分宝箱"
              description="每次完成任务，宝箱都会亮一点。来看看你最近收集了多少能量吧。"
            />
            <div className="flex flex-wrap gap-2">
              <span className="child-wallet-hero-chip">
                <Sparkles size={14} />
                做任务收金币
              </span>
              <span className="child-wallet-hero-chip">
                <Compass size={14} />
                看清每一笔去向
              </span>
              <span className="child-wallet-hero-chip">
                <Star size={14} />
                朝下一级宝箱出发
              </span>
            </div>
          </div>
          <div className="child-wallet-points-card rounded-[30px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black text-[var(--child-text-muted)]">宝箱能量</div>
                <div className="mt-2 text-5xl font-black text-[var(--child-text)]">
                  🪙 {currentUser?.availablePoints || 0}
                </div>
              </div>
              <div className="child-wallet-level-badge">
                Lv.{adventureSummary.currentLevel}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--child-text-muted)]">
                <span>离下一等级还有 {Math.max(0, adventureSummary.nextLevelTarget - (currentUser?.availablePoints || 0))} 积分</span>
                <span>{adventureSummary.progress}%</span>
              </div>
              <div className="child-wallet-progress-track mt-2">
                <div
                  className="child-wallet-progress-bar"
                  style={{ width: `${adventureSummary.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ChildStatCard
            label="今天收集"
            value={`+${adventureSummary.todayIncome}`}
            hint="按当前记录页统计"
            tone="emerald"
            icon={<Sparkles size={18} />}
          />
          <ChildStatCard
            label="本周收集"
            value={`+${adventureSummary.weekIncome}`}
            hint="最近 7 天"
            tone="sky"
            icon={<Compass size={18} />}
          />
          <ChildStatCard
            label="宝箱足迹"
            value={ledgerTotal}
            hint={`收入 ${summary.income} / 支出 ${summary.expense}`}
            tone="amber"
            icon={<Award size={18} />}
          />
        </div>
      </ChildPanel>

      <ChildPanel className="child-filter-panel">
        <ChildPageTitle
          icon={<CalendarDays size={22} />}
          title="翻翻记录地图"
          description={`当前页找到 ${ledgerData.length} 条足迹`}
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
            title={ledgerLoading ? "正在整理冒险记录" : "积分冒险记录"}
            description={`共 ${ledgerTotal} 条记录，点开卡片可以看详情`}
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
                ? "child-wallet-ledger-card-income"
                : isExpense
                  ? "child-wallet-ledger-card-expense"
                  : "child-wallet-ledger-card-reward";
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
                  className={`child-card child-wallet-ledger-card group flex cursor-pointer items-center gap-4 transition hover:-translate-y-0.5 ${ledgerLoading ? "opacity-90" : ""} ${tone}`}
                >
                  <div className="child-wallet-ledger-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm">
                    {item.icon || "🪙"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-[var(--child-text)]">{displayName}</p>
                      <ChildStatusPill tone={badgeTone}>{badgeText}</ChildStatusPill>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[var(--child-text-muted)]">{getLedgerStory(item)}</p>
                    <p className="mt-1 text-[11px] text-[var(--child-text-muted)]/80">{formatDate(item.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${textColor}`}>
                      {sign}
                      {item.points}
                    </p>
                    <p className="text-[11px] text-[var(--child-text-muted)]/80">积分</p>
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
            <span className="child-wallet-pagination-chip rounded-full px-4 py-2 text-sm font-semibold text-[var(--child-text-muted)] shadow-sm">
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
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--child-text-muted)]/80">冒险详情</p>
                  <h3 className="mt-1 text-xl font-black text-[var(--ui-text-primary)]">{selectedLedgerItem.name}</h3>
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
                      <div className="child-wallet-detail-icon flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm">
                        {selectedLedgerItem.icon || "🪙"}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--ui-text-primary)]">
                          {selectedLedgerItem.type === "income"
                            ? "任务奖励"
                            : selectedLedgerItem.type === "expense"
                              ? "兑换礼物"
                              : "家长反馈"}
                        </p>
                        <p className="text-xs text-[var(--ui-text-muted)]">{formatDate(selectedLedgerItem.date)}</p>
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
                      <div className="child-wallet-detail-card rounded-2xl p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--ui-text-primary)]">
                          <ClipboardList size={16} className="text-blue-600" />
                          任务内容
                        </div>
                        <p className="text-sm leading-6 text-[var(--ui-text-secondary)]">
                          {selectedLedgerItem.taskDetail.description || "暂无任务描述"}
                        </p>
                        {selectedLedgerItem.taskDetail.imageUrl && (
                          <div className="child-wallet-detail-note mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--ui-text-secondary)]">
                            <ImageIcon size={15} className="text-[var(--ui-text-muted)]" />
                            任务包含图片说明
                          </div>
                        )}
                      </div>

                      <div className="child-wallet-detail-card rounded-2xl p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--ui-text-primary)]">
                          <MessageSquareQuote size={16} className="text-violet-600" />
                          审核过程
                        </div>
                        {selectedLedgerItem.taskDetail.auditHistory.length > 0 ? (
                          <div className="space-y-3">
                            {selectedLedgerItem.taskDetail.auditHistory.map((record, index) => (
                              <div key={`${record.submittedAt}-${index}`} className="child-wallet-detail-note rounded-2xl p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-[var(--ui-text-muted)]">
                                    第 {index + 1} 次提交
                                  </span>
                                  <span className="child-wallet-detail-mini-pill rounded-full px-2 py-1 text-[10px] font-bold text-[var(--ui-text-secondary)]">
                                    {record.status === "approved"
                                      ? "通过"
                                      : record.status === "rejected"
                                        ? "驳回"
                                        : "审核中"}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-[var(--ui-text-muted)]">提交时间: {formatDate(record.submittedAt)}</p>
                                {record.photoUrl && (
                                  <div className="mt-2">
                                    <p className="mb-1 text-xs text-[var(--ui-text-muted)]">提交的照片：</p>
                                    <div className="child-wallet-photo-frame h-24 w-24 overflow-hidden rounded-xl shadow-sm">
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
                                {record.auditNote && <p className="mt-2 text-sm text-[var(--ui-text-primary)]">{record.auditNote}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--ui-text-muted)]">暂无审核记录</p>
                        )}
                      </div>

                      <Button className="w-full" onClick={() => setShowTaskDetailModal(true)}>
                        打开任务详情
                        <ExternalLink size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="child-wallet-detail-card rounded-2xl p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--ui-text-primary)]">
                          <MessageSquareQuote size={16} className="text-rose-600" />
                          家长反馈
                        </div>
                        <p className="text-sm leading-6 text-[var(--ui-text-secondary)]">
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
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--child-text-muted)]/80">任务详情</p>
                <h3 className="mt-1 text-xl font-black text-[var(--ui-text-primary)]">{selectedLedgerItem.taskDetail.name}</h3>
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
                    <div className="child-wallet-detail-icon flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm">
                      {selectedLedgerItem.taskDetail.icon || "⭐"}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--ui-text-primary)]">任务内容</p>
                      <p className="text-xs text-[var(--ui-text-muted)]">{formatDate(selectedLedgerItem.date)}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-sky-600">+{selectedLedgerItem.taskDetail.points}</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--ui-text-secondary)]">
                  {selectedLedgerItem.taskDetail.description || "暂无任务描述"}
                </p>
                {selectedLedgerItem.taskDetail.imageUrl && (
                  <div className="child-wallet-detail-note mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--ui-text-secondary)]">
                    <ImageIcon size={15} className="text-[var(--ui-text-muted)]" />
                    任务包含图片说明
                  </div>
                )}
              </div>

              <div className="child-wallet-detail-card rounded-[1.5rem] p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--ui-text-primary)]">
                  <MessageSquareQuote size={16} className="text-violet-600" />
                  审核过程
                </div>
                {selectedLedgerItem.taskDetail.auditHistory.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLedgerItem.taskDetail.auditHistory.map((record, index) => (
                      <div key={`${record.submittedAt}-${index}`} className="child-wallet-detail-note rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--ui-text-muted)]">第 {index + 1} 次提交</span>
                          <span className="child-wallet-detail-mini-pill rounded-full px-2 py-1 text-[10px] font-bold text-[var(--ui-text-secondary)]">
                            {record.status === "approved"
                              ? "通过"
                              : record.status === "rejected"
                                ? "驳回"
                                : "审核中"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[var(--ui-text-muted)]">提交时间: {formatDate(record.submittedAt)}</p>
                        {record.photoUrl && (
                          <div className="mt-2">
                            <p className="mb-1 text-xs text-[var(--ui-text-muted)]">提交的照片：</p>
                            <div className="child-wallet-photo-frame h-24 w-24 overflow-hidden rounded-xl shadow-sm">
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
                        {record.auditNote && <p className="mt-2 text-sm text-[var(--ui-text-primary)]">{record.auditNote}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ui-text-muted)]">暂无审核记录</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
