"use client";

import { Button, Modal, DatePicker } from "@/components/ui";
import Input from "@/components/ui/Input";
import { Camera, Clock } from "lucide-react";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTaskData: {
    name: string;
    points: number;
    icon: string;
    type: "daily" | "advanced" | "challenge";
    requirePhoto: boolean;
    imageUrl: string;
    deadline: Date | null;
  };
  setEditingTaskData: React.Dispatch<React.SetStateAction<EditTaskModalProps["editingTaskData"]>>;
  onUpdate: () => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoPreview: string;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  editingTaskData,
  setEditingTaskData,
  onUpdate,
  onPhotoSelect,
  photoPreview,
}: EditTaskModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑任务"
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
            onClick={onUpdate}
            className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-blue-100"
          >
            保存修改
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <Input
          label="任务名称"
          value={editingTaskData.name}
          onChange={(e) => setEditingTaskData({ ...editingTaskData, name: e.target.value })}
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
              <span className="text-xs font-medium text-gray-500">点击上传或更换图片</span>
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
              value={editingTaskData.points}
              onChange={(e) => setEditingTaskData({ ...editingTaskData, points: parseInt(e.target.value) || 0 })}
              className="rounded-xl border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">任务类型</label>
            <div className="flex gap-2">
              {(["daily", "advanced", "challenge"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  onClick={() => setEditingTaskData({ ...editingTaskData, type })}
                  variant={editingTaskData.type === type ? "primary" : "default"}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all shadow-none ${
                    editingTaskData.type === type
                      ? "border-blue-600 shadow-sm"
                      : "hover:bg-blue-50 hover:border-blue-200"
                  }`}
                >
                  {type === "daily" ? "日常" : type === "advanced" ? "进阶" : "挑战"}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={editingTaskData.requirePhoto}
              onChange={(e) => setEditingTaskData({ ...editingTaskData, requirePhoto: e.target.checked })}
              className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-700">要求拍照提交</span>
              <span className="text-xs text-gray-500">完成后需上传照片证明</span>
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
                onClick={() => setEditingTaskData({ ...editingTaskData, icon })}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  editingTaskData.icon === icon
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
          <DatePicker
            selected={editingTaskData.deadline}
            onChange={(date: Date | null) => setEditingTaskData({ ...editingTaskData, deadline: date })}
            placeholderText="设置截止日期"
            showTimeSelect
          />
        </div>
      </div>
    </Modal>
  );
}
