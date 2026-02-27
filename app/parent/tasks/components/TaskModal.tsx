"use client";

import { Button, Modal, Select, DatePicker, Image } from "@/components/ui";
import Input from "@/components/ui/Input";
import { User } from "@/context/AppContext";
import { Camera } from "lucide-react";

export type ExpiryPolicyType = "auto_close" | "keep" | "rollover";

export interface TaskFormData {
  name: string;
  description: string;
  points: number;
  icon: string;
  type: string;
  requirePhoto: boolean;
  selectedChildren: string[];
  imageUrl: string;
  recurrence: "none" | "minutely" | "daily" | "weekly" | "monthly";
  recurrenceDay: number | undefined;
  deadline: Date | null;
  saveAsTemplate: boolean;
  // 新的周期任务字段
  isRecurring: boolean;
  autoPublishTime: string;
  expiryPolicy: ExpiryPolicyType;
  validFrom: Date | null;
  validUntil: Date | null;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  childList?: User[];
  taskData: TaskFormData;
  setTaskData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  onSubmit: () => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoPreview: string;
  toggleChild?: (childId: string) => void;
}

export default function TaskModal({
  isOpen,
  onClose,
  mode,
  childList,
  taskData,
  setTaskData,
  onSubmit,
  onPhotoSelect,
  photoPreview,
  toggleChild,
}: TaskModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "添加新任务" : "编辑任务"}
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
            onClick={onSubmit}
            className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-blue-100"
          >
            {mode === "add" ? "确认添加" : "保存修改"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {mode === "add" && childList && toggleChild && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择孩子</label>
            <div className="flex flex-wrap gap-2">
              {childList.map((child: User) => (
                <div
                  key={child.id}
                  onClick={() => toggleChild(child.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border-2 ${
                    taskData.selectedChildren.includes(child.id)
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
        )}

        <Input
          label="任务名称"
          value={taskData.name}
          onChange={(e) => setTaskData({ ...taskData, name: e.target.value })}
          placeholder="如：整理书包"
          className="rounded-xl border-gray-200"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">任务描述（可选）</label>
          <textarea
            value={taskData.description}
            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
            placeholder="详细描述任务要求，帮助孩子更好地理解"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">任务配图（可选）</label>
          <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group">
            <input type="file" accept="image/*" onChange={onPhotoSelect} className="hidden" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="text-blue-500" size={20} />
              </div>
              <span className="text-xs font-medium text-gray-500">
                {mode === "add" ? "点击上传或拖拽图片" : "点击上传或更换图片"}
              </span>
            </div>
          </label>
          {photoPreview && (
            <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <Image
                src={photoPreview}
                alt="预览"
                className="w-full h-32 object-cover"
                enableZoom={false}
                containerClassName="w-full h-32"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">积分奖励</label>
            <Input
              type="number"
              value={taskData.points}
              onChange={(e) => setTaskData({ ...taskData, points: parseInt(e.target.value) || 0 })}
              className="rounded-xl border-gray-200"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">任务类型</label>
            <div className="flex gap-2">
              {(["daily", "advanced", "challenge"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  onClick={() => setTaskData({ ...taskData, type })}
                  variant={taskData.type === type ? "primary" : "default"}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all shadow-none ${
                    taskData.type === type
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

        {mode === "add" && (
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={taskData.requirePhoto}
                onChange={(e) => setTaskData({ ...taskData, requirePhoto: e.target.checked })}
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
                checked={taskData.saveAsTemplate}
                onChange={(e) => setTaskData({ ...taskData, saveAsTemplate: e.target.checked })}
                className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">同时保存为模板</span>
                <span className="text-xs text-gray-500">方便下次直接使用</span>
              </div>
            </label>
          </div>
        )}

        {mode === "edit" && (
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={taskData.requirePhoto}
                onChange={(e) => setTaskData({ ...taskData, requirePhoto: e.target.checked })}
                className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">要求拍照提交</span>
                <span className="text-xs text-gray-500">完成后需上传照片证明</span>
              </div>
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择图标</label>
          <div className="flex flex-wrap gap-2">
            {["⭐", "📚", "🧹", "🏃", "🎨", "🎵", "🥦", "🥛", "😴", "🎹"].map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setTaskData({ ...taskData, icon })}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  taskData.icon === icon
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            截止时间（"必填"）
          </label>
          <DatePicker
            selected={taskData.deadline}
            onChange={(date: Date | null) => setTaskData({ ...taskData, deadline: date })}
            placeholderText="设置截止日期"
            showTimeSelect
            dateFormat="yyyy-MM-dd HH:mm:ss"
            selectsEnd
            minDate={mode === "edit" ? new Date() : undefined}
          />
        </div>

        {mode === "add" && (
          <div className="space-y-4">
            {/* 自动重复开关 */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskData.isRecurring}
                  onChange={(e) => {
                    const isRecurring = e.target.checked;
                    setTaskData({
                      ...taskData,
                      isRecurring,
                      recurrence: isRecurring ? "daily" : "none",
                    });
                  }}
                  className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-800">自动重复任务</span>
                  <p className="text-xs text-gray-500 mt-1">
                    开启后，系统将按照设定周期自动发布任务，无需手动创建
                  </p>
                </div>
              </label>
            </div>

            {/* 重复设置详情 */}
            {taskData.isRecurring && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                {/* 重复频率 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">重复频率</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "minutely", label: "每分钟" },
                      { value: "daily", label: "每天" },
                      { value: "weekly", label: "每周" },
                      { value: "monthly", label: "每月" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setTaskData({
                            ...taskData,
                            recurrence: option.value as "minutely" | "daily" | "weekly" | "monthly",
                            recurrenceDay: undefined,
                          })
                        }
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all min-w-[80px] ${
                          taskData.recurrence === option.value
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 每周/每月特定日期选择 */}
                {taskData.recurrence === "weekly" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择星期</label>
                    <div className="grid grid-cols-7 gap-1">
                      {[
                        { value: 1, label: "一" },
                        { value: 2, label: "二" },
                        { value: 3, label: "三" },
                        { value: 4, label: "四" },
                        { value: 5, label: "五" },
                        { value: 6, label: "六" },
                        { value: 0, label: "日" },
                      ].map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => setTaskData({ ...taskData, recurrenceDay: day.value })}
                          className={`py-2 rounded-lg text-sm font-medium transition-all ${
                            taskData.recurrenceDay === day.value
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {taskData.recurrence === "monthly" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择日期</label>
                    <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setTaskData({ ...taskData, recurrenceDay: date })}
                          className={`py-2 rounded-lg text-sm font-medium transition-all ${
                            taskData.recurrenceDay === date
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {date}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 发布时间 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发布时间
                    <span className="text-xs text-gray-400 font-normal ml-2">任务将在此时自动出现</span>
                  </label>
                  <input
                    type="time"
                    value={taskData.autoPublishTime}
                    onChange={(e) =>
                      setTaskData({ ...taskData, autoPublishTime: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                {/* 过期策略 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">未完成处理</label>
                  <div className="space-y-2">
                    {[
                      {
                        value: "auto_close",
                        label: "自动过期",
                        desc: "当日未完成则自动标记为过期",
                      },
                      {
                        value: "keep",
                        label: "保留任务",
                        desc: "任务保留，可次日继续完成",
                      },
                      {
                        value: "rollover",
                        label: "自动顺延",
                        desc: "未完成则顺延到第二天",
                      },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          taskData.expiryPolicy === option.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="expiryPolicy"
                          value={option.value}
                          checked={taskData.expiryPolicy === option.value}
                          onChange={(e) =>
                            setTaskData({
                              ...taskData,
                              expiryPolicy: e.target.value as ExpiryPolicyType,
                            })
                          }
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">{option.label}</span>
                          <p className="text-xs text-gray-500">{option.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 生效时间范围 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
                    <DatePicker
                      selected={taskData.validFrom}
                      onChange={(date: Date | null) =>
                        setTaskData({ ...taskData, validFrom: date })
                      }
                      placeholderText="立即开始"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
                    <DatePicker
                      selected={taskData.validUntil}
                      onChange={(date: Date | null) =>
                        setTaskData({ ...taskData, validUntil: date })
                      }
                      placeholderText="长期有效"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
