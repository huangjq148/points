import { PlainTask, AuditRecord } from "@/app/typings";
import { Clock, Edit2, Trash2, X, Check, Image as ImageIcon, History, Calendar, User, Award, AlertCircle, PlayCircle, PauseCircle } from "lucide-react";
import { Button, Modal, Image as ZoomImage } from "@/components/ui";
import { formatDate } from "@/utils/date";
import { useState } from "react";

export interface IDisplayedTask extends PlainTask {
  childName: string;
  childAvatar?: string;
  isRecurring?: boolean;
}

interface TaskCardProps {
  task: IDisplayedTask;
  now: number;
  onEdit: (task: IDisplayedTask) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, now, onEdit, onDelete }: TaskCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const isOverdue = task.deadline && now > 0 && new Date(task.deadline).getTime() < now && task.status === "pending";
  const isNotStarted = task.startDate && now > 0 && new Date(task.startDate).getTime() > now && task.status === "pending";

  // 根据状态获取样式 - 优化视觉效果
  const getStatusStyles = () => {
    if (task.status === "approved") {
      return {
        className: "bg-[var(--ui-surface-1)] border-[color:var(--ui-success-border)]",
        statusLabel: "已完成",
        statusClass: "bg-[var(--ui-success-text)] text-white border-[color:var(--ui-success-border)]",
        dotClass: "bg-emerald-500",
        icon: <Check size={12} className="text-white" />,
        gradient: "from-emerald-600 to-emerald-500",
        tooltipClass: "bg-emerald-600 text-white",
        accentClass: "bg-emerald-500",
      };
    }
    if (task.status === "submitted") {
      return {
        className: "bg-[var(--ui-surface-1)] border-[color:var(--ui-warning-border)]",
        statusLabel: "待审核",
        statusClass: "bg-[var(--ui-warning-text)] text-white border-[color:var(--ui-warning-border)]",
        dotClass: "bg-amber-500",
        icon: <AlertCircle size={12} className="text-white" />,
        gradient: "from-amber-600 to-orange-500",
        tooltipClass: "bg-amber-600 text-white",
        accentClass: "bg-amber-500",
      };
    }
    if (isNotStarted) {
      return {
        className: "bg-[var(--ui-surface-1)] border-[color:var(--ui-action-blue-border)]",
        statusLabel: "未开始",
        statusClass: "bg-[var(--ui-focus)] text-white border-[color:var(--ui-action-blue-border)]",
        dotClass: "bg-sky-500",
        icon: <PauseCircle size={12} className="text-white" />,
        gradient: "from-sky-600 to-cyan-500",
        tooltipClass: "bg-sky-600 text-white",
        accentClass: "bg-sky-500",
      };
    }
    if (isOverdue) {
      return {
        className: "bg-[var(--ui-surface-1)] border-[color:var(--ui-danger-border)]",
        statusLabel: "已逾期",
        statusClass: "bg-[var(--ui-danger-text)] text-white border-[color:var(--ui-danger-border)]",
        dotClass: "bg-rose-500",
        icon: <AlertCircle size={12} className="text-white" />,
        gradient: "from-rose-600 to-pink-500",
        tooltipClass: "bg-rose-700 text-white",
        accentClass: "bg-rose-500",
      };
    }
    if (task.status === "rejected") {
      return {
        className: "bg-[var(--ui-surface-1)] border-[color:var(--ui-border-strong)]",
        statusLabel: "已驳回",
        statusClass: "bg-[var(--ui-text-muted)] text-white border-[color:var(--ui-border-strong)]",
        dotClass: "bg-zinc-500",
        icon: <X size={12} className="text-white" />,
        gradient: "from-zinc-700 to-zinc-500",
        tooltipClass: "bg-zinc-700 text-white",
        accentClass: "bg-zinc-500",
      };
    }
    return {
      className: "bg-[var(--ui-surface-1)] border-[color:var(--ui-action-blue-border)]",
      statusLabel: "进行中",
      statusClass: "bg-[var(--ui-focus)] text-white border-[color:var(--ui-action-blue-border)]",
      dotClass: "bg-indigo-500",
      icon: <PlayCircle size={12} className="text-white" />,
      gradient: "from-indigo-600 to-blue-500",
      tooltipClass: "bg-indigo-700 text-white",
      accentClass: "bg-indigo-500",
    };
  };

  const styles = getStatusStyles();
  const latestAudit = task.auditHistory?.[0];
  const parentFeedback = latestAudit?.auditNote
    ? {
      label: latestAudit.status === "approved" ? "家长反馈" : "驳回原因",
      text: latestAudit.auditNote,
      className:
        latestAudit.status === "approved"
          ? "bg-[var(--ui-surface-2)] text-[var(--ui-text-secondary)] border-[color:var(--ui-border)]"
          : "bg-[var(--ui-surface-2)] text-[var(--ui-text-secondary)] border-[color:var(--ui-border)]",
    }
    : task.rejectionReason
      ? {
        label: "驳回原因",
        text: task.rejectionReason,
        className: "bg-[var(--ui-surface-2)] text-[var(--ui-text-secondary)] border-[color:var(--ui-border)]",
      }
      : null;

  // 渲染操作记录 - 数据已按时间倒序排列（最新的在最前面）
  const renderAuditHistory = () => {
    if (!task.auditHistory || task.auditHistory.length === 0) {
      return (
        <div className="py-8 text-center text-[var(--ui-text-soft)]">
          <History size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无操作记录</p>
        </div>
      );
    }

    const history = task.auditHistory;
    return (
      <div className="space-y-4">
        {history.map((record: AuditRecord, index: number) => (
          <div
            key={record._id || index}
            className={`relative pl-6 pb-4 ${index !== history.length - 1 ? "ml-2 border-l-2 border-[color:var(--ui-border)]" : "ml-2"}`}
          >
            {/* 时间线节点 */}
            <div
              className={`absolute left-0 top-0 h-4 w-4 rounded-full border-2 border-[var(--ui-surface-1)] shadow-[var(--ui-shadow-sm)] ${
                record.status === "approved"
                  ? "bg-emerald-500"
                  : record.status === "rejected"
                    ? "bg-rose-500"
                    : "bg-sky-500"
              }`}
              style={{ transform: "translateX(-50%)" }}
            />

            <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] p-4 shadow-[var(--ui-shadow-sm)]">
              {/* 提交信息区域 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--ui-surface-2)] px-2 py-0.5 text-xs font-bold text-[var(--ui-text-secondary)]">
                      第 {index + 1} 次操作 · 提交
                    </span>
                    <span className="text-xs text-[var(--ui-text-soft)]">
                      {formatDate(record.submittedAt)}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-[var(--ui-text-soft)]">
                    <ImageIcon size={12} />
                    {record.photoUrl ? '有照片' : '无照片'}
                  </span>
                </div>

                {/* 孩子提交的凭证照片 */}
                {record.photoUrl ? (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">孩子提交的凭证照片：</p>
                    <div className="h-40 w-full max-w-[200px] overflow-hidden rounded-xl border-2 border-[color:var(--ui-border)] shadow-[var(--ui-shadow-sm)] transition-shadow hover:shadow-[var(--ui-shadow-md)]">
                      <ZoomImage
                        src={record.photoUrl}
                        alt={`第 ${index + 1} 次提交的照片凭证`}
                        className="object-cover w-full h-full"
                        enableZoom={true}
                        zoomHint="点击查看大图"
                        containerClassName="w-full h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
                    <p className="flex items-center gap-1 text-xs text-[var(--ui-text-soft)]">
                      <ImageIcon size={12} />
                      此次提交未上传照片凭证
                    </p>
                  </div>
                )}

                {/* 孩子提交的备注 */}
                {record.submitNote && (
                  <div className="mt-3 rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
                    <p className="mb-1 text-xs font-medium text-[var(--ui-text-muted)]">孩子留言：</p>
                    <p className="text-sm text-[var(--ui-text-secondary)]">{record.submitNote}</p>
                  </div>
                )}
              </div>

              {/* 审核信息区域 */}
              {record.status ? (
                <div className="mt-4 border-t-2 border-dashed border-[color:var(--ui-border)] pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    {record.status === 'approved' ? (
                      <>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ui-success-bg)]">
                          <Check size={14} className="text-[var(--ui-success-text)]" />
                        </div>
                        <span className="rounded-full bg-[var(--ui-surface-2)] px-2 py-0.5 text-xs font-bold text-[var(--ui-text-secondary)]">
                          审核通过
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ui-danger-bg)]">
                          <X size={14} className="text-[var(--ui-danger-text)]" />
                        </div>
                        <span className="rounded-full bg-[var(--ui-surface-2)] px-2 py-0.5 text-xs font-bold text-[var(--ui-text-secondary)]">
                          审核驳回
                        </span>
                      </>
                    )}
                    <span className="text-xs text-[var(--ui-text-soft)]">
                      {record.auditedAt && formatDate(record.auditedAt)}
                    </span>
                  </div>
                  {record.auditNote ? (
                    <div className={`rounded-xl border p-3 ${
                      record.status === "approved"
                        ? "border-[color:var(--ui-success-border)] bg-[var(--ui-success-bg)]"
                        : "border-[color:var(--ui-danger-border)] bg-[var(--ui-danger-bg)]"
                    }`}>
                      <p className={`mb-1 text-xs ${record.status === "approved" ? "text-[var(--ui-success-text)]" : "text-[var(--ui-danger-text)]"}`}>审核意见：</p>
                      <p className={`text-sm font-medium ${record.status === "approved" ? "text-[var(--ui-success-text)]" : "text-[var(--ui-danger-text)]"}`}>{record.auditNote}</p>
                    </div>
                  ) : (
                    <p className="text-xs italic text-[var(--ui-text-soft)]">未填写审核意见</p>
                  )}
                </div>
              ) : (
                <div className="mt-4 border-t-2 border-dashed border-[color:var(--ui-border)] pt-4">
                  <div className="flex items-center gap-2 text-[var(--ui-warning-text)]">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <span className="text-xs font-medium">等待审核中...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-[24px] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 border overflow-hidden min-w-0 cursor-pointer ${styles.className}`}
        onClick={() => setShowDetailModal(true)}
      >
        {/* <div className={`absolute left-0 top-0 h-full w-1.5 ${styles.accentClass}`} /> */}
        <div
          className="absolute right-0 top-0 z-10 group/status"
          title={styles.statusLabel}
        >
          <div
            className={`relative h-10 w-10 overflow-hidden shadow-sm ${styles.statusClass}`}
            style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
          >
            <span className="absolute right-[7px] top-2.5 text-white drop-shadow-sm">
              {styles.icon}
            </span>
          </div>
          <div
            className={`pointer-events-none absolute right-2 top-10 z-20 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-semibold opacity-0 shadow-lg transition-all duration-200 group-hover/status:opacity-100 group-hover/status:translate-y-0 translate-y-1 ${styles.tooltipClass}`}
          >
            {styles.statusLabel}
          </div>
        </div>

        {/* Header: Icon & Points */}
        <div className="p-4 sm:p-4 flex flex-col gap-3 pl-5">
          <div className="flex items-start gap-4">
            {/* 优化图标区域 - 添加渐变背景 */}
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform duration-300 relative flex-shrink-0`}>
              <span className="drop-shadow-md">{task.icon}</span>
              {/* 周期任务标识 */}
              {task.isRecurring && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--ui-surface-1)] rounded-full flex items-center justify-center shadow-[var(--ui-shadow-sm)] border border-[color:var(--ui-action-blue-border)]" title="周期任务">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="pr-12 font-bold text-[var(--ui-text-primary)] text-[15px] sm:text-base line-clamp-2 leading-snug group-hover:text-[var(--ui-focus)] transition-colors">
                    {task.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* 执行人标签 */}
                    <span className="inline-flex max-w-full items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-[var(--ui-warning-bg)] text-[var(--ui-warning-text)] border border-[color:var(--ui-warning-border)]">
                      <User size={10} />
                      <span className="truncate">{task.childName}</span>
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 rounded-2xl px-3 py-1.5 border border-[color:var(--ui-border)] text-right min-w-[68px] bg-[var(--ui-surface-1)] shadow-[var(--ui-shadow-sm)]">
                  <span className="block text-base sm:text-lg font-black text-[var(--ui-text-primary)] leading-none">
                    +{task.points}
                  </span>
                  <span className="block text-[9px] text-[var(--ui-text-muted)] font-medium uppercase tracking-wider mt-0.5">
                    积分
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body: Info */}
        <div className="px-4 pb-3 flex-1">
          <p className="text-xs sm:text-sm text-[var(--ui-text-muted)] line-clamp-2 mb-3 min-h-[2.5rem] leading-relaxed">
            {task.description || "暂无任务详情描述"}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--ui-border)]">
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              {/* 任务类型标签 */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-xl ${task.type === "daily"
                  ? "bg-[var(--ui-success-bg)] text-[var(--ui-success-text)] border border-[color:var(--ui-success-border)]"
                    : task.type === "advanced"
                    ? "bg-[var(--ui-action-blue-bg)] text-[var(--ui-action-blue-text)] border border-[color:var(--ui-action-blue-border)]"
                    : "bg-[var(--ui-warning-bg)] text-[var(--ui-warning-text)] border border-[color:var(--ui-warning-border)]"
                }`}>
                <Award size={10} />
                {task.type === "daily" ? "日常" : task.type === "advanced" ? "进阶" : "挑战"}
              </span>
              {parentFeedback && (
                <span className={`inline-flex max-w-full items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-xl border ${parentFeedback.className}`}>
                  <span className="font-bold shrink-0">{parentFeedback.label}</span>
                  <span className="truncate">{parentFeedback.text}</span>
                </span>
              )}
            </div>
            {/* 时间显示 */}
            {(task.startDate || task.deadline) && (
              <div
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium max-w-full ${isOverdue ? "text-[var(--ui-danger-text)] bg-[var(--ui-danger-bg)] px-2 py-1 rounded-xl border border-[color:var(--ui-danger-border)]" : "text-[var(--ui-text-soft)]"}`}
              >
                <Calendar size={12} className={isOverdue ? "text-rose-500" : ""} />
                <span className="truncate">
                  {task.startDate ? formatDate(task.startDate) : "即刻开始"} -{" "}
                  {task.deadline ? formatDate(task.deadline) : "无截止"}
                </span>
                {isOverdue && <span className="text-[9px] font-bold text-rose-600">逾期</span>}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Actions */}
        {task.status !== "approved" ? (
          <div className="px-4 py-2.5 bg-[var(--ui-surface-1)]/70 backdrop-blur-sm flex justify-between items-center gap-3 border-t border-[color:var(--ui-border)]">
            <div className="flex items-center gap-1 text-[10px] text-[var(--ui-text-soft)] min-w-0">
              <Clock size={10} />
              <span className="truncate">{formatDate(task.updatedAt)}</span>
            </div>
            <div className="flex gap-1">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                variant="secondary"
                className="!h-7 !min-h-7 !w-7 !px-0 !py-0 rounded-full shadow-none hover:shadow-[var(--ui-shadow-sm)]"
                style={{ width: 28, height: 28, minHeight: 28 }}
                title="编辑"
                aria-label="编辑任务"
              >
                <Edit2 size={14} />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task._id);
                }}
                variant="error"
                className="!h-7 !min-h-7 !w-7 !px-0 !py-0 rounded-full shadow-none hover:shadow-[var(--ui-shadow-sm)]"
                style={{ width: 28, height: 28, minHeight: 28 }}
                title="删除"
                aria-label="删除任务"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-[var(--ui-surface-1)]/70 backdrop-blur-sm flex justify-between items-center gap-3 border-t border-[color:var(--ui-border)]">
            <div className="flex items-center gap-1 text-[10px] text-[var(--ui-text-soft)] min-w-0">
              <Clock size={10} />
              <span className="truncate">{formatDate(task.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--ui-success-text)] font-medium bg-[var(--ui-success-bg)] px-2 py-1 rounded-xl border border-[color:var(--ui-success-border)]">
              <Check size={12} />
              <span>已完成</span>
            </div>
          </div>
        )}
      </div>

      {/* 任务详情弹窗 - 优化样式 */}
      <Modal
        title="任务详情"
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        width={640}
        noInternalScroll={true}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => setShowDetailModal(false)}
              variant="secondary"
              className="flex-1 py-3 font-semibold rounded-xl transition-colors"
            >
              关闭
            </Button>
            {task.status !== "approved" && (
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  onEdit(task);
                }}
                className="flex-1 py-3 rounded-xl font-semibold transition-all"
              >
                <Edit2 size={16} className="mr-2" />
                编辑任务
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* 任务基本信息 - 优化头部设计 */}
          <div className="relative overflow-hidden rounded-3xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] p-5 sm:p-6 shadow-[var(--ui-shadow-md)]">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles.gradient}`} />
            {/* 背景装饰 */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${styles.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />

            <div className="relative flex items-start gap-4 sm:gap-5">
              {/* 大图标 */}
              <div className={`w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center text-4xl shadow-lg flex-shrink-0`}>
                <span className="drop-shadow-md">{task.icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-[var(--ui-text-primary)] leading-snug">{task.name}</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border flex-shrink-0 ${styles.statusClass}`}>
                    {styles.icon}
                    {styles.statusLabel}
                  </span>
                </div>

                {/* 积分和执行人 */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 bg-[var(--ui-surface-1)] px-3 py-2 rounded-xl border border-[color:var(--ui-border)] shadow-[var(--ui-shadow-sm)]">
                    <Award size={14} className="text-[var(--ui-text-secondary)]" />
                    <span className="text-sm font-bold text-[var(--ui-text-primary)]">+{task.points} 积分</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[var(--ui-surface-1)] px-3 py-2 rounded-xl border border-[color:var(--ui-border)] shadow-[var(--ui-shadow-sm)] min-w-0">
                    <User size={14} className="text-[var(--ui-text-secondary)]" />
                    <span className="text-sm font-medium text-[var(--ui-text-primary)] truncate">{task.childAvatar} {task.childName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 滚动区域 */}
          <div className="space-y-5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1.5">
            {/* 任务描述 */}
            {task.description && (
              <div className="bg-[var(--ui-surface-1)] rounded-2xl p-4 sm:p-5 border border-[color:var(--ui-border)] shadow-[var(--ui-shadow-sm)]">
                <h4 className="font-semibold text-[var(--ui-text-primary)] mb-2 flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-[var(--ui-text-secondary)]" />
                  任务描述
                </h4>
                <p className="text-[var(--ui-text-secondary)] text-sm leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* 任务配图 */}
            {task.imageUrl ? (
              <div>
                <h4 className="font-semibold text-[var(--ui-text-primary)] mb-2 flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-[var(--ui-text-secondary)]" />
                  任务配图
                </h4>
                <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-[color:var(--ui-border)] shadow-[var(--ui-shadow-md)] bg-[var(--ui-surface-1)] group">
                  <ZoomImage
                    src={task.imageUrl}
                    alt="任务配图"
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    enableZoom={true}
                    containerClassName="w-full h-full"
                  />
                </div>
              </div>
            ) : null}

            {/* 起止时间 */}
            {(task.startDate || task.deadline) && (
              <div className="bg-[var(--ui-surface-1)] rounded-2xl p-4 sm:p-5 border border-[color:var(--ui-border)] shadow-[var(--ui-shadow-sm)]">
                <h4 className="font-semibold text-[var(--ui-text-primary)] mb-2 flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-[var(--ui-text-secondary)]" />
                  起止时间
                </h4>
                <div className={`flex items-center gap-3 ${isOverdue ? 'text-[var(--ui-danger-text)]' : 'text-[var(--ui-text-secondary)]'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${isOverdue ? 'bg-[var(--ui-danger-bg)] border-[color:var(--ui-danger-border)]' : 'bg-[var(--ui-surface-2)] border-[color:var(--ui-border)]'}`}>
                    <Calendar size={18} className={isOverdue ? 'text-[var(--ui-danger-text)]' : 'text-[var(--ui-text-secondary)]'} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {task.startDate ? formatDate(task.startDate) : "即刻开始"} -{" "}
                      {task.deadline ? formatDate(task.deadline) : "无截止"}
                    </div>
                    {isOverdue && (
                      <div className="text-xs font-semibold text-[var(--ui-danger-text)] mt-0.5 flex items-center gap-1">
                        <AlertCircle size={12} />
                        已逾期
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 操作记录 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-[var(--ui-text-secondary)] rounded-full" />
                <h4 className="font-semibold text-[var(--ui-text-primary)]">操作记录</h4>
                {task.auditHistory && task.auditHistory.length > 0 && (
                  <span className="text-xs text-[var(--ui-text-secondary)] bg-[var(--ui-surface-2)] px-2 py-0.5 rounded-full border border-[color:var(--ui-border)]">
                    {task.auditHistory.length} 条记录
                  </span>
                )}
              </div>
              {renderAuditHistory()}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
