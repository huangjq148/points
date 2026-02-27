"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Select } from "@/components/ui";
import Input from "@/components/ui/Input";
import { TaskTemplate } from "../../tasks/page";
import request from "@/utils/request";

export type JobFrequency = "minutely" | "hourly" | "daily" | "weekly" | "monthly";

export interface JobFormData {
  name: string;
  description: string;
  frequency: JobFrequency;
  selectedTemplateId: string;
  selectedChildren: string[];
  // 每周/每月特定设置
  recurrenceDay: number | undefined;
  // 发布时间
  publishTime: string;
  // 过期策略
  expiryPolicy: "auto_close" | "keep" | "rollover";
}

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => void;
  childList: { id: string; username: string; avatar?: string }[];
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "minutely", label: "每分钟（测试用）" },
];

const WEEK_DAYS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 0, label: "日" },
];

const EXPIRY_POLICY_OPTIONS = [
  { value: "auto_close", label: "自动过期", desc: "当日未完成则自动标记为过期" },
  { value: "keep", label: "保留任务", desc: "任务保留，可次日继续完成" },
  { value: "rollover", label: "自动顺延", desc: "未完成则顺延到第二天" },
];

export default function CreateJobModal({
  isOpen,
  onClose,
  onSubmit,
  childList,
}: CreateJobModalProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<JobFormData>({
    name: "",
    description: "",
    frequency: "daily",
    selectedTemplateId: "",
    selectedChildren: [],
    recurrenceDay: undefined,
    publishTime: "08:00",
    expiryPolicy: "auto_close",
  });

  // 获取任务模板列表
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      // 重置表单
      setFormData({
        name: "",
        description: "",
        frequency: "daily",
        selectedTemplateId: "",
        selectedChildren: childList.map((c) => c.id),
        recurrenceDay: undefined,
        publishTime: "08:00",
        expiryPolicy: "auto_close",
      });
    }
  }, [isOpen, childList]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await request("/api/task-templates");
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error("获取模板失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t._id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        selectedTemplateId: templateId,
        name: `${template.name}（自动）`,
        description: template.description || `自动创建：${template.name}`,
      }));
    }
  };

  const toggleChild = (childId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedChildren: prev.selectedChildren.includes(childId)
        ? prev.selectedChildren.filter((id) => id !== childId)
        : [...prev.selectedChildren, childId],
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("请输入任务名称");
      return;
    }
    if (!formData.selectedTemplateId) {
      alert("请选择任务模板");
      return;
    }
    if (formData.selectedChildren.length === 0) {
      alert("请至少选择一个孩子");
      return;
    }
    if (formData.frequency === "weekly" && formData.recurrenceDay === undefined) {
      alert("请选择每周的哪一天");
      return;
    }
    if (formData.frequency === "monthly" && formData.recurrenceDay === undefined) {
      alert("请选择每月的哪一天");
      return;
    }

    onSubmit(formData);
  };

  const selectedTemplate = templates.find((t) => t._id === formData.selectedTemplateId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="创建自动任务"
      width={600}
      footer={
        <div className="flex gap-3 w-full">
          <Button onClick={onClose} variant="error" className="flex-1 py-3 font-semibold">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-blue-100"
          >
            创建定时任务
          </Button>
        </div>
      }
    >
      <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {/* 选择任务模板 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择任务模板 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
            {templates.map((template) => (
              <div
                key={template._id}
                onClick={() => handleTemplateChange(template._id || "")}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${
                  formData.selectedTemplateId === template._id
                    ? "bg-blue-50 border-blue-500"
                    : "bg-gray-50 border-transparent hover:bg-gray-100"
                }`}
              >
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{template.name}</p>
                  <p className="text-xs text-gray-500 truncate">{template.description}</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  {template.points}分
                </span>
              </div>
            ))}
          </div>
          {templates.length === 0 && !loading && (
            <p className="text-sm text-gray-500 text-center py-4">暂无任务模板，请先创建模板</p>
          )}
        </div>

        {/* 选择孩子 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择孩子 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {childList.map((child) => (
              <div
                key={child.id}
                onClick={() => toggleChild(child.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border-2 ${
                  formData.selectedChildren.includes(child.id)
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

        {/* 任务名称 */}
        <Input
          label="定时任务名称"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="如：每日阅读任务（自动）"
          className="rounded-xl border-gray-200"
        />

        {/* 任务描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">任务描述（可选）</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="描述这个自动任务的用途"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
            rows={2}
          />
        </div>

        {/* 重复频率 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">重复频率</label>
          <div className="flex gap-2 flex-wrap">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    frequency: option.value as JobFrequency,
                    recurrenceDay: undefined,
                  })
                }
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all min-w-[80px] ${
                  formData.frequency === option.value
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 每周特定日期 */}
        {formData.frequency === "weekly" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择星期 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, recurrenceDay: day.value })}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.recurrenceDay === day.value
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

        {/* 每月特定日期 */}
        {formData.frequency === "monthly" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择日期 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto custom-scrollbar">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setFormData({ ...formData, recurrenceDay: date })}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.recurrenceDay === date
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
            <span className="text-xs text-gray-400 font-normal ml-2">任务将在此时自动创建</span>
          </label>
          <input
            type="time"
            value={formData.publishTime}
            onChange={(e) => setFormData({ ...formData, publishTime: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        {/* 过期策略 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">未完成处理</label>
          <div className="space-y-2">
            {EXPIRY_POLICY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.expiryPolicy === option.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="expiryPolicy"
                  value={option.value}
                  checked={formData.expiryPolicy === option.value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiryPolicy: e.target.value as "auto_close" | "keep" | "rollover",
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

        {/* 预览信息 */}
        {selectedTemplate && formData.selectedChildren.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-2">任务预览</p>
            <div className="space-y-1 text-xs text-blue-700">
              <p>
                模板：{selectedTemplate.icon} {selectedTemplate.name}（{selectedTemplate.points}分）
              </p>
              <p>
                频率：
                {formData.frequency === "daily" && "每天"}
                {formData.frequency === "weekly" &&
                  `每周${WEEK_DAYS.find((d) => d.value === formData.recurrenceDay)?.label || "?"}`}
                {formData.frequency === "monthly" && `每月${formData.recurrenceDay || "?"}号`}
                {formData.frequency === "minutely" && "每分钟（测试）"}
              </p>
              <p>时间：{formData.publishTime}</p>
              <p>孩子：{formData.selectedChildren.length}位</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
