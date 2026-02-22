"use client";

import { IDisplayedTask } from "@/app/typings";
import Layout from "@/components/Layouts";
import { Button, Input, Modal, Pagination } from "@/components/ui";
import Select, { SelectOption } from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import { formatDate } from "@/utils/date";
import request from "@/utils/request";
import { Check, Image as ImageIcon, X, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export default function AuditPage() {
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>("all");
  const { currentUser, childList } = useApp();
  const [tasks, setTasks] = useState<IDisplayedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<IDisplayedTask | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const childOptions: SelectOption[] = [
    { value: "all", label: "全部孩子" },
    ...childList.map((child) => ({
      value: child.id.toString(),
      label: child.username,
    })),
  ];

  const pendingTasks = tasks;

  const fetchTasks = useCallback(
    async (pageNum: number = 1) => {
      if (!currentUser?.token) return { tasks: [], total: 0 };

      const params: Record<string, string | number> = {
        status: "submitted",
        page: pageNum,
        limit,
      };

      if (selectedChildFilter !== "all") {
        params.childId = selectedChildFilter;
      }

      const data = (await request("/api/tasks", {
        params,
      })) as { success: boolean; tasks: IDisplayedTask[]; total: number };

      if (data.success) {
        return { tasks: data.tasks, total: data.total };
      }
      return { tasks: [], total: 0 };
    },
    [currentUser?.token, selectedChildFilter, limit],
  );

  useEffect(() => {
    let isMounted = true;
    fetchTasks(page).then((result) => {
      if (isMounted && result) {
        setTasks(result.tasks);
        setTotal(result.total);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fetchTasks, page]);

  // Handle filter changes
  const onFilterChange = (value: string) => {
    setSelectedChildFilter(value);
    setPage(1);
  };

  const handleApproveTask = async (taskId: string, status: "approved" | "rejected", rejectionReason?: string) => {
    if (!currentUser?.token) return;
    await request("/api/tasks", {
      method: "PUT",
      body: { taskId, status, rejectionReason },
    });
    const result = await fetchTasks(page);
    if (result) {
      setTasks(result.tasks);
      setTotal(result.total);
    }
    setSelectedTask(null);
    setRejectionReason("");
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">任务审核</h2>
        <div className="w-40">
            <Select
              value={selectedChildFilter}
              onChange={(value) => {
                if (value) {
                  onFilterChange(value.toString());
                }
              }}
              options={childOptions}
              placeholder="选择孩子"
            />
          </div>
      </div>
      {pendingTasks.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Check size={48} className="mx-auto mb-2 opacity-50" />
          <p>暂无待审核任务</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTasks.map((task, index) => (
            <SwipeableAuditCard
              key={task._id.toString()}
              task={task}
              onApprove={() => handleApproveTask(task._id, "approved")}
              onReject={() => handleApproveTask(task._id, "rejected")}
              onClick={() => setSelectedTask(task)}
              index={index}
            />
          ))}
        </div>
      )}
      {total > limit && (
        <div className="mt-4 flex justify-end">
          <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
        </div>
      )}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => {
          setSelectedTask(null);
          setRejectionReason("");
        }}
        title="任务审核详情"
        footer={
          selectedTask && (
            <>
              <Button
                onClick={() => handleApproveTask(selectedTask._id, "rejected", rejectionReason)}
                variant="secondary"
                className="bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none"
              >
                驳回
              </Button>
              <Button
                onClick={() => handleApproveTask(selectedTask._id, "approved", rejectionReason)}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                通过
              </Button>
            </>
          )
        }
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="text-5xl">{selectedTask.icon}</div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedTask.name}</h3>
                <p className="text-blue-600 font-bold">+{selectedTask.points} 积分</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">申请人:</span>
                  <span className="flex items-center gap-1 text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    {selectedTask.childAvatar} {selectedTask.childName}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-700 mb-2">提交时间</h4>
              <p className="text-gray-600">{formatDate(selectedTask.submittedAt)}</p>
            </div>

            {selectedTask.description && (
              <div>
                <h4 className="font-bold text-gray-700 mb-2">任务描述</h4>
                <p className="text-gray-600">{selectedTask.description}</p>
              </div>
            )}

            {selectedTask.photoUrl ? (
              <div>
                <h4 className="font-bold text-gray-700 mb-2">照片凭证</h4>
                <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <Image
                    src={selectedTask.photoUrl}
                    alt="任务照片"
                    width={800}
                    height={600}
                    className="w-full h-auto object-contain max-h-[60vh]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500 text-sm">无照片凭证</div>
            )}

            <div>
              <h4 className="font-bold text-gray-700 mb-2">审核意见</h4>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="请输入审核通过或驳回的原因（选填）"
                className="w-full"
              />
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}

// 可滑动审核卡片组件
interface SwipeableAuditCardProps {
  task: IDisplayedTask;
  onApprove: () => void;
  onReject: () => void;
  onClick: () => void;
  index: number;
}

function SwipeableAuditCard({ task, onApprove, onReject, onClick, index }: SwipeableAuditCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const THRESHOLD = 100;

  const handleDrag = (event: unknown, info: PanInfo) => {
    setDragX(info.offset.x);
  };

  const handleDragEnd = (event: unknown, info: PanInfo) => {
    setIsDragging(false);
    setDragX(0);
    
    if (info.offset.x > THRESHOLD) {
      onApprove();
    } else if (info.offset.x < -THRESHOLD) {
      onReject();
    }
  };

  const handleClick = () => {
    if (!isDragging && Math.abs(dragX) < 10) {
      onClick();
    }
  };

  // 计算背景颜色
  const getBackgroundColor = () => {
    if (dragX > THRESHOLD * 0.5) return 'rgba(34, 197, 94, 0.1)';
    if (dragX < -THRESHOLD * 0.5) return 'rgba(239, 68, 68, 0.1)';
    return 'white';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* 背景层 - 滑动时显示 */}
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div 
          className={`flex items-center gap-2 transition-opacity duration-200 ${
            dragX < -THRESHOLD * 0.3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <X className="text-white" size={24} />
          </div>
          <span className="text-red-600 font-bold">驳回</span>
        </div>
        <div 
          className={`flex items-center gap-2 transition-opacity duration-200 ${
            dragX > THRESHOLD * 0.3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-green-600 font-bold">通过</span>
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="text-white" size={24} />
          </div>
        </div>
      </div>

      {/* 卡片主体 - 可拖动 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDrag={handleDrag}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{ 
          x: dragX,
          backgroundColor: getBackgroundColor()
        }}
        className="relative bg-white border border-gray-100 shadow-sm cursor-grab active:cursor-grabbing p-4 flex items-center gap-4"
        onClick={handleClick}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="text-4xl">{task.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-gray-800">{task.name}</span>
            <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              {task.childAvatar} {task.childName}
            </span>
          </div>
          {task.photoUrl && (
            <div className="flex items-center gap-1 text-xs text-blue-500">
              <ImageIcon size={14} />
              <span>包含照片凭证</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-gray-400">{formatDate(task.submittedAt)}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Zap size={12} />
            <span>滑动审核</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
