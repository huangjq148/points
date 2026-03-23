"use client";

import { IDisplayedTask } from "./TaskCard";
import { Clock, Edit2, Trash2, Eye, Image as ImageIcon, History, Check, X, AlertCircle, PlayCircle, PauseCircle, User, Award, Calendar } from "lucide-react";
import { Button, Modal, Image as ZoomImage, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { formatDate } from "@/utils/date";
import { useState } from "react";
import { AuditRecord } from "@/app/typings";

interface TaskTableProps {
  tasks: IDisplayedTask[];
  now: number;
  onEdit: (task: IDisplayedTask) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskTable({ tasks, now, onEdit, onDelete }: TaskTableProps) {
  const [selectedTask, setSelectedTask] = useState<IDisplayedTask | null>(null);

  const getStatusInfo = (task: IDisplayedTask) => {
    const isOverdue = task.deadline && now > 0 && new Date(task.deadline).getTime() < now && task.status === "pending";
    const isNotStarted = task.startDate && now > 0 && new Date(task.startDate).getTime() > now && task.status === "pending";
    
    if (task.status === "approved") {
      return {
        label: "已完成",
        className: "bg-slate-50 text-slate-700 border-slate-200",
        dotClass: "bg-emerald-500",
        icon: <Check size={10} className="text-emerald-600" />,
        gradient: "from-slate-700 to-slate-500",
      };
    }
    if (task.status === "submitted") {
      return {
        label: "待审核",
        className: "bg-slate-50 text-slate-700 border-slate-200",
        dotClass: "bg-amber-500",
        icon: <AlertCircle size={10} className="text-amber-600" />,
        gradient: "from-slate-600 to-slate-500",
      };
    }
    if (isNotStarted) {
      return {
        label: "未开始",
        className: "bg-slate-50 text-slate-700 border-slate-200",
        dotClass: "bg-slate-500",
        icon: <PauseCircle size={10} className="text-slate-600" />,
        gradient: "from-slate-500 to-slate-600",
      };
    }
    if (isOverdue) {
      return {
        label: "已逾期",
        className: "bg-slate-50 text-slate-700 border-slate-200",
        dotClass: "bg-rose-500",
        icon: <AlertCircle size={10} className="text-rose-600" />,
        gradient: "from-rose-600 to-slate-600",
      };
    }
    if (task.status === "rejected") {
      return {
        label: "已驳回",
        className: "bg-slate-50 text-slate-700 border-slate-200",
        dotClass: "bg-slate-500",
        icon: <X size={10} className="text-slate-600" />,
        gradient: "from-slate-600 to-slate-500",
      };
    }
    return {
      label: "进行中",
      className: "bg-slate-50 text-slate-700 border-slate-200",
      dotClass: "bg-slate-500",
      icon: <PlayCircle size={10} className="text-slate-600" />,
      gradient: "from-slate-700 to-slate-500",
    };
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "daily":
        return "日常";
      case "advanced":
        return "进阶";
      case "challenge":
        return "挑战";
      default:
        return type;
    }
  };

  const getParentFeedback = (task: IDisplayedTask) => {
    const latestAudit = task.auditHistory?.[0];
    if (latestAudit?.auditNote) {
      return {
        label: latestAudit.status === "approved" ? "家长反馈" : "驳回原因",
        text: latestAudit.auditNote,
        className:
          latestAudit.status === "approved"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-rose-50 text-rose-700 border-rose-100",
      };
    }

    if (task.rejectionReason) {
      return {
        label: "驳回原因",
        text: task.rejectionReason,
        className: "bg-rose-50 text-rose-700 border-rose-100",
      };
    }

    return null;
  };

  // 渲染操作记录
  const renderAuditHistory = (task: IDisplayedTask) => {
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
                : 'bg-slate-500'
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
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          审核通过
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
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
                    <div className="rounded-xl p-3 bg-slate-50">
                      <p className="text-xs mb-1 text-slate-600">审核意见：</p>
                      <p className="text-sm font-medium text-slate-700">{record.auditNote}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">未填写审核意见</p>
                  )}
                </div>
              ) : (
                <div className="border-t-2 border-dashed border-slate-200 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-amber-600">
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
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

  const columns: DataTableColumn<IDisplayedTask>[] = [
    {
      key: "name",
      title: "任务",
      render: (_, task) => {
        const statusInfo = getStatusInfo(task);
        const parentFeedback = getParentFeedback(task);
        return (
          <div className="flex items-center gap-3">
            {/* 优化图标显示 */}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${statusInfo.gradient} flex items-center justify-center text-xl shadow-sm flex-shrink-0 relative`}>
              <span className="drop-shadow-sm">{task.icon}</span>
              {task.isRecurring && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200" title="周期任务">
                  <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 text-sm truncate max-w-[180px]">{task.name}</p>
                {task.isRecurring && (
                  <span className="text-[9px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-medium flex-shrink-0">
                    周期
                  </span>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">
                  {task.description}
                </p>
              )}
              {parentFeedback && (
                <div className={`mt-1 inline-flex max-w-[220px] items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${parentFeedback.className}`}>
                  <span className="font-bold shrink-0">{parentFeedback.label}</span>
                  <span className="truncate">{parentFeedback.text}</span>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "childName",
      title: "执行人",
      render: (_, row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
          <User size={10} />
          {row.childAvatar} {row.childName}
        </span>
      ),
    },
    {
      key: "status",
      title: "状态",
      render: (_, row) => {
        const statusInfo = getStatusInfo(row);
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm ${statusInfo.className}`}>
            {statusInfo.icon}
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      key: "points",
      title: "积分",
      render: (_, row) => (
        <div className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
          <Award size={12} className="text-slate-600" />
          <span className="text-sm font-bold text-slate-700">+{row.points}</span>
        </div>
      ),
    },
    {
      key: "type",
      title: "类型",
      render: (_, row) => {
        const typeStyles = {
          daily: "bg-slate-50 text-slate-700 border-slate-200",
          advanced: "bg-stone-50 text-stone-700 border-stone-200",
          challenge: "bg-neutral-50 text-neutral-700 border-neutral-200",
        };
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-xl border ${typeStyles[row.type as keyof typeof typeStyles] || typeStyles.daily}`}>
            <Award size={10} />
            {getTypeLabel(row.type)}
          </span>
        );
      },
    },
    {
      key: "deadline",
      title: "起止时间",
      render: (_, row) => {
        const task = row;
        const isOverdue = task.deadline && now > 0 && new Date(task.deadline).getTime() < now && task.status === "pending";
        return task.startDate || task.deadline ? (
          <div className={`inline-flex items-center gap-1.5 text-xs ${isOverdue ? "text-rose-600 font-medium bg-rose-50 px-2 py-1 rounded-xl border border-rose-100" : "text-slate-500"}`}>
            <Calendar size={12} className={isOverdue ? "text-rose-500" : ""} />
            <span>
              {task.startDate ? formatDate(task.startDate) : "即刻开始"} - {task.deadline ? formatDate(task.deadline) : "无截止"}
            </span>
            {isOverdue && <span className="text-[9px] font-bold">逾期</span>}
          </div>
        ) : (
            <span className="text-xs text-slate-400">-</span>
        );
      },
    },
    {
      key: "updatedAt",
      title: "更新时间",
      render: (_, row) => (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={10} />
            <span>{formatDate(row.updatedAt)}</span>
          </div>
      ),
    },
  ];

  const actionColumn: DataTableColumn<IDisplayedTask> = {
    key: "actions",
    title: "操作",
    render: (_, row) => {
      const task = row;
      return (
        <div className="flex items-center justify-center gap-0.5">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTask(task);
            }}
            variant="secondary"
            className="p-1.5 h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all border-none bg-transparent shadow-none hover:shadow-sm"
            title="查看详情"
          >
            <Eye size={15} />
          </Button>
          {task.status !== "approved" && (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                variant="secondary"
                className="p-1.5 h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all border-none bg-transparent shadow-none hover:shadow-sm"
                title="编辑任务"
              >
                <Edit2 size={15} />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task._id);
                }}
                variant="secondary"
                className="p-1.5 h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border-none bg-transparent shadow-none hover:shadow-sm"
                title="删除任务"
              >
                <Trash2 size={15} />
              </Button>
            </>
          )}
          {task.status === "approved" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-100 ml-1">
              <Check size={12} />
              已完成
            </span>
          )}
        </div>
      );
    },
  };

  return (
    <>
      <div className="w-full min-w-0 overflow-x-hidden">
        <DataTable
          columns={columns}
          dataSource={tasks}
          actionColumn={actionColumn}
          fixedColumns={{ left: ["name"], right: ["actions"] }}
          emptyText="暂无任务"
          minWidth={980}
          actionColumnWidth={120}
          onRowClick={(task) => setSelectedTask(task)}
        />
      </div>

      {/* 任务详情弹窗 - 优化样式 */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          width={640}
          noInternalScroll={true}
          footer={
            <div className="flex gap-3 w-full">
              <Button
                onClick={() => setSelectedTask(null)}
                variant="secondary"
                className="flex-1 py-3 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                关闭
              </Button>
              {selectedTask.status !== "approved" && (
                <Button
                  onClick={() => {
                    setSelectedTask(null);
                    onEdit(selectedTask);
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  <Edit2 size={16} className="mr-2" />
                  编辑任务
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-5">
            {/* 任务基本信息 - 优化头部设计 */}
            {(() => {
              const statusInfo = getStatusInfo(selectedTask);
              return (
                <div className={`relative overflow-hidden rounded-3xl border ${statusInfo.className} p-5`}>
                  <div className="relative flex items-center gap-4">
                    {/* 大图标 */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${statusInfo.gradient} flex items-center justify-center text-4xl shadow-sm flex-shrink-0`}>
                      <span className="drop-shadow-md">{selectedTask.icon}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-bold text-slate-800 truncate">{selectedTask.name}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border flex-shrink-0 ${statusInfo.className}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      {/* 积分和执行人 */}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <Award size={14} className="text-slate-600" />
                          <span className="text-sm font-bold text-slate-700">+{selectedTask.points} 积分</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <User size={14} className="text-slate-600" />
                          <span className="text-sm font-medium text-slate-700">{selectedTask.childAvatar} {selectedTask.childName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 滚动区域 */}
            <div className="space-y-5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
              {/* 任务描述 */}
              {selectedTask.description && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-slate-500 rounded-full" />
                    任务描述
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              {/* 任务配图 */}
              {selectedTask.imageUrl ? (
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-slate-500 rounded-full" />
                    任务配图
                  </h4>
                  <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-slate-200 shadow-md group">
                    <ZoomImage
                      src={selectedTask.imageUrl}
                      alt="任务配图"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      enableZoom={true}
                      containerClassName="w-full h-full"
                    />
                  </div>
                </div>
              ) : null}

              {/* 起止时间 */}
              {(selectedTask.startDate || selectedTask.deadline) && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-slate-500 rounded-full" />
                    起止时间
                  </h4>
                  {(() => {
                    const isOverdue = selectedTask.deadline && now > 0 && new Date(selectedTask.deadline).getTime() < now && selectedTask.status === "pending";
                    return (
                      <div className={`flex items-center gap-3 ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-rose-100' : 'bg-slate-100'}`}>
                          <Calendar size={18} className={isOverdue ? 'text-rose-600' : 'text-slate-600'} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {selectedTask.startDate ? formatDate(selectedTask.startDate) : "即刻开始"} -{" "}
                            {selectedTask.deadline ? formatDate(selectedTask.deadline) : "无截止"}
                          </div>
                          {isOverdue && (
                            <div className="text-xs font-semibold text-rose-600 mt-0.5 flex items-center gap-1">
                              <AlertCircle size={12} />
                              已逾期
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 操作记录 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 bg-slate-500 rounded-full" />
                  <h4 className="font-semibold text-slate-700">操作记录</h4>
                  {selectedTask.auditHistory && selectedTask.auditHistory.length > 0 && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {selectedTask.auditHistory.length} 条记录
                    </span>
                  )}
                </div>
                {renderAuditHistory(selectedTask)}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
