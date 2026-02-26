import { PlainTask, AuditRecord } from "@/app/typings";
import { Clock, Edit2, Trash2, Eye, X, Check, Image as ImageIcon, History } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { formatDate } from "@/utils/date";
import { useState } from "react";
import Image from "next/image";

export interface IDisplayedTask extends PlainTask {
  childName: string;
  childAvatar?: string;
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

  // 根据状态获取样式
  const getStatusStyles = () => {
    if (task.status === "approved") {
      return {
        className: "bg-emerald-50/50 border-emerald-100",
        statusLabel: "已完成",
        statusClass: "bg-emerald-100 text-emerald-700",
        dotClass: "bg-emerald-500",
      };
    }
    if (task.status === "submitted") {
      return {
        className: "bg-amber-50/50 border-amber-100",
        statusLabel: "待审核",
        statusClass: "bg-amber-100 text-amber-700",
        dotClass: "bg-amber-500",
      };
    }
    if (isOverdue) {
      return {
        className: "bg-rose-50/50 border-rose-100",
        statusLabel: "已逾期",
        statusClass: "bg-rose-100 text-rose-700",
        dotClass: "bg-rose-500",
      };
    }
    if (task.status === "rejected") {
      return {
        className: "bg-gray-50/50 border-gray-100",
        statusLabel: "已驳回",
        statusClass: "bg-gray-100 text-gray-700",
        dotClass: "bg-gray-500",
      };
    }
    return {
      className: "bg-white border-gray-100",
      statusLabel: "进行中",
      statusClass: "bg-blue-100 text-blue-700",
      dotClass: "bg-blue-500",
    };
  };

  const styles = getStatusStyles();

  // 渲染操作记录 - 数据已按时间倒序排列（最新的在最前面）
  const renderAuditHistory = () => {
    if (!task.auditHistory || task.auditHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <History size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无操作记录</p>
        </div>
      );
    }

    const history = task.auditHistory;
    const totalCount = history.length;

    return (
      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {history.map((record: AuditRecord, index: number) => (
          <div
            key={record._id || index}
            className={`relative pl-6 pb-4 ${index !== history.length - 1 ? 'border-l-2 border-gray-200 ml-2' : 'ml-2'}`}
          >
            {/* 时间线节点 */}
            <div className={`absolute left-0 top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
              record.status === 'approved'
                ? 'bg-green-500'
                : record.status === 'rejected'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`} style={{ transform: 'translateX(-50%)' }} />

            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              {/* 提交信息区域 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      第 {totalCount - index} 次操作 · 提交
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(record.submittedAt)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <ImageIcon size={12} />
                    {record.photoUrl ? '有照片' : '无照片'}
                  </span>
                </div>

                {/* 孩子提交的凭证照片 */}
                {record.photoUrl ? (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">孩子提交的凭证照片：</p>
                    <div className="relative w-full max-w-[200px] h-40 rounded-xl overflow-hidden border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={record.photoUrl}
                        alt={`第 ${totalCount - index} 次提交的照片凭证`}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                        onClick={() => window.open(record.photoUrl, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium bg-black/50 px-2 py-1 rounded-full transition-opacity">
                          点击查看大图
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <ImageIcon size={12} />
                      此次提交未上传照片凭证
                    </p>
                  </div>
                )}

                {/* 孩子提交的备注 */}
                {record.submitNote && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium mb-1">孩子留言：</p>
                    <p className="text-sm text-gray-700">{record.submitNote}</p>
                  </div>
                )}
              </div>

              {/* 审核信息区域 */}
              {record.status ? (
                <div className="border-t-2 border-dashed border-gray-200 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    {record.status === 'approved' ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={14} className="text-green-600" />
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          审核通过
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                          <X size={14} className="text-red-600" />
                        </div>
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          审核驳回
                        </span>
                      </>
                    )}
                    <span className="text-xs text-gray-400">
                      {record.auditedAt && formatDate(record.auditedAt)}
                    </span>
                  </div>
                  {record.auditNote ? (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">审核意见：</p>
                      <p className="text-sm text-gray-700">{record.auditNote}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">未填写审核意见</p>
                  )}
                </div>
              ) : (
                <div className="border-t-2 border-dashed border-gray-200 pt-4 mt-4">
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
        className={`group relative flex flex-col rounded-3xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${styles.className} overflow-hidden min-w-0 cursor-pointer`}
        onClick={() => setShowDetailModal(true)}
      >
      {/* Header: Icon & Points */}
      <div className="p-5 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm border border-gray-50 group-hover:scale-110 transition-transform duration-500">
            {task.icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{task.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.statusClass} border border-current/10`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${styles.dotClass} animate-pulse`} />
                {styles.statusLabel}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {task.childName}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black text-blue-600">+{task.points}</span>
          <span className="text-[10px] text-gray-400 font-medium">积分</span>
        </div>
      </div>

      {/* Body: Info */}
      <div className="px-5 pb-4 flex-1">
        <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[2.5rem]">
          {task.description || "暂无任务详情描述"}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {task.type === "daily" ? "日常" : task.type === "advanced" ? "进阶" : "挑战"}
            </span>
          </div>
          {task.deadline && (
            <div
              className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? "text-red-500" : "text-gray-400"}`}
            >
              <Clock size={12} />
              <span>{formatDate(task.deadline)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Actions */}
      {task.status !== "approved" ? (
        <div className="px-5 py-3 bg-white/50 flex justify-between items-center border-t border-gray-100/50">
          <div className="text-[10px] text-gray-400">{formatDate(task.updatedAt)}</div>
          <div className="flex gap-1">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              variant="secondary"
              className="p-2 h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent shadow-none"
              title="编辑"
            >
              <Edit2 size={14} />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task._id);
              }}
              variant="secondary"
              className="p-2 h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent shadow-none"
              title="删除"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3 bg-white/50 flex justify-between items-center border-t border-gray-100/50">
          <div className="text-[10px] text-gray-400">{formatDate(task.updatedAt)}</div>
          <div className="flex items-center gap-1 text-[10px] text-blue-500">
            <Eye size={12} />
            <span>查看详情</span>
          </div>
        </div>
      )}
      </div>

      {/* 任务详情弹窗 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="任务详情"
        width={600}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => setShowDetailModal(false)}
              variant="secondary"
              className="flex-1 py-3 font-semibold"
            >
              关闭
            </Button>
            {task.status !== "approved" && (
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  onEdit(task);
                }}
                className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-blue-100"
              >
                编辑任务
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6 py-2">
          {/* 任务基本信息 */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="text-5xl">{task.icon}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">{task.name}</h3>
              <p className="text-blue-600 font-bold">+{task.points} 积分</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">执行人:</span>
                <span className="flex items-center gap-1 text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  {task.childAvatar} {task.childName}
                </span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${styles.statusClass}`}>
              {styles.statusLabel}
            </div>
          </div>

          {/* 任务描述 */}
          {task.description && (
            <div>
              <h4 className="font-bold text-gray-700 mb-2">任务描述</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-xl">{task.description}</p>
            </div>
          )}

          {/* 任务配图 */}
          {task.imageUrl ? (
            <div>
              <h4 className="font-bold text-gray-700 mb-2">任务配图</h4>
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200">
                <Image src={task.imageUrl} alt="任务配图" fill className="object-cover" />
              </div>
            </div>
          ) : null}

          {/* 截止时间 */}
          {task.deadline && (
            <div>
              <h4 className="font-bold text-gray-700 mb-2">截止时间</h4>
              <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                <Clock size={16} />
                <span>{formatDate(task.deadline)}</span>
                {isOverdue && <span className="text-xs font-bold bg-red-100 px-2 py-0.5 rounded-full">已逾期</span>}
              </div>
            </div>
          )}

          {/* 操作记录 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-blue-500" />
              <h4 className="font-bold text-gray-700">操作记录</h4>
              {task.auditHistory && task.auditHistory.length > 0 && (
                <span className="text-xs text-gray-400">({task.auditHistory.length} 条记录)</span>
              )}
            </div>
            {renderAuditHistory()}
          </div>
        </div>
      </Modal>
    </>
  );
}
