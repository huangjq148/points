"use client";

import { FamilyMember } from "@/app/typings";
import { Button, DataTable } from "@/components/ui";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/context/AppContext";
import type { DataTableColumn } from "@/components/ui";
import { Copy, Settings, Trash2, Users, MinusCircle, PlusCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import request from "@/utils/request";
import DeductPointsModal from "@/components/parent/modals/DeductPointsModal";
import RewardPointsModal from "@/components/parent/modals/RewardPointsModal";

export default function FamilyPage() {
  const { currentUser, logout, refreshChildren } = useApp();
  const toast = useToast();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteUsernameInput, setInviteUsernameInput] = useState("");

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ username: "", password: "", role: "parent", identity: "" });
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);

  // 扣除积分弹窗状态
  const [showDeductPointsModal, setShowDeductPointsModal] = useState(false);
  const [deductPointsTarget, setDeductPointsTarget] = useState<{
    id: string;
    nickname: string;
    avatar: string;
    availablePoints: number;
  } | null>(null);

  // 奖励积分弹窗状态
  const [showRewardPointsModal, setShowRewardPointsModal] = useState(false);
  const [rewardPointsTarget, setRewardPointsTarget] = useState<{
    id: string;
    nickname: string;
    avatar: string;
    availablePoints: number;
  } | null>(null);

  const token = currentUser?.token;

  const fetchFamilyMembers = useCallback(async (pageNum: number = 1) => {
    if (!token) return;
    try {
      const data = await request("/api/family", {
        params: {
          page: pageNum,
          limit,
        },
      });
      if (data.success) {
        setFamilyMembers(data.members);
        if (data.total !== undefined) {
          setTotal(data.total);
        }
      } else {
        console.error("Fetch members failed:", data.message);
        if (data.message?.includes("User not found")) {
          logout();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [token, logout, limit]);

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      void fetchFamilyMembers(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [token, fetchFamilyMembers, page]);

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      if (!token) return;
      const data = await request(`/api/family?id=${id}`, {
        method: "DELETE",
      });
      if (data.success) {
        toast.success("删除成功");
        setDeleteMemberId(null);
        fetchFamilyMembers(page);
      } else {
        toast.error("删除失败");
      }
    },
    [token, fetchFamilyMembers, toast, page],
  );

  const handleCreateFamily = async () => {
    if (!token) return;
    try {
      const data = await request("/api/family", {
        method: "POST",
        body: {
          action: "create_family",
        },
      });
      if (data.success) {
        toast.success("家庭创建成功");
        window.location.reload();
      } else {
        toast.error(data.message || "创建失败");
      }
    } catch (e) {
      console.error(e);
      toast.error("创建失败");
    }
  };

  const handleInviteByUsername = async () => {
    if (!inviteUsernameInput.trim()) return;
    try {
      if (!token) return;
      const data = await request("/api/family", {
        method: "POST",
        body: {
          action: "invite_by_username",
          targetUsername: inviteUsernameInput.trim(),
        },
      });
      if (data.success) {
        toast.success("邀请成功");
        setInviteUsernameInput("");
        fetchFamilyMembers(page);
        refreshChildren();
      } else {
        toast.error(data.message || "邀请失败");
      }
    } catch (e) {
      console.error(e);
      toast.error("邀请失败");
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCodeInput) return;
    if (!token) return;
    try {
      const data = await request("/api/auth", {
        method: "POST",
        body: {
          action: "join-family",
          inviteCode: inviteCodeInput.trim(),
        },
      });
      if (data.success) {
        toast.success("加入成功！请重新登录以刷新数据");
        setTimeout(logout, 2000);
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.error(e);
      toast.error("加入失败");
    }
  };

  const columns = useMemo<DataTableColumn<FamilyMember>[]>(() => [
    {
      key: "username",
      title: "成员",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${row.type === "child"
              ? "bg-gradient-to-br from-green-100 to-green-200 text-green-600"
              : "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600"
            }`}>
            {row.type === "child" ? "👶" : "👤"}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{String(value ?? "-")}</span>
            {row.identity && (
              <span className="text-xs text-slate-500">{String(row.identity)}</span>
            )}
          </div>
          {row.isMe && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-200">
              我
            </span>
          )}
        </div>
      ),
    },
    {
      key: "role",
      title: "角色",
      render: (value) => {
        const roleConfig: Record<string, { label: string; className: string }> = {
          admin: { label: "管理员", className: "bg-purple-100 text-purple-700 border-purple-200" },
          parent: { label: "家长", className: "bg-blue-100 text-blue-700 border-blue-200" },
          child: { label: "孩子", className: "bg-green-100 text-green-700 border-green-200" },
        };
        const config = roleConfig[String(value)] || { label: "-", className: "bg-slate-100 text-slate-600 border-slate-200" };
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "type",
      title: "类型",
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${value === "child"
            ? "bg-orange-50 text-orange-600 border-orange-200"
            : "bg-slate-50 text-slate-600 border-slate-200"
          }`}>
          {value === "child" ? "👶 孩子" : "👤 用户"}
        </span>
      ),
    },
    {
      key: "points",
      title: "积分",
      render: (_, row) => {
        if (row.type !== "child") {
          return <span className="text-slate-400">-</span>;
        }
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-semibold">{row.availablePoints || 0}</span>
              <span className="text-xs text-slate-400">可用</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">{row.totalPoints || 0}</span>
              <span className="text-xs text-slate-400">累计</span>
            </div>
          </div>
        );
      },
    },
  ], []);

  const actionColumn = useMemo<DataTableColumn<FamilyMember>>(() => ({
    key: "actions",
    title: "操作",
    render: (_, row) => (
      <div className="flex justify-center gap-2">
        {row.type === "parent" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingMember(row);
              setAccountForm({
                username: row.username,
                password: "",
                role: row.role,
                identity: row.identity || "",
              });
              setShowEditAccountModal(true);
            }}
            className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl border-none bg-transparent shadow-none"
          >
            <Settings size={18} />
          </Button>
        )}
        {/* 孩子角色显示奖励积分按钮 */}
        {row.type === "child" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRewardPointsTarget({
                id: row.id,
                nickname: row.nickname || row.username,
                avatar: row.avatar || "👶",
                availablePoints: row.availablePoints || 0,
              });
              setShowRewardPointsModal(true);
            }}
            className="text-green-500 hover:bg-green-50 p-2 rounded-xl border-none bg-transparent shadow-none"
            title="奖励积分"
          >
            <PlusCircle size={18} />
          </Button>
        )}
        {/* 孩子角色显示扣除积分按钮 - 只在有可扣除积分时显示 */}
        {row.type === "child" && (row.availablePoints || 0) > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDeductPointsTarget({
                id: row.id,
                nickname: row.nickname || row.username,
                avatar: row.avatar || "👶",
                availablePoints: row.availablePoints || 0,
              });
              setShowDeductPointsModal(true);
            }}
            className="text-orange-500 hover:bg-orange-50 p-2 rounded-xl border-none bg-transparent shadow-none"
            title={`扣除积分（可扣: ${row.availablePoints}）`}
          >
            <MinusCircle size={18} />
          </Button>
        )}
        {!row.isMe && row.type === "parent" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeleteMemberId(row.id)}
            className="text-red-500 hover:bg-red-50 p-2 rounded-xl border-none bg-transparent shadow-none"
          >
            <Trash2 size={18} />
          </Button>
        )}
      </div>
    ),
  }), []);

  const pageOptions = useMemo(() => ({
    currentPage: page,
    total,
    pageSize: limit,
    onPageChange: setPage,
  }), [page, total, limit]);

  return (
    <div className="space-y-6">
      <Modal
        isOpen={!!deleteMemberId}
        onClose={() => setDeleteMemberId(null)}
        title="移出成员"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteMemberId(null)}>
              取消
            </Button>
            <Button
              variant="error"
              className="flex-1"
              onClick={() => deleteMemberId && handleDeleteAccount(deleteMemberId)}
            >
              确认移出
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">确定将该成员移出家庭吗？</p>
      </Modal>

      <div className="flex gap-2">
        {!currentUser?.familyId ? (
          <Button onClick={handleCreateFamily} className="flex items-center gap-2">
            <Users size={20} /> 创建家庭
          </Button>
        ) : (
          <Button onClick={() => setShowInviteModal(true)} variant="success" className="flex items-center gap-2">
            <Users size={20} /> 邀请成员
          </Button>
        )}
      </div>

      <div className="w-full min-w-0 overflow-x-hidden">
        <DataTable
          columns={columns}
          dataSource={familyMembers}
          actionColumn={actionColumn}
          fixedColumns={{ left: ["username"], right: ["actions"] }}
          pageOptions={pageOptions}
          minWidth={600}
        />
      </div>

      <Modal isOpen={showEditAccountModal} onClose={() => setShowEditAccountModal(false)} title="编辑账号">
        <div className="space-y-4">
          <Input
            label="账号"
            value={accountForm.username}
            onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
          />
          <Input
            label="密码 (留空不修改)"
            value={accountForm.password}
            onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
            placeholder="******"
          />
          <Input
            label="身份"
            value={accountForm.identity}
            onChange={(e) => setAccountForm({ ...accountForm, identity: e.target.value })}
            placeholder="请输入身份标识"
          />
          <Button
            onClick={async () => {
              if (!editingMember) return;
              if (!token) return;
              const data = await request("/api/user", {
                method: "PUT",
                body: { id: editingMember.id, ...accountForm },
              });
              if (data.success) {
                toast.success("更新成功");
                setShowEditAccountModal(false);
                fetchFamilyMembers();
              } else {
                toast.error(data.message);
              }
            }}
            fullWidth
            className="mt-2"
          >
            保存修改
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="邀请与加入">
        <div className="space-y-6">
          <div className="card-parent">
            <p className="text-sm text-blue-800 font-medium mb-1">您的家庭邀请码</p>
            <div className="flex items-center gap-2">
              <code className="text-2xl font-mono font-bold text-blue-600">
                {currentUser?.inviteCode || "Loading..."}
              </code>
              <Button
                onClick={() => {
                  if (currentUser?.inviteCode) {
                    navigator.clipboard.writeText(currentUser.inviteCode);
                    toast.success("复制成功");
                  }
                }}
                variant="secondary"
                className="p-2 hover:bg-blue-100 rounded-xl text-blue-600 border-none bg-transparent shadow-none"
              >
                <Copy size={20} />
              </Button>
            </div>
            <p className="text-xs text-blue-600 mt-2">其他用户可以使用此邀请码加入您的家庭。</p>
          </div>

          <div className="card-parent">
            <h4 className="font-bold text-slate-800 mb-4">邀请用户加入</h4>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  value={inviteUsernameInput}
                  onChange={(e) => setInviteUsernameInput(e.target.value)}
                  placeholder="请输入对方用户名"
                />
              </div>
              <Button onClick={handleInviteByUsername} disabled={!inviteUsernameInput}>
                邀请
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">对方将直接加入您的家庭（前提是对方尚未加入任何家庭）。</p>
          </div>

          <div className="card-parent">
            <h4 className="font-bold text-slate-800 mb-4">加入其他家庭</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">输入邀请码</label>
                <Input
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="请输入6位邀请码"
                  maxLength={6}
                />
              </div>
              <Button onClick={handleJoinFamily} disabled={!inviteCodeInput} fullWidth>
                加入家庭
              </Button>
              <p className="text-xs text-slate-500 text-center">
                注意：加入新家庭后，您将退出当前家庭，且需要重新登录。
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* 扣除积分弹窗 */}
      <DeductPointsModal
        isOpen={showDeductPointsModal}
        onClose={() => setShowDeductPointsModal(false)}
        child={deductPointsTarget}
        onSuccess={() => {
          // 扣除成功后刷新家庭成员列表
          fetchFamilyMembers(page);
        }}
      />

      {/* 奖励积分弹窗 */}
      <RewardPointsModal
        isOpen={showRewardPointsModal}
        onClose={() => setShowRewardPointsModal(false)}
        child={rewardPointsTarget}
        onSuccess={() => {
          // 奖励成功后刷新家庭成员列表
          fetchFamilyMembers(page);
        }}
      />
    </div>
  );
}
