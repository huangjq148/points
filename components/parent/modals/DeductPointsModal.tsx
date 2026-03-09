"use client";

import { useState, useCallback } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { AlertCircle, Minus } from "lucide-react";
import request from "@/utils/request";

interface ChildInfo {
  id: string;
  nickname: string;
  avatar: string;
  availablePoints: number;
}

interface DeductPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: ChildInfo | null;
  onSuccess?: () => void;
}

export default function DeductPointsModal({
  isOpen,
  onClose,
  child,
  onSuccess,
}: DeductPointsModalProps) {
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
    } else if (child && pointsNum > child.availablePoints) {
      newErrors.points = `扣除积分不能超过当前可用积分 ${child.availablePoints}`;
    }

    if (!reason.trim()) {
      newErrors.reason = "请输入扣除原因";
    } else if (reason.trim().length < 2) {
      newErrors.reason = "原因至少需要2个字符";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [points, reason, child]);

  const handleQuickSelect = useCallback((value: number) => {
    if (child) {
      const maxPoints = child.availablePoints;
      if (value === -1) {
        // 全部扣除
        setPoints(String(maxPoints));
      } else {
        setPoints(String(Math.min(value, maxPoints)));
      }
      if (errors.points) {
        setErrors((prev) => ({ ...prev, points: undefined }));
      }
    }
  }, [child, errors.points]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm() || !child) return;

    setLoading(true);
    try {
      const data = await request("/api/points/deduct", {
        method: "POST",
        body: {
          childId: child.id,
          points: parseInt(points, 10),
          reason: reason.trim(),
        },
      });

      if (data.success) {
        toast.success(`成功扣除 ${points} 积分`);
        // 重置表单
        setPoints("");
        setReason("");
        setErrors({});
        onClose();
        onSuccess?.();
      } else {
        toast.error(data.message || "扣除积分失败");
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
    { label: "全部", value: -1 },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="扣除积分"
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
            className="flex-1 bg-red-500 hover:bg-red-600"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "处理中..." : "确认扣除"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 孩子信息 */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
          <span className="text-3xl">{child.avatar}</span>
          <div>
            <p className="font-semibold text-gray-800">{child.nickname}</p>
            <p className="text-sm text-gray-500">
              当前可用积分: <span className="font-bold text-amber-600">{child.availablePoints}</span>
            </p>
          </div>
        </div>

        {/* 积分输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            扣除积分 <span className="text-red-500">*</span>
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
            placeholder="请输入要扣除的积分"
            error={errors.points}
            min={1}
            max={child.availablePoints}
            rightElement={<Minus className="text-red-500" size={18} />}
          />
          {/* 快捷选择按钮 */}
          <div className="flex gap-2 mt-3">
            {quickButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => handleQuickSelect(btn.value)}
                disabled={btn.value !== -1 && btn.value > child.availablePoints}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  btn.value !== -1 && btn.value > child.availablePoints
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:text-red-600"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* 原因输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            扣除原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errors.reason) {
                setErrors((prev) => ({ ...prev, reason: undefined }));
              }
            }}
            placeholder="请输入扣除原因，例如：未按时完成作业、房间脏乱等..."
            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 resize-none
              bg-white/50 backdrop-blur-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              placeholder:text-gray-400
              ${errors.reason ? "border-red-500" : "border-gray-200 hover:border-blue-300"}
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

        {/* 安全提示 */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-sm text-amber-700">
            <p className="font-medium">提示</p>
            <p className="text-xs mt-0.5">
              扣除的积分将从孩子的可用积分中立即扣除，且无法撤销。请谨慎操作。
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
