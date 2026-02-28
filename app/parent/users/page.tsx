"use client";

import { FamilyMember } from "@/app/typings";
import { Button, DataTable } from "@/components/ui";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import PasswordInput from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/context/AppContext";
import type { DataTableColumn } from "@/components/ui";
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
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    username: "",
    password: "",
    role: "parent",
    identity: "",
    nickname: "",
    gender: "none" as "boy" | "girl" | "none",
  });

  const fetchUsers = useCallback(async (pageNum: number = 1) => {
    if (!currentUser?.token) return;
    try {
      const data = await request("/api/user", {
        params: {
          page: pageNum,
          limit,
        },
      });
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
  }, [currentUser?.token, logout, limit]);

  useEffect(() => {
    if (!currentUser?.token) return;
    const timer = setTimeout(() => {
      void fetchUsers(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser?.token, fetchUsers, page]);

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
      fetchUsers(page);
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
      fetchUsers(page);
    } else {
      toast.error(data.message);
    }
  };

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      if (!currentUser?.token) return;
      const data = await request(`/api/user?id=${id}`, {
        method: "DELETE",
      });
      if (data.success) {
        toast.success("删除成功");
        setDeleteUserId(null);
        fetchUsers(page);
      } else {
        toast.error("删除失败");
      }
    },
    [currentUser?.token, fetchUsers, toast, page],
  );

  const columns = useMemo<DataTableColumn<FamilyMember>[]>(() => [
    {
      key: "username",
      title: "账号",
      render: (value, row) => {
        const gender = row.gender;
        const role = row.role;
        let icon = "👤";
        if (role === "child") {
          if (gender === "girl") icon = "👧";
          else icon = "👦";
        }
        return (
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="font-medium">{String(value ?? "-")}</span>
            {row.isMe && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">我</span>
            )}
          </div>
        );
      },
    },
    {
      key: "nickname",
      title: "昵称",
      render: (value) => (value == null || value === "" ? "-" : String(value)),
    },
    {
      key: "gender",
      title: "性别",
      render: (value) => {
        const val = value;
        if (val === "girl") return <span className="text-pink-500 font-bold">女</span>;
        return <span className="text-blue-500 font-bold">男</span>;
      },
    },
    {
      key: "type",
      title: "类型",
      render: (value) => (value === "child" ? "孩子" : "用户"),
    },
    {
      key: "role",
      title: "角色",
      render: (value) => {
        const val = value;
        if (val === "admin") return "管理员";
        if (val === "parent") return "家长";
        if (val === "child") return "孩子";
        return "-";
      },
    },
    {
      key: "createdAt",
      title: "创建日期",
      render: (value) => formatDate(String(value || "")),
    },
    {
      key: "updatedAt",
      title: "最后修改",
      render: (value) => formatDate(String(value || "")),
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
                  nickname: row.nickname || "",
                  gender: (row.gender as "boy" | "girl" | "none") || "none",
                });
                setShowEditAccountModal(true);
              }}
              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg border-none bg-transparent shadow-none"
            >
              <Settings size={18} />
            </Button>
          )}
          {!row.isMe && row.type === "parent" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteUserId(row.id)}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg border-none bg-transparent shadow-none"
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
    <>
      <Modal
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        title="删除账号"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteUserId(null)}>
              取消
            </Button>
            <Button
              variant="error"
              className="flex-1"
              onClick={() => deleteUserId && handleDeleteAccount(deleteUserId)}
            >
              确认删除
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">确定删除该账号吗？</p>
      </Modal>

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
    </>
  );
}
