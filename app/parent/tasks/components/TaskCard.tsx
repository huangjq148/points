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
        className: "bg-gradient-to-br from-emerald-50 to-white border-emerald-300/80 shadow-emerald-100/60",
        statusLabel: "已完成",
        statusClass: "bg-emerald-500 text-white border-emerald-400",
        dotClass: "bg-emerald-500",
        icon: <Check size={12} className="text-white" />,
        gradient: "from-emerald-600 to-emerald-500",
        tooltipClass: "bg-emerald-600 text-white",
        accentClass: "bg-emerald-500",
      };
    }
    if (task.status === "submitted") {
      return {
        className: "bg-gradient-to-br from-amber-50 to-white border-amber-300/80 shadow-amber-100/60",
        statusLabel: "待审核",
        statusClass: "bg-amber-500 text-white border-amber-400",
        dotClass: "bg-amber-500",
        icon: <AlertCircle size={12} className="text-white" />,
        gradient: "from-amber-600 to-orange-500",
        tooltipClass: "bg-amber-600 text-white",
        accentClass: "bg-amber-500",
      };
    }
    if (isNotStarted) {
      return {
        className: "bg-gradient-to-br from-sky-50 to-white border-sky-300/80 shadow-sky-100/60",
        statusLabel: "未开始",
        statusClass: "bg-sky-500 text-white border-sky-400",
        dotClass: "bg-sky-500",
        icon: <PauseCircle size={12} className="text-white" />,
        gradient: "from-sky-600 to-cyan-500",
        tooltipClass: "bg-sky-600 text-white",
        accentClass: "bg-sky-500",
      };
    }
    if (isOverdue) {
      return {
        className: "bg-gradient-to-br from-rose-50 to-white border-rose-300/80 shadow-rose-100/60",
        statusLabel: "已逾期",
        statusClass: "bg-rose-600 text-white border-rose-500",
        dotClass: "bg-rose-500",
        icon: <AlertCircle size={12} className="text-white" />,
        gradient: "from-rose-600 to-pink-500",
        tooltipClass: "bg-rose-700 text-white",
        accentClass: "bg-rose-500",
      };
    }
    if (task.status === "rejected") {
      return {
        className: "bg-gradient-to-br from-zinc-50 to-white border-zinc-300/80 shadow-zinc-100/60",
        statusLabel: "已驳回",
        statusClass: "bg-zinc-600 text-white border-zinc-500",
        dotClass: "bg-zinc-500",
        icon: <X size={12} className="text-white" />,
        gradient: "from-zinc-700 to-zinc-500",
        tooltipClass: "bg-zinc-700 text-white",
        accentClass: "bg-zinc-500",
      };
    }
    return {
      className: "bg-gradient-to-br from-indigo-50 to-white border-indigo-300/80 shadow-indigo-100/60",
      statusLabel: "进行中",
      statusClass: "bg-indigo-600 text-white border-indigo-500",
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
            ? "bg-slate-50 text-slate-700 border-slate-200"
            : "bg-slate-50 text-slate-700 border-slate-200",
      }
    : task.rejectionReason
      ? {
          label: "驳回原因",
          text: task.rejectionReason,
          className: "bg-slate-50 text-slate-700 border-slate-200",
        }
      : null;

  // 渲染操作记录 - 数据已按时间倒序排列（最新的在最前面）
  const renderAuditHistory = () => {
    if (!task.auditHistory || task.auditHistory.length === 0) {
      return (
        <div className="text-center py-8 text-slate-400">
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
          className={`relative pl-6 pb-4 ${index !== history.length - 1 ? 'border-l-2 border-slate-200 ml-2' : 'ml-2'}`}
          >
            {/* 时间线节点 */}
            <div className={`absolute left-0 top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
              record.status === 'approved'
                ? 'bg-green-500'
                : record.status === 'rejected'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`} style={{ transform: 'translateX(-50%)' }} />

            <div className="bg-white/95 border border-slate-100 rounded-2xl p-4 shadow-sm">
              {/* 提交信息区域 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      第 {index + 1} 次操作 · 提交
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(record.submittedAt)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <ImageIcon size={12} />
                    {record.photoUrl ? '有照片' : '无照片'}
                  </span>
                </div>

                {/* 孩子提交的凭证照片 */}
                {record.photoUrl ? (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2 font-medium">孩子提交的凭证照片：</p>
                    <div className="w-full max-w-[200px] h-40 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
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
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <ImageIcon size={12} />
                      此次提交未上传照片凭证
                    </p>
                  </div>
                )}

                {/* 孩子提交的备注 */}
                {record.submitNote && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-1">孩子留言：</p>
                    <p className="text-sm text-slate-700">{record.submitNote}</p>
                  </div>
                )}
              </div>

              {/* 审核信息区域 */}
              {record.status ? (
                <div className="border-t-2 border-dashed border-slate-200 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    {record.status === 'approved' ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={14} className="text-green-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          审核通过
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                          <X size={14} className="text-red-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          审核驳回
                        </span>
                      </>
                    )}
                    <span className="text-xs text-slate-400">
                      {record.auditedAt && formatDate(record.auditedAt)}
                    </span>
                  </div>
                  {record.auditNote ? (
                    <div className={`rounded-xl p-3 ${record.status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <p className={`text-xs mb-1 ${record.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}>审核意见：</p>
                      <p className={`text-sm font-medium ${record.status === 'approved' ? 'text-emerald-800' : 'text-rose-700'}`}>{record.auditNote}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">未填写审核意见</p>
                  )}
                </div>
              ) : (
                <div className="border-t-2 border-dashed border-slate-200 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-amber-600">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
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
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-blue-100" title="周期任务">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="pr-12 font-bold text-slate-900 text-[15px] sm:text-base line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {task.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* 执行人标签 */}
                    <span className="inline-flex max-w-full items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-700 border border-amber-100">
                      <User size={10} />
                      <span className="truncate">{task.childName}</span>
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 rounded-2xl px-3 py-1.5 border border-white/70 text-right min-w-[68px] bg-white/85 shadow-sm">
                  <span className="block text-base sm:text-lg font-black text-slate-900 leading-none">
                    +{task.points}
                  </span>
                  <span className="block text-[9px] text-slate-600 font-medium uppercase tracking-wider mt-0.5">
                    积分
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body: Info */}
        <div className="px-4 pb-3 flex-1">
          <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mb-3 min-h-[2.5rem] leading-relaxed">
            {task.description || "暂无任务详情描述"}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100/60">
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              {/* 任务类型标签 */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-xl ${
                task.type === "daily" 
                  ? "bg-green-50 text-green-700 border border-green-100" 
                  : task.type === "advanced" 
                  ? "bg-purple-50 text-purple-700 border border-purple-100"
                  : "bg-orange-50 text-orange-700 border border-orange-100"
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
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium max-w-full ${isOverdue ? "text-rose-700 bg-rose-50 px-2 py-1 rounded-xl border border-rose-100" : "text-slate-400"}`}
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
          <div className="px-4 py-2.5 bg-white/70 backdrop-blur-sm flex justify-between items-center gap-3 border-t border-slate-100/80">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 min-w-0">
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
                className="!h-7 !min-h-7 !w-7 !px-0 !py-0 rounded-full !border !border-blue-100 !bg-blue-50 !text-blue-600 hover:!bg-blue-100 hover:!text-blue-700 hover:!border-blue-200 shadow-none hover:shadow-sm"
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
                variant="secondary"
                className="!h-7 !min-h-7 !w-7 !px-0 !py-0 rounded-full !border !border-rose-100 !bg-rose-50 !text-rose-600 hover:!bg-rose-100 hover:!text-rose-700 hover:!border-rose-200 shadow-none hover:shadow-sm"
                style={{ width: 28, height: 28, minHeight: 28 }}
                title="删除"
                aria-label="删除任务"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-white/70 backdrop-blur-sm flex justify-between items-center gap-3 border-t border-slate-100/80">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 min-w-0">
              <Clock size={10} />
              <span className="truncate">{formatDate(task.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-100">
              <Check size={12} />
              <span>已完成</span>
            </div>
          </div>
        )}
      </div>

      {/* 任务详情弹窗 - 优化样式 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        width={640}
        noInternalScroll={true}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => setShowDetailModal(false)}
              variant="secondary"
              className="flex-1 py-3 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              关闭
            </Button>
            {task.status !== "approved" && (
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  onEdit(task);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all hover:shadow-xl"
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
          <div className={`relative overflow-hidden rounded-3xl border ${styles.className} p-5 sm:p-6`}>
            {/* 背景装饰 */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${styles.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />
            
            <div className="relative flex items-start gap-4 sm:gap-5">
              {/* 大图标 */}
              <div className={`w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center text-4xl shadow-lg flex-shrink-0`}>
                <span className="drop-shadow-md">{task.icon}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-slate-800 leading-snug">{task.name}</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border flex-shrink-0 ${styles.statusClass}`}>
                    {styles.icon}
                    {styles.statusLabel}
                  </span>
                </div>
                
                {/* 积分和执行人 */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <Award size={14} className="text-slate-600" />
                    <span className="text-sm font-bold text-slate-700">+{task.points} 积分</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 min-w-0">
                    <User size={14} className="text-slate-600" />
                    <span className="text-sm font-medium text-slate-700 truncate">{task.childAvatar} {task.childName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 滚动区域 */}
          <div className="space-y-5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1.5">
            {/* 任务描述 */}
            {task.description && (
                <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-slate-500 rounded-full" />
                  任务描述
                </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* 任务配图 */}
            {task.imageUrl ? (
              <div>
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-slate-500 rounded-full" />
                  任务配图
                </h4>
                  <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-slate-200 shadow-md group">
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
                <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-slate-500 rounded-full" />
                  起止时间
                </h4>
                <div className={`flex items-center gap-3 ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-rose-100' : 'bg-slate-100'}`}>
                    <Calendar size={18} className={isOverdue ? 'text-rose-600' : 'text-slate-600'} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {task.startDate ? formatDate(task.startDate) : "即刻开始"} -{" "}
                      {task.deadline ? formatDate(task.deadline) : "无截止"}
                    </div>
                    {isOverdue && (
                      <div className="text-xs font-semibold text-rose-600 mt-0.5 flex items-center gap-1">
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
                <span className="w-1 h-4 bg-slate-500 rounded-full" />
                  <h4 className="font-semibold text-slate-700">操作记录</h4>
                {task.auditHistory && task.auditHistory.length > 0 && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
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
