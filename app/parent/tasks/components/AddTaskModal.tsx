"use client";

import { Button, Modal } from "@/components/ui";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { User } from "@/context/AppContext";
import { zhCN } from "date-fns/locale";
import { Camera, Clock } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  childList: User[];
  newTask: {
    name: string;
    points: number;
    icon: string;
    type: string;
    requirePhoto: boolean;
    selectedChildren: string[];
    imageUrl: string;
    recurrence: "none" | "daily" | "weekly" | "monthly";
    recurrenceDay: number | undefined;
    deadline: Date | null;
    saveAsTemplate: boolean;
  };
  setNewTask: React.Dispatch<React.SetStateAction<AddTaskModalProps["newTask"]>>;
  onAdd: () => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoPreview: string;
  toggleChild: (childId: string) => void;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  childList,
  newTask,
  setNewTask,
  onAdd,
  onPhotoSelect,
  photoPreview,
  toggleChild,
}: AddTaskModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="添加新任务"
      width={600}
      footer={
        <div className="flex gap-3 w-full">
          <Button
            onClick={onClose}
            variant="error"
            className="flex-1 py-3 font-semibold"
          >
            取消
          </Button>
          <Button
            onClick={onAdd}
            className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-blue-100"
          >
            确认添加
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择孩子</label>
          <div className="flex flex-wrap gap-2">
            {childList.map((child: User) => (
              <div
                key={child.id}
                onClick={() => toggleChild(child.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border-2 ${
                  newTask.selectedChildren.includes(child.id)
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{child.avatar || "👤"}</span>
                <span className="text-sm font-medium">{child.username}</span>
              </div>
            ))}
          </div>
        </div>

        <Input
          label="任务名称"
          value={newTask.name}
          onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
          placeholder="如：整理书包"
          className="rounded-xl border-gray-200"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">任务配图（可选）</label>
          <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group">
            <input type="file" accept="image/*" onChange={onPhotoSelect} className="hidden" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="text-blue-500" size={20} />
              </div>
              <span className="text-xs font-medium text-gray-500">点击上传或拖拽图片</span>
            </div>
          </label>
          {photoPreview && (
            <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <img src={photoPreview} alt="预览" className="w-full h-32 object-cover" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">积分奖励</label>
            <Input
              type="number"
              value={newTask.points}
              onChange={(e) => setNewTask({ ...newTask, points: parseInt(e.target.value) || 0 })}
              className="rounded-xl border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">任务类型</label>
            <Select
              value={newTask.type}
              onChange={(val) => setNewTask({ ...newTask, type: val as string })}
              options={[
                { value: "daily", label: "日常" },
                { value: "advanced", label: "进阶" },
                { value: "challenge", label: "挑战" },
              ]}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={newTask.requirePhoto}
              onChange={(e) => setNewTask({ ...newTask, requirePhoto: e.target.checked })}
              className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-700">要求拍照提交</span>
              <span className="text-xs text-gray-500">完成后需上传照片证明</span>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={newTask.saveAsTemplate}
              onChange={(e) => setNewTask({ ...newTask, saveAsTemplate: e.target.checked })}
              className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-700">同时保存为模板</span>
              <span className="text-xs text-gray-500">方便下次直接使用</span>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择图标</label>
          <div className="flex flex-wrap gap-2">
            {["⭐", "📚", "🧹", "🏃", "🎨", "🎵", "🥦", "🥛", "😴", "🎹"].map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setNewTask({ ...newTask, icon })}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  newTask.icon === icon
                    ? "bg-blue-100 ring-2 ring-blue-500 ring-offset-1 scale-110"
                    : "bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">截止时间（可选）</label>
          <div className="relative">
            <DatePicker
              selected={newTask.deadline}
              onChange={(date: Date | null) => setNewTask({ ...newTask, deadline: date })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="yyyy/MM/dd HH:mm"
              locale={zhCN}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              placeholderText="点击选择截止时间"
              isClearable
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">重复设置</label>
          <div className="space-y-3">
            <Select
              value={newTask.recurrence}
              onChange={(val) => {
                const r =
                  typeof val === "string" && ["none", "daily", "weekly", "monthly"].includes(val)
                    ? (val as "none" | "daily" | "weekly" | "monthly")
                    : "none";
                setNewTask({ ...newTask, recurrence: r });
              }}
              options={[
                { value: "none", label: "不重复" },
                { value: "daily", label: "每天" },
                { value: "weekly", label: "每周" },
                { value: "monthly", label: "每月" },
              ]}
            />

            {newTask.recurrence === "weekly" && (
              <Select
                value={newTask.recurrenceDay}
                onChange={(val) => setNewTask({ ...newTask, recurrenceDay: val as number })}
                options={[
                  { value: 1, label: "周一" },
                  { value: 2, label: "周二" },
                  { value: 3, label: "周三" },
                  { value: 4, label: "周四" },
                  { value: 5, label: "周五" },
                  { value: 6, label: "周六" },
                  { value: 0, label: "周日" },
                ]}
                placeholder="选择星期"
              />
            )}

            {newTask.recurrence === "monthly" && (
              <Select
                value={newTask.recurrenceDay}
                onChange={(val) => setNewTask({ ...newTask, recurrenceDay: val as number })}
                options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}号` }))}
                placeholder="选择日期"
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
