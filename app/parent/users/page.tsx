"use client";

import { FamilyMember } from "@/app/typings";
import Layout from "@/components/Layouts";
import { Button, DataTable } from "@/components/ui";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import PasswordInput from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/context/AppContext";
import { createColumnHelper } from "@tanstack/react-table";
import { formatDate } from "@/utils/date";
import request from "@/utils/request";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function UsersPage() {
  const { currentUser, logout } = useApp();
  const toast = useToast();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [accountForm, setAccountForm] = useState({
    username: "",
    password: "",
    role: "parent",
    identity: "",
    nickname: "",
    gender: "none" as "boy" | "girl" | "none",
  });

  const fetchUsers = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const data = await request("/api/user");
      if (data.success) {
        setFamilyMembers(data.users);
        if (data.total !== undefined) {
          setTotal(data.total);
        }
      } else {
        console.error("Fetch users failed:", data.message);
        if (data.message?.includes("User not found")) {
          logout();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser?.token, logout]);

  useEffect(() => {
    if (currentUser?.token) {
      fetchUsers();
    }
  }, [currentUser?.token, fetchUsers]);

  const handleCreateAccount = async () => {
    if (!accountForm.username || !accountForm.password) return toast.error("请输入完整信息");
    const payload = { ...accountForm };

    const data = await request("/api/user", {
      method: "POST",
      body: payload,
    });
    if (data.success) {
      toast.success("创建成功");
      setShowAddAccountModal(false);
      fetchUsers();
      setAccountForm({
        username: "",
        password: "",
        role: "parent",
        identity: "",
        nickname: "",
        gender: "none",
      });
    } else {
      toast.error(data.message);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingMember) return;
    const data = await request("/api/user", {
      method: "PUT",
      body: { id: editingMember.id, ...accountForm },
    });
    if (data.success) {
      toast.success("更新成功");
      setShowEditAccountModal(false);
      fetchUsers();
    } else {
      toast.error(data.message);
    }
  };

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      if (!confirm("确定删除该账号吗？")) return;
      if (!currentUser?.token) return;
      const data = await request(`/api/user?id=${id}`, {
        method: "DELETE",
      });
      if (data.success) {
        toast.success("删除成功");
        fetchUsers();
      } else {
        toast.error("删除失败");
      }
    },
    [currentUser?.token, fetchUsers, toast],
  );

  const columnHelper = createColumnHelper<FamilyMember>();

  const columns = useMemo(() => [
    columnHelper.accessor("username", {
      header: "账号",
      cell: (info) => {
        const gender = info.row.original.gender;
        const role = info.row.original.role;
        let icon = "👤";
        if (role === "child") {
          if (gender === "girl") icon = "👧";
          else icon = "👦";
        }
        return (
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="font-medium">{info.getValue()}</span>
            {info.row.original.isMe && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">我</span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("nickname", {
      header: "昵称",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("gender", {
      header: "性别",
      cell: (info) => {
        const val = info.getValue();
        if (val === "girl") return <span className="text-pink-500 font-bold">女</span>;
        return <span className="text-blue-500 font-bold">男</span>;
      },
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
    columnHelper.accessor("createdAt", {
      header: "创建日期",
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor("updatedAt", {
      header: "最后修改",
      cell: (info) => formatDate(info.getValue()),
    }),
  ], [columnHelper]);

  const actionColumn = useMemo(() =>
    columnHelper.display({
      id: "actions",
      header: "操作",
      cell: (info) => (
        <div className="flex justify-center gap-2">
          {info.row.original.type === "parent" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingMember(info.row.original);
                setAccountForm({
                  username: info.row.original.username,
                  password: "",
                  role: info.row.original.role,
                  identity: info.row.original.identity || "",
                  nickname: info.row.original.nickname || "",
                  gender: (info.row.original.gender as "boy" | "girl" | "none") || "none",
                });
                setShowEditAccountModal(true);
              }}
              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg border-none bg-transparent shadow-none"
            >
              <Settings size={18} />
            </Button>
          )}
          {!info.row.original.isMe && info.row.original.type === "parent" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDeleteAccount(info.row.original.id)}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg border-none bg-transparent shadow-none"
            >
              <Trash2 size={18} />
            </Button>
          )}
        </div>
      ),
    }), [columnHelper, handleDeleteAccount]);

  const pageOptions = useMemo(() => ({
    currentPage: page,
    total,
    pageSize: limit,
    onPageChange: setPage,
  }), [page, total, limit]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setAccountForm({
                  username: "",
                  password: "",
                  role: "parent",
                  identity: "",
                  nickname: "",
                  gender: "none",
                });
                setShowAddAccountModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus size={20} /> 添加用户
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          dataSource={familyMembers}
          actionColumn={actionColumn}
          pageOptions={pageOptions}
          minWidth={800}
        />
      </div>

      <Modal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        title="添加用户"
        footer={
          <Button onClick={handleCreateAccount} fullWidth className="mt-2">
            创建账号
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="账号"
            value={accountForm.username}
            onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
            placeholder="请输入账号"
          />
          <Input
            label="昵称"
            value={accountForm.nickname}
            onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })}
            placeholder="请输入昵称"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <Select
              value={accountForm.gender}
              onChange={(value) =>
                setAccountForm({ ...accountForm, gender: (value as "boy" | "girl" | "none") || "none" })
              }
              options={[
                { value: "none", label: "未设置" },
                { value: "boy", label: "男" },
                { value: "girl", label: "女" },
              ]}
              placeholder="选择性别"
            />
          </div>
          <PasswordInput
            label="密码 (默认123456)"
            value={accountForm.password}
            onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
            placeholder="请输入密码"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <Select
              value={accountForm.role}
              onChange={(value) => setAccountForm({ ...accountForm, role: (value as string) || "parent" })}
              options={[
                { value: "parent", label: "家长" },
                { value: "child", label: "孩子" },
                { value: "admin", label: "管理员" },
              ]}
              placeholder="选择角色"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditAccountModal}
        onClose={() => setShowEditAccountModal(false)}
        title="编辑账号"
        footer={
          <Button onClick={handleUpdateAccount} fullWidth className="mt-2">
            保存修改
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="账号"
            value={accountForm.username}
            onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
          />
          <Input
            label="昵称"
            value={accountForm.nickname}
            onChange={(e) => setAccountForm({ ...accountForm, nickname: e.target.value })}
            placeholder="请输入昵称"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <Select
              value={accountForm.gender}
              onChange={(value) =>
                setAccountForm({ ...accountForm, gender: (value as "boy" | "girl" | "none") || "none" })
              }
              options={[
                { value: "none", label: "未设置" },
                { value: "boy", label: "男" },
                { value: "girl", label: "女" },
              ]}
              placeholder="选择性别"
            />
          </div>
          <PasswordInput
            label="密码 (留空不修改)"
            value={accountForm.password}
            onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
            placeholder="******"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <Select
              value={accountForm.role}
              onChange={(value) => setAccountForm({ ...accountForm, role: (value as string) || "parent" })}
              options={[
                { value: "parent", label: "家长" },
                { value: "child", label: "孩子" },
                { value: "admin", label: "管理员" },
              ]}
              placeholder="选择角色"
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
