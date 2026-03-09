"use client";

import { useState, useCallback } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { Gift, Plus, Sparkles } from "lucide-react";
import request from "@/utils/request";

interface ChildInfo {
  id: string;
  nickname: string;
  avatar: string;
  availablePoints: number;
}

interface RewardPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: ChildInfo | null;
  onSuccess?: () => void;
}

export default function RewardPointsModal({
  isOpen,
  onClose,
  child,
  onSuccess,
}: RewardPointsModalProps) {
  const toast = useToast();
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ points?: string; reason?: string }>({});

  const validateForm = useCallback(() => {
    const newErrors: { points?: string; reason?: string } = {};
    const pointsNum = parseInt(points, 10);

    if (!points || isNaN(pointsNum) || pointsNum <= 0) {
      newErrors.points = "请输入有效的积分数量";
    }

    if (!reason.trim()) {
      newErrors.reason = "请输入奖励原因";
    } else if (reason.trim().length < 2) {
      newErrors.reason = "原因至少需要2个字符";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [points, reason]);

  const handleQuickSelect = useCallback((value: number) => {
    setPoints(String(value));
    if (errors.points) {
      setErrors((prev) => ({ ...prev, points: undefined }));
    }
  }, [errors.points]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm() || !child) return;

    setLoading(true);
    try {
      const data = await request("/api/points/reward", {
        method: "POST",
        body: {
          childId: child.id,
          points: parseInt(points, 10),
          reason: reason.trim(),
        },
      });

      if (data.success) {
        toast.success(`成功奖励 ${points} 积分`);
        // 重置表单
        setPoints("");
        setReason("");
        setErrors({});
        onClose();
        onSuccess?.();
      } else {
        toast.error(data.message || "奖励积分失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [child, points, reason, validateForm, onClose, onSuccess, toast]);

  const handleClose = useCallback(() => {
    if (!loading) {
      setPoints("");
      setReason("");
      setErrors({});
      onClose();
    }
  }, [loading, onClose]);

  if (!child) return null;

  const quickButtons = [
    { label: "10", value: 10 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
    { label: "200", value: 200 },
  ];

  const rewardReasons = [
    "表现优秀，值得鼓励",
    "按时完成作业",
    "帮助做家务",
    "保持良好的习惯",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="奖励积分"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "处理中..." : "确认奖励"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 孩子信息 */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
          <span className="text-3xl">{child.avatar}</span>
          <div>
            <p className="font-semibold text-gray-800">{child.nickname}</p>
            <p className="text-sm text-gray-500">
              当前可用积分: <span className="font-bold text-amber-600">{child.availablePoints}</span>
            </p>
          </div>
          <Sparkles className="ml-auto text-yellow-500" size={24} />
        </div>

        {/* 积分输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            奖励积分 <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={points}
            onChange={(e) => {
              const value = e.target.value;
              // 只允许输入正整数
              if (value === "" || /^\d+$/.test(value)) {
                setPoints(value);
                if (errors.points) {
                  setErrors((prev) => ({ ...prev, points: undefined }));
                }
              }
            }}
            placeholder="请输入要奖励的积分"
            error={errors.points}
            min={1}
            rightElement={<Plus className="text-green-500" size={18} />}
          />
          {/* 快捷选择按钮 */}
          <div className="flex gap-2 mt-3">
            {quickButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => handleQuickSelect(btn.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-green-200 bg-white text-green-700 hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* 原因输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            奖励原因 <span className="text-red-500">*</span>
          </label>
          {/* 快捷原因选择 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {rewardReasons.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setReason(r);
                  if (errors.reason) {
                    setErrors((prev) => ({ ...prev, reason: undefined }));
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  reason === r
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-green-50 hover:border-green-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errors.reason) {
                setErrors((prev) => ({ ...prev, reason: undefined }));
              }
            }}
            placeholder="请输入奖励原因，例如：表现优秀、完成任务、帮助做家务等..."
            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 resize-none
              bg-white/50 backdrop-blur-sm
              focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
              placeholder:text-gray-400
              ${errors.reason ? "border-red-500" : "border-gray-200 hover:border-green-300"}
            `}
            rows={3}
            maxLength={100}
          />
          {errors.reason && (
            <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
          )}
          <p className="mt-1 text-xs text-gray-400 text-right">
            {reason.length}/100
          </p>
        </div>

        {/* 提示 */}
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <Gift className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-sm text-green-700">
            <p className="font-medium">奖励积分</p>
            <p className="text-xs mt-0.5">
              奖励的积分将立即添加到孩子的账户中，可以用来兑换奖励。适当的奖励能激励孩子保持良好行为！
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
