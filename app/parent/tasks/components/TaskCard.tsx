import { PlainTask } from "../page";
import { Clock, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDate } from "@/utils/date";

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

  return (
    <div
      className={`group relative flex flex-col rounded-3xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${styles.className} overflow-hidden min-w-0`}
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
              onClick={() => onEdit(task)}
              variant="secondary"
              className="p-2 h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent shadow-none"
              title="编辑"
            >
              <Edit2 size={14} />
            </Button>
            <Button
              onClick={() => onDelete(task._id)}
              variant="secondary"
              className="p-2 h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent shadow-none"
              title="删除"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
