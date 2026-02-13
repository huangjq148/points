"use client";

import { FamilyMember } from "@/app/typings";
import Layout from "@/components/Layouts";
import { Button } from "@/components/ui";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/context/AppContext";
import { ColumnDef, createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Copy, Settings, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui";
import request from "@/utils/request";

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

  const token = currentUser?.token;

  const fetchFamilyMembers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await request("/api/family");
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
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      fetchFamilyMembers();
    }
  }, [token, fetchFamilyMembers]);

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      if (!confirm("确定将该成员移出家庭吗？")) return;
      if (!token) return;
      const data = await request(`/api/family?id=${id}`, {
        method: "DELETE",
      });
      if (data.success) {
        toast.success("删除成功");
        fetchFamilyMembers();
      } else {
        toast.error("删除失败");
      }
    },
    [token, fetchFamilyMembers, toast],
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
        fetchFamilyMembers();
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

  const tableData = useMemo(() => {
    return familyMembers;
  }, [familyMembers]);

  const columnHelper = createColumnHelper<FamilyMember>();
  const columns = useMemo(() => {
    const cols: ColumnDef<FamilyMember, string | boolean | undefined>[] = [
      columnHelper.accessor("username", {
        header: "账号/昵称",
        cell: (info) => (
          <div className="flex items-center gap-2">
            {info.row.original.type === "child" ? "👶" : "👤"}
            {info.getValue()}
            {info.row.original.isMe && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">我</span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("identity", {
        header: "身份",
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("type", {
        header: "类型",
        cell: (info) => (info.getValue() === "child" ? "孩子" : "用户"),
      }),
      columnHelper.accessor("role", {
        header: "角色",
        cell: (info) => {
          const val = info.getValue();
          if (val === "admin") return "管理员";
          if (val === "parent") return "家长";
          if (val === "child") return "孩子";
          return "-";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "操作",
        cell: (info) => (
          <div className="flex justify-end gap-2">
            {info.row.original.type === "parent" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingMember(info.row.original);
                  setAccountForm({
                    username: info.row.original.username,
                    password: "",
                    role: info.row.original.role,
                    identity: info.row.original.identity || "",
                  });
                  setShowEditAccountModal(true);
                }}
                className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"
              >
                <Settings size={18} />
              </Button>
            )}
            {!info.row.original.isMe && info.row.original.type === "parent" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAccount(info.row.original.id)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
              >
                <Trash2 size={18} />
              </Button>
            )}
          </div>
        ),
      }),
    ];

    return cols;
  }, [handleDeleteAccount, columnHelper]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">家庭成员管理 </h2>
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
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-blue-50 text-blue-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="p-4 font-medium">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-blue-50 hover:bg-blue-50/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > limit && <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />}
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
          <div className="bg-blue-50 p-4 rounded-xl">
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
                variant="ghost"
                className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
              >
                <Copy size={20} />
              </Button>
            </div>
            <p className="text-xs text-blue-600 mt-2">其他用户可以使用此邀请码加入您的家庭。</p>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-bold text-gray-800 mb-4">邀请用户加入</h4>
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
            <p className="text-xs text-gray-500 mt-2">对方将直接加入您的家庭（前提是对方尚未加入任何家庭）。</p>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-bold text-gray-800 mb-4">加入其他家庭</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">输入邀请码</label>
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
              <p className="text-xs text-gray-500 text-center">
                注意：加入新家庭后，您将退出当前家庭，且需要重新登录。
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
