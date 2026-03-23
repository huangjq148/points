"use client";

import { PlainReward } from "@/app/typings";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Edit2, Eye, EyeOff, Gift, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { Pagination } from "@/components/ui";
import request from "@/utils/request";

export default function RewardsPage() {
  const toast = useToast();
  const [rewards, setRewards] = useState<PlainReward[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [showAddReward, setShowAddReward] = useState(false);
  const [newReward, setNewReward] = useState({ name: "", points: 50, type: "physical", icon: "🎁", stock: 10 });
  // Reward Edit/Delete States
  const [showEditRewardModal, setShowEditRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<PlainReward | null>(null);
  const [editingRewardData, setEditingRewardData] = useState({
    name: "",
    points: 0,
    type: "physical" as "physical" | "privilege",
    icon: "",
    stock: 0,
    isActive: true,
  });
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);

  const fetchRewards = useCallback(async (pageNum: number = 1) => {
    const data: { success: boolean; rewards: PlainReward[]; total: number } = await request(`/api/rewards?page=${pageNum}&limit=${limit}`);
    if (data.success) {
      setRewards(data.rewards);
      setTotal(data.total);
    }
  }, [limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRewards(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRewards, page]);

  const handleEditReward = (reward: PlainReward) => {
    setEditingReward(reward);
    setEditingRewardData({
      name: reward.name,
      points: reward.points,
      type: reward.type,
      icon: reward.icon,
      stock: reward.stock,
      isActive: reward.isActive,
    });
    setShowEditRewardModal(true);
  };

  const handleUpdateReward = async () => {
    if (!editingReward) return;
    try {
      const data = await request("/api/rewards", {
        method: "PUT",
        body: {
          rewardId: editingReward._id,
          ...editingRewardData,
        },
      });
      if (data.success) {
        toast.success("奖励更新成功");
        setShowEditRewardModal(false);
        setEditingReward(null);
        fetchRewards(page);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("更新失败");
    }
  };
  const handleToggleRewardStatus = async (reward: PlainReward) => {
    try {
      const data = await request("/api/rewards", {
        method: "PUT",
        body: {
          rewardId: reward._id,
          isActive: !reward.isActive,
        },
      });
      if (data.success) {
        toast.success(reward.isActive ? "奖励已下架" : "奖励已上架");
        fetchRewards(page);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDeleteReward = async () => {
    if (!rewardToDelete) return;
    try {
      const data = await request(`/api/rewards?rewardId=${rewardToDelete}`, {
        method: "DELETE",
      });
      if (data.success) {
        toast.success("奖励删除成功");
        setRewardToDelete(null);
        fetchRewards(page);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleAddReward = async () => {
    const data = await request("/api/rewards", {
      method: "POST",
      body: newReward,
    });

    if (data.success) {
      setShowAddReward(false);
      setNewReward({ name: "", points: 50, type: "physical", icon: "🎁", stock: 10 });
      fetchRewards(page);
    } else {
      toast.error("添加失败: " + data.message);
    }
  };

  return (
    <div className="space-y-6">
      <Button onClick={() => setShowAddReward(true)} className="flex items-center gap-2">
        <Plus size={18} /> 添加奖励
      </Button>
      {rewards.length === 0 ? (
        <div className="card-parent text-center py-12 text-slate-500">
          <Gift size={48} className="mx-auto mb-2 opacity-50" />
          <p>暂无奖励配置，请点击右上角添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map((reward) => (
            <div key={reward._id.toString()} className="reward-card group relative">
              <div className="reward-icon">{reward.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800">{reward.name}</p>
                  {reward.isActive ? (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">已上架</span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">已下架</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{reward.points} 积分</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${reward.stock > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                  >
                    库存: {reward.stock}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {reward.type === "physical" ? "实物" : "特权"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => handleToggleRewardStatus(reward)}
                  variant="secondary"
                  className={`p-2 rounded-xl border-none bg-transparent shadow-none ${reward.isActive ? "text-slate-400 hover:text-orange-600 hover:bg-orange-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50"}`}
                  title={reward.isActive ? "下架" : "上架"}
                >
                  {reward.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
                <Button
                  onClick={() => handleEditReward(reward)}
                  variant="secondary"
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border-none bg-transparent shadow-none"
                  title="编辑"
                >
                  <Edit2 size={18} />
                </Button>
                <Button
                  onClick={() => setRewardToDelete(reward._id)}
                  variant="secondary"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border-none bg-transparent shadow-none"
                  title="删除"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > limit && <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />}

      {/* Add Reward Modal */}
      <Modal isOpen={showAddReward} onClose={() => setShowAddReward(false)} title="添加新奖励">
        <div className="space-y-4">
          <div>
            <Input
              label="奖励名称"
              value={newReward.name}
              onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
              placeholder="如：冰淇淋"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">所需积分</label>
            <Input
              type="number"
              value={newReward.points}
              onChange={(e) => setNewReward({ ...newReward, points: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">选择图标</label>
            <div className="flex flex-wrap gap-2">
              {["🎁", "🍦", "📚", "🧸", "📺", "⏰"].map((icon) => (
                <Button
                  key={icon}
                  onClick={() => setNewReward({ ...newReward, icon })}
                  className={`w-10 h-10 rounded-xl text-xl p-0 transition-all border-none shadow-none ${newReward.icon === icon ? "bg-yellow-100 ring-2 ring-yellow-400" : "bg-white border border-slate-200 hover:bg-yellow-50"}`}
                  variant="secondary"
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">奖励类型</label>
            <div className="flex gap-2">
              {["physical", "privilege"].map((type) => (
                <Button
                  key={type}
                  onClick={() => setNewReward({ ...newReward, type: type as "physical" | "privilege" })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all border-none shadow-none ${newReward.type === type ? "bg-yellow-500 text-white border-yellow-500 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-yellow-50 hover:border-yellow-200"}`}
                  variant="secondary"
                >
                  {type === "physical" ? "实物" : "特权"}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Input
              label="库存数量"
              type="number"
              value={newReward.stock}
              onChange={(e) => setNewReward({ ...newReward, stock: parseInt(e.target.value) || 0 })}
              min={0}
            />
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={() => setShowAddReward(false)} variant="error" className="flex-1 py-3 text-slate-600">
              取消
            </Button>
            <Button onClick={handleAddReward} className="flex-1 py-3">
              确认添加
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Reward Modal */}
      <Modal isOpen={showEditRewardModal} onClose={() => setShowEditRewardModal(false)} title="编辑奖励">
        <div className="space-y-4">
          <Input
            label="奖励名称"
            value={editingRewardData.name}
            onChange={(e) => setEditingRewardData({ ...editingRewardData, name: e.target.value })}
            placeholder="如：冰淇淋"
          />

          <Input
            label="所需积分"
            type="number"
            value={editingRewardData.points}
            onChange={(e) => setEditingRewardData({ ...editingRewardData, points: parseInt(e.target.value) })}
          />

          <div>
            <label className="block text-sm text-slate-600 mb-2">选择图标</label>
            <div className="flex flex-wrap gap-2">
              {["🎁", "🍦", "📚", "🧸", "📺", "⏰"].map((icon) => (
                <Button
                  key={icon}
                  onClick={() => setEditingRewardData({ ...editingRewardData, icon })}
                  className={`w-10 h-10 rounded-xl text-xl p-0 border-none shadow-none ${editingRewardData.icon === icon ? "bg-yellow-100 ring-2 ring-yellow-400" : "bg-slate-100"}`}
                  variant="secondary"
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">奖励类型</label>
            <div className="flex gap-2">
              {["physical", "privilege"].map((type) => (
                <Button
                  key={type}
                  onClick={() => setEditingRewardData({ ...editingRewardData, type: type as "physical" | "privilege" })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all border-none shadow-none ${editingRewardData.type === type ? "bg-yellow-500 text-white border-yellow-500 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-yellow-50 hover:border-yellow-200"}`}
                  variant="secondary"
                >
                  {type === "physical" ? "实物" : "特权"}
                </Button>
              ))}
            </div>
          </div>

          <Input
            label="库存数量"
            type="number"
            value={editingRewardData.stock}
            onChange={(e) => setEditingRewardData({ ...editingRewardData, stock: parseInt(e.target.value) || 0 })}
            min={0}
          />

          <div className="flex gap-2 mt-6">
            <Button onClick={() => setShowEditRewardModal(false)} variant="error" className="flex-1 py-3 text-slate-600">
              取消
            </Button>
            <Button onClick={handleUpdateReward} className="flex-1 py-3">
              保存修改
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Reward */}
      <ConfirmModal
        isOpen={!!rewardToDelete}
        onClose={() => setRewardToDelete(null)}
        onConfirm={handleDeleteReward}
        title="确认删除奖励"
        message="确定要删除这个奖励吗？此操作无法撤销。"
        confirmText="删除"
        type="danger"
      />
    </div>
  );
}
