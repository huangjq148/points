"use client";

import { PlainReward } from "@/app/typings";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Edit2, Eye, EyeOff, Gift, Plus, Search, SlidersHorizontal, Trash2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { Pagination } from "@/components/ui";
import request from "@/utils/request";
import { StatCard, EmptyState, RewardCard } from "@/components/store/RewardUI";
import dayjs from "dayjs";

type RewardFilter = "all" | "active" | "inactive" | "physical" | "privilege" | "low-stock";

const rewardTypeOptions = [
  { value: "physical", label: "实物奖励", desc: "兑换后直接发放的奖品" },
  { value: "privilege", label: "特权奖励", desc: "兑换后可在一段时间内生效" },
] as const;

const durationOptions = [
  { value: "day", label: "天" },
  { value: "hour", label: "小时" },
] as const;

function formatDuration(value?: number | null, unit?: "day" | "hour" | null) {
  if (!value || !unit) return "未设置有效期";
  return `${value} ${unit === "day" ? "天" : "小时"}`;
}

export default function RewardsPage() {
  const toast = useToast();
  const [rewards, setRewards] = useState<PlainReward[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newReward, setNewReward] = useState({
    name: "",
    description: "",
    points: 50,
    type: "physical" as "physical" | "privilege",
    icon: "🎁",
    stock: 10,
    expiresAt: "",
    validDurationValue: 7,
    validDurationUnit: "day" as "day" | "hour",
  });
  const [showEditRewardModal, setShowEditRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<PlainReward | null>(null);
  const [editingRewardData, setEditingRewardData] = useState({
    name: "",
    description: "",
    points: 0,
    type: "physical" as "physical" | "privilege",
    icon: "",
    stock: 0,
    isActive: true,
    expiresAt: "",
    validDurationValue: 7,
    validDurationUnit: "day" as "day" | "hour",
  });
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<RewardFilter>("all");
  const limit = 10;

  const fetchRewards = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const data: { success: boolean; rewards: PlainReward[]; total: number } = await request(`/api/rewards?page=${pageNum}&limit=${limit}`);
      if (data.success) {
        setRewards(data.rewards);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void fetchRewards(page);
  }, [fetchRewards, page]);

  const filteredRewards = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return rewards.filter((reward) => {
      const matchesKeyword = !keyword || reward.name.toLowerCase().includes(keyword) || reward.description.toLowerCase().includes(keyword);
      if (!matchesKeyword) return false;
      switch (filter) {
        case "active":
          return reward.isActive;
        case "inactive":
          return !reward.isActive;
        case "physical":
          return reward.type === "physical";
        case "privilege":
          return reward.type === "privilege";
        case "low-stock":
          return reward.stock <= 3;
        default:
          return true;
      }
    });
  }, [filter, rewards, searchQuery]);

  const stats = useMemo(() => {
    const activeCount = rewards.filter((reward) => reward.isActive).length;
    const lowStockCount = rewards.filter((reward) => reward.stock <= 3).length;
    const physicalCount = rewards.filter((reward) => reward.type === "physical").length;
    const privilegeCount = rewards.filter((reward) => reward.type === "privilege").length;
    return { activeCount, lowStockCount, physicalCount, privilegeCount };
  }, [rewards]);

  const handleEditReward = (reward: PlainReward) => {
    setEditingReward(reward);
    setEditingRewardData({
      name: reward.name,
      description: reward.description,
      points: reward.points,
      type: reward.type,
      icon: reward.icon,
      stock: reward.stock,
      isActive: reward.isActive,
      expiresAt: reward.expiresAt ? dayjs(reward.expiresAt).format("YYYY-MM-DD") : "",
      validDurationValue: reward.validDurationValue ?? 7,
      validDurationUnit: reward.validDurationUnit ?? "day",
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
          expiresAt: editingRewardData.type === "privilege" ? editingRewardData.expiresAt : null,
          validDurationValue: editingRewardData.type === "privilege" ? editingRewardData.validDurationValue : null,
          validDurationUnit: editingRewardData.type === "privilege" ? editingRewardData.validDurationUnit : null,
        },
      });
      if (data.success) {
        toast.success("奖励更新成功");
        setShowEditRewardModal(false);
        setEditingReward(null);
        await fetchRewards(page);
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
        await fetchRewards(page);
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
        await fetchRewards(page);
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
      body: {
        ...newReward,
        expiresAt: newReward.type === "privilege" ? newReward.expiresAt : null,
        validDurationValue: newReward.type === "privilege" ? newReward.validDurationValue : null,
        validDurationUnit: newReward.type === "privilege" ? newReward.validDurationUnit : null,
      },
    });

    if (data.success) {
      setShowAddReward(false);
      setNewReward({ name: "", description: "", points: 50, type: "physical", icon: "🎁", stock: 10, expiresAt: "", validDurationValue: 7, validDurationUnit: "day" });
      await fetchRewards(page);
    } else {
      toast.error("添加失败: " + data.message);
    }
  };

  const iconChoices = ["🎁", "🍦", "📚", "🧸", "📺", "⏰", "🚲", "⭐"];

  return (
    <div className="rewards-page space-y-6">
      <section className="rewards-hero rounded-[28px] border border-white/65 bg-white/72 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
              <Gift size={14} />
              商城管理
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">管理孩子可以兑换的奖品</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              在这里统一管理商品名称、积分、库存和上架状态。库存低的商品会更容易被发现。
            </p>
          </div>
          <Button onClick={() => setShowAddReward(true)} className="min-w-[140px]">
            <Plus size={18} /> 添加奖励
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="上架中" value={stats.activeCount} hint="正在对孩子展示的商品" />
        <StatCard title="库存预警" value={stats.lowStockCount} hint="库存少于 3 的商品" />
        <StatCard title="实物奖励" value={stats.physicalCount} hint="可发放的实体奖品" />
        <StatCard title="特权奖励" value={stats.privilegeCount} hint="看电视、免任务等非实物奖励" />
      </section>

      <section className="rewards-toolbar rounded-[28px] border border-white/65 bg-white/72 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索奖励名称或说明"
              className="pl-11"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/90 px-3 py-2 text-sm text-slate-500">
              <SlidersHorizontal size={16} />
              筛选
            </div>
            {[
              { key: "all", label: "全部" },
              { key: "active", label: "上架中" },
              { key: "inactive", label: "已下架" },
              { key: "physical", label: "实物" },
              { key: "privilege", label: "特权" },
              { key: "low-stock", label: "库存告急" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as RewardFilter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === item.key ? "bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]" : "bg-white/85 text-slate-500 ring-1 ring-slate-200/70 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        {loading && (
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 px-3 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur">
            <RefreshCw size={14} className="animate-spin" />
            刷新中
          </div>
        )}

        {filteredRewards.length === 0 ? (
          <EmptyState title="还没有奖励配置" hint="先添加第一个商品，让孩子能看到可兑换的内容。" />
        ) : (
          <div className="grid gap-4">
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward._id.toString()}
                title={reward.name}
                icon={reward.icon}
                points={reward.points}
                stockLabel={`库存 ${reward.stock}`}
                typeLabel={reward.type === "physical" ? "实物" : "特权"}
                description={reward.description || "还没有填写说明"}
                muted={!reward.isActive}
                compact
                tableRow
                meta={
                  <>
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200/70">
                      {reward.points} 积分
                    </span>
                    {reward.type === "privilege" && (
                      <>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                          {reward.expiresAt ? `截止 ${dayjs(reward.expiresAt).format("MM-DD")}` : "需设置截止日期"}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          {formatDuration(reward.validDurationValue, reward.validDurationUnit)}
                        </span>
                      </>
                    )}
                  </>
                }
                secondaryActions={
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleEditReward(reward)}
                      variant="secondary"
                      className="border-none bg-white/80 px-3 text-slate-500 shadow-none ring-1 ring-slate-200/70 hover:bg-sky-50 hover:text-sky-700"
                      title="编辑"
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      onClick={() => void handleToggleRewardStatus(reward)}
                      variant="secondary"
                      className={`border-none bg-white/80 px-3 shadow-none ring-1 ring-slate-200/70 ${
                        reward.isActive ? "text-slate-500 hover:bg-amber-50 hover:text-amber-700" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                      title={reward.isActive ? "下架" : "上架"}
                    >
                      {reward.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                    <Button
                      onClick={() => setRewardToDelete(reward._id)}
                      variant="secondary"
                      className="border-none bg-white/80 px-3 text-red-600 shadow-none ring-1 ring-red-100 hover:bg-red-50 hover:text-red-700"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      {total > limit && <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />}

      <Modal
        isOpen={showAddReward}
        onClose={() => setShowAddReward(false)}
        title="添加新奖励"
        width={760}
        className="border border-slate-100 bg-gradient-to-br from-white via-white to-amber-50/30 p-0 shadow-[0_40px_120px_rgba(15,23,42,0.18)]"
        footer={
          <>
            <Button onClick={() => setShowAddReward(false)} variant="secondary" className="min-w-[108px] border-slate-200 bg-white/90">
              取消
            </Button>
            <Button onClick={handleAddReward} className="min-w-[140px] bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-200">
              确认添加
            </Button>
          </>
        }
      >
        <div className="max-h-[68vh] space-y-5 overflow-y-auto px-1 pr-3">

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="奖励名称" value={newReward.name} onChange={(e) => setNewReward({ ...newReward, name: e.target.value })} placeholder="如：冰淇淋" />
            <Input label="所需积分" type="number" value={newReward.points} onChange={(e) => setNewReward({ ...newReward, points: parseInt(e.target.value) || 0 })} />
          </div>

          <Input
            label="奖励说明"
            value={newReward.description}
            onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
            placeholder="让孩子更容易理解这个奖励"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">选择图标</label>
              <div className="flex flex-wrap gap-2">
                {iconChoices.map((icon) => (
                  <Button
                    key={icon}
                    onClick={() => setNewReward({ ...newReward, icon })}
                    className={`h-11 w-11 rounded-2xl p-0 text-xl shadow-none transition ${
                      newReward.icon === icon ? "bg-amber-100 ring-2 ring-amber-400" : "bg-white border border-slate-200 hover:bg-amber-50"
                    }`}
                    variant="secondary"
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">奖励类型</label>
              <div className="grid grid-cols-2 gap-2">
                {rewardTypeOptions.map((item) => (
                  <button
                    key={item.value}
                    onClick={() =>
                      setNewReward({
                        ...newReward,
                        type: item.value,
                        expiresAt: item.value === "physical" ? "" : newReward.expiresAt,
                        validDurationValue: item.value === "physical" ? 7 : newReward.validDurationValue,
                        validDurationUnit: item.value === "physical" ? "day" : newReward.validDurationUnit,
                      })
                    }
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      newReward.type === item.value ? "border-amber-300 bg-amber-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-bold text-slate-900">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {newReward.type === "privilege" && (
            <div className="grid gap-4 rounded-[28px] border border-amber-100 bg-amber-50/70 p-4 md:grid-cols-2">
              <Input
                label="兑换截止日期"
                type="date"
                value={newReward.expiresAt}
                onChange={(e) => setNewReward({ ...newReward, expiresAt: e.target.value })}
              />
              <div>
                <label className="mb-2 block text-sm text-slate-600">有效期长度</label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    type="number"
                    value={newReward.validDurationValue}
                    onChange={(e) => setNewReward({ ...newReward, validDurationValue: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                  <select
                    value={newReward.validDurationUnit}
                    onChange={(e) => setNewReward({ ...newReward, validDurationUnit: e.target.value as "day" | "hour" })}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  >
                    {durationOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-xs text-slate-500">兑换后从领取时间开始计算，孩子可在这段时间内使用该特权。</p>
              </div>
            </div>
          )}

          <Input label="库存数量" type="number" value={newReward.stock} onChange={(e) => setNewReward({ ...newReward, stock: parseInt(e.target.value) || 0 })} min={0} />
        </div>
      </Modal>

      <Modal
        isOpen={showEditRewardModal}
        onClose={() => setShowEditRewardModal(false)}
        title="编辑奖励"
        width={760}
        className="border border-slate-100 bg-gradient-to-br from-white via-white to-sky-50/30 p-0 shadow-[0_40px_120px_rgba(15,23,42,0.18)]"
        footer={
          <>
            <Button onClick={() => setShowEditRewardModal(false)} variant="secondary" className="min-w-[108px] border-slate-200 bg-white/90">
              取消
            </Button>
            <Button onClick={handleUpdateReward} className="min-w-[140px] bg-gradient-to-r from-sky-500 to-blue-500 shadow-lg shadow-sky-200">
              保存修改
            </Button>
          </>
        }
      >
        <div className="max-h-[68vh] space-y-5 overflow-y-auto px-1 pr-3">
          <div className="rounded-[24px] bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 p-[1px]">
            <div className="rounded-[23px] bg-white/95 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Reward Details</p>
              <h4 className="mt-1 text-lg font-black text-slate-900">调整奖励配置</h4>
              <p className="mt-1 text-sm text-slate-500">修改后会立即影响孩子端展示和可兑换规则。</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="奖励名称" value={editingRewardData.name} onChange={(e) => setEditingRewardData({ ...editingRewardData, name: e.target.value })} placeholder="如：冰淇淋" />
            <Input
              label="所需积分"
              type="number"
              value={editingRewardData.points}
              onChange={(e) => setEditingRewardData({ ...editingRewardData, points: parseInt(e.target.value) || 0 })}
            />
          </div>

          <Input label="奖励说明" value={editingRewardData.description} onChange={(e) => setEditingRewardData({ ...editingRewardData, description: e.target.value })} placeholder="让孩子更容易理解这个奖励" />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">选择图标</label>
              <div className="flex flex-wrap gap-2">
                {iconChoices.map((icon) => (
                  <Button
                    key={icon}
                    onClick={() => setEditingRewardData({ ...editingRewardData, icon })}
                    className={`h-11 w-11 rounded-2xl p-0 text-xl shadow-none transition ${
                      editingRewardData.icon === icon ? "bg-amber-100 ring-2 ring-amber-400" : "bg-white border border-slate-200 hover:bg-amber-50"
                    }`}
                    variant="secondary"
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">奖励类型</label>
              <div className="grid grid-cols-2 gap-2">
                {rewardTypeOptions.map((item) => (
                  <button
                    key={item.value}
                    onClick={() =>
                      setEditingRewardData({
                        ...editingRewardData,
                        type: item.value,
                        expiresAt: item.value === "physical" ? "" : editingRewardData.expiresAt,
                        validDurationValue: item.value === "physical" ? 7 : editingRewardData.validDurationValue,
                        validDurationUnit: item.value === "physical" ? "day" : editingRewardData.validDurationUnit,
                      })
                    }
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      editingRewardData.type === item.value ? "border-sky-300 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-bold text-slate-900">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {editingRewardData.type === "privilege" && (
            <div className="grid gap-4 rounded-[28px] border border-sky-100 bg-sky-50/70 p-4 md:grid-cols-2">
              <Input
                label="兑换截止日期"
                type="date"
                value={editingRewardData.expiresAt}
                onChange={(e) => setEditingRewardData({ ...editingRewardData, expiresAt: e.target.value })}
              />
              <div>
                <label className="mb-2 block text-sm text-slate-600">有效期长度</label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    type="number"
                    value={editingRewardData.validDurationValue}
                    onChange={(e) => setEditingRewardData({ ...editingRewardData, validDurationValue: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                  <select
                    value={editingRewardData.validDurationUnit}
                    onChange={(e) => setEditingRewardData({ ...editingRewardData, validDurationUnit: e.target.value as "day" | "hour" })}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  >
                    {durationOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-xs text-slate-500">兑换后从领取时间开始计算，孩子可在这段时间内使用该特权。</p>
              </div>
            </div>
          )}

          <Input label="库存数量" type="number" value={editingRewardData.stock} onChange={(e) => setEditingRewardData({ ...editingRewardData, stock: parseInt(e.target.value) || 0 })} min={0} />
        </div>
      </Modal>

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
