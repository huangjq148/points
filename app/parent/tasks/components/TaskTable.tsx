"use client";

import { IDisplayedTask } from "./TaskCard";
import { Clock, Edit2, Trash2, Eye, Image as ImageIcon, History } from "lucide-react";
import { Button, Modal, Image as ZoomImage } from "@/components/ui";
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
    
    if (task.status === "approved") {
      return {
        label: "已完成",
        className: "bg-emerald-100 text-emerald-700",
        dotClass: "bg-emerald-500",
      };
    }
    if (task.status === "submitted") {
      return {
        label: "待审核",
        className: "bg-amber-100 text-amber-700",
        dotClass: "bg-amber-500",
      };
    }
    if (isOverdue) {
      return {
        label: "已逾期",
        className: "bg-rose-100 text-rose-700",
        dotClass: "bg-rose-500",
      };
    }
    if (task.status === "rejected") {
      return {
        label: "已驳回",
        className: "bg-gray-100 text-gray-700",
        dotClass: "bg-gray-500",
      };
    }
    return {
      label: "进行中",
      className: "bg-blue-100 text-blue-700",
      dotClass: "bg-blue-500",
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

  // 渲染操作记录
  const renderAuditHistory = (task: IDisplayedTask) => {
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
      <div className="space-y-4">
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
                    <div className="w-full max-w-[200px] h-40 rounded-xl overflow-hidden border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                      <ZoomImage
                        src={record.photoUrl}
                        alt={`第 ${totalCount - index} 次提交的照片凭证`}
                        className="object-cover w-full h-full"
                        enableZoom={true}
                        zoomHint="点击查看大图"
                        containerClassName="w-full h-full"
                      />
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
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          审核通过
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
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
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">任务</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">执行人</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">积分</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">截止时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">更新时间</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => {
                const statusInfo = getStatusInfo(task);
                const isOverdue = task.deadline && now > 0 && new Date(task.deadline).getTime() < now && task.status === "pending";
                
                return (
                  <tr 
                    key={task._id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{task.icon}</span>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{task.name}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {task.childAvatar} {task.childName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-blue-600">+{task.points}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{getTypeLabel(task.type)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {task.deadline ? (
                        <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          <Clock size={12} />
                          <span>{formatDate(task.deadline)}</span>
                          {isOverdue && <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded">逾期</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{formatDate(task.updatedAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          variant="secondary"
                          className="p-1.5 h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent shadow-none"
                          title="查看"
                        >
                          <Eye size={14} />
                        </Button>
                        {task.status !== "approved" && (
                          <>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(task);
                              }}
                              variant="secondary"
                              className="p-1.5 h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent shadow-none"
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
                              className="p-1.5 h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent shadow-none"
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>暂无任务</p>
          </div>
        )}
      </div>

      {/* 任务详情弹窗 */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          width={600}
          noInternalScroll={true}
          footer={
            <div className="flex gap-3 w-full">
              <Button
                onClick={() => setSelectedTask(null)}
                variant="secondary"
                className="flex-1 py-3 font-semibold"
              >
                关闭
              </Button>
              {selectedTask.status !== "approved" && (
                <Button
                  onClick={() => {
                    setSelectedTask(null);
                    onEdit(selectedTask);
                  }}
                  className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-blue-100"
                >
                  编辑任务
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-6">
            {/* 任务基本信息 */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="text-5xl">{selectedTask.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-800 truncate">{selectedTask.name}</h3>
                <p className="text-blue-600 font-bold">+{selectedTask.points} 积分</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">执行人:</span>
                  <span className="flex items-center gap-1 text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    {selectedTask.childAvatar} {selectedTask.childName}
                  </span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusInfo(selectedTask).className} flex-shrink-0`}>
                {getStatusInfo(selectedTask).label}
              </div>
            </div>

            {/* 滚动区域 */}
            <div className="space-y-6 max-h-[40vh] overflow-y-auto hide-scrollbar pr-1">
              {/* 任务描述 */}
              {selectedTask.description && (
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">任务描述</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-xl">{selectedTask.description}</p>
                </div>
              )}

              {/* 任务配图 */}
              {selectedTask.imageUrl ? (
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">任务配图</h4>
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200">
                    <ZoomImage
                      src={selectedTask.imageUrl}
                      alt="任务配图"
                      className="object-cover w-full h-full"
                      enableZoom={true}
                      containerClassName="w-full h-full"
                    />
                  </div>
                </div>
              ) : null}

              {/* 截止时间 */}
              {selectedTask.deadline && (
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">截止时间</h4>
                  <div className={`flex items-center gap-2 ${
                    selectedTask.deadline && now > 0 && new Date(selectedTask.deadline).getTime() < now && selectedTask.status === "pending"
                      ? 'text-red-500' : 'text-gray-600'
                  }`}>
                    <Clock size={16} />
                    <span>{formatDate(selectedTask.deadline)}</span>
                    {selectedTask.deadline && now > 0 && new Date(selectedTask.deadline).getTime() < now && selectedTask.status === "pending" && (
                      <span className="text-xs font-bold bg-red-100 px-2 py-0.5 rounded-full">已逾期</span>
                    )}
                  </div>
                </div>
              )}

              {/* 操作记录 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History size={18} className="text-blue-500" />
                  <h4 className="font-bold text-gray-700">操作记录</h4>
                  {selectedTask.auditHistory && selectedTask.auditHistory.length > 0 && (
                    <span className="text-xs text-gray-400">({selectedTask.auditHistory.length} 条记录)</span>
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
