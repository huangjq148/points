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
import { Plus, Search, Settings, Trash2, X, Trash, UserCog, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function UsersPageContent() {
  const { currentUser, logout } = useApp();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 从 URL 读取筛选状态
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 10;
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "all");
  const [genderFilter, setGenderFilter] = useState(searchParams.get("gender") || "all");
  
  // 批量操作状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showBatchRoleModal, setShowBatchRoleModal] = useState(false);
  const [batchRoleValue, setBatchRoleValue] = useState("parent");

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
  
  // 表单验证错误
  const [formErrors, setFormErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const fetchUsers = useCallback(async (pageNum: number = 1) => {
    if (!currentUser?.token) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pageNum,
        limit,
      };
      
      // 添加搜索和筛选参数
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (roleFilter && roleFilter !== "all") {
        params.role = roleFilter;
      }
      if (genderFilter && genderFilter !== "all") {
        params.gender = genderFilter;
      }
      
      const data = await request("/api/user", { params });
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
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token, logout, limit, searchQuery, roleFilter, genderFilter]);

  useEffect(() => {
    if (!currentUser?.token) return;
    const timer = setTimeout(() => {
      void fetchUsers(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser?.token, fetchUsers, page, searchQuery, roleFilter, genderFilter]);

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
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
      setFormErrors({});
    } else {
      toast.error(data.message);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingMember) return;
    if (!validateForm()) return;
    const data = await request("/api/user", {
      method: "PUT",
      body: { id: editingMember.id, ...accountForm },
    });
    if (data.success) {
      toast.success("更新成功");
      setShowEditAccountModal(false);
      fetchUsers(page);
      setFormErrors({});
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

  // 更新 URL 参数
  const updateQueryParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    const newQuery = params.toString();
    const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1); // 重置到第一页
    updateQueryParams({ search: value });
  }, [updateQueryParams]);

  // 处理角色筛选
  const handleRoleFilter = useCallback((value: string | number | undefined) => {
    const strValue = String(value || "all");
    setRoleFilter(strValue);
    setPage(1);
    updateQueryParams({ role: strValue });
  }, [updateQueryParams]);

  // 处理性别筛选
  const handleGenderFilter = useCallback((value: string | number | undefined) => {
    const strValue = String(value || "all");
    setGenderFilter(strValue);
    setPage(1);
    updateQueryParams({ gender: strValue });
  }, [updateQueryParams]);

  // 清除所有筛选
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setRoleFilter("all");
    setGenderFilter("all");
    setPage(1);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  // 处理行选择变化
  const handleRowSelectionChange = useCallback((keys: string[], rows: FamilyMember[]) => {
    setSelectedRowKeys(keys);
  }, []);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!currentUser?.token || selectedRowKeys.length === 0) return;
    
    let successCount = 0;
    let failCount = 0;
    
    for (const id of selectedRowKeys) {
      try {
        const data = await request(`/api/user?id=${id}`, {
          method: "DELETE",
        });
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`成功删除 ${successCount} 个用户`);
      setSelectedRowKeys([]);
      fetchUsers(page);
    }
    if (failCount > 0) {
      toast.error(`${failCount} 个用户删除失败`);
    }
    setShowBatchDeleteModal(false);
  }, [currentUser?.token, selectedRowKeys, fetchUsers, page, toast]);

  // 批量修改角色
  const handleBatchUpdateRole = useCallback(async () => {
    if (!currentUser?.token || selectedRowKeys.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedRowKeys) {
      try {
        const data = await request("/api/user", {
          method: "PUT",
          body: { id, role: batchRoleValue },
        });
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`成功修改 ${successCount} 个用户的角色`);
      setSelectedRowKeys([]);
      fetchUsers(page);
    }
    if (failCount > 0) {
      toast.error(`${failCount} 个用户角色修改失败`);
    }
    setShowBatchRoleModal(false);
  }, [currentUser?.token, selectedRowKeys, batchRoleValue, fetchUsers, page, toast]);

  // 表单验证
  const validateForm = useCallback(() => {
    const errors: { username?: string; password?: string } = {};

    if (!accountForm.username.trim()) {
      errors.username = "请输入账号";
    } else if (accountForm.username.length < 2) {
      errors.username = "账号至少需要 2 个字符";
    } else if (accountForm.username.length > 20) {
      errors.username = "账号最多 20 个字符";
    }

    // 只在创建时验证密码（编辑时密码可为空）
    if (showAddAccountModal) {
      if (!accountForm.password) {
        errors.password = "请输入密码";
      } else if (accountForm.password.length < 6) {
        errors.password = "密码至少需要 6 个字符";
      }
    } else if (accountForm.password && accountForm.password.length < 6) {
      errors.password = "密码至少需要 6 个字符";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [accountForm.username, accountForm.password, showAddAccountModal]);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    fetchUsers(page);
    toast.success("数据已刷新");
  }, [fetchUsers, page, toast]);

  const columns = useMemo<DataTableColumn<FamilyMember>[]>(() => [
    {
      key: "username",
      title: "账号",
      render: (value, row) => {
        const avatar = row.avatar || "👤";
        return (
          <div className="flex items-center gap-2">
            <span className="text-lg">{avatar}</span>
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
        if (val === "boy") return <span className="text-blue-500 font-bold">男</span>;
        return <span className="text-gray-400">未设置</span>;
      },
    },
    {
      key: "role",
      title: "角色",
      render: (value) => {
        const val = value;
        const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
          admin: { label: "管理员", color: "text-purple-700", bgColor: "bg-purple-100" },
          parent: { label: "家长", color: "text-blue-700", bgColor: "bg-blue-100" },
          child: { label: "孩子", color: "text-green-700", bgColor: "bg-green-100" },
        };
        const config = roleConfig[String(val)] || { label: String(val), color: "text-gray-700", bgColor: "bg-gray-100" };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "availablePoints",
      title: "可用积分",
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-amber-600">{row.availablePoints || 0} 分</span>
          {row.totalPoints && row.totalPoints > 0 && (
            <span className="text-xs text-gray-400">累计: {row.totalPoints} 分</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "创建日期",
      render: (value) => formatDate(String(value || "")),
    },
  ], []);

  const actionColumn = useMemo<DataTableColumn<FamilyMember>>(() => ({
      key: "actions",
      title: "操作",
      render: (_, row) => (
        <div className="flex justify-center gap-2">
          {row.role !== "child" && (
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
                setFormErrors({});
                setShowEditAccountModal(true);
              }}
              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg border-none bg-transparent shadow-none"
            >
              <Settings size={18} />
            </Button>
          )}
          {!row.isMe && row.role !== "child" && (
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

      {/* 批量删除确认 Modal */}
      <Modal
        isOpen={showBatchDeleteModal}
        onClose={() => setShowBatchDeleteModal(false)}
        title="批量删除用户"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setShowBatchDeleteModal(false)}>
              取消
            </Button>
            <Button
              variant="error"
              className="flex-1"
              onClick={handleBatchDelete}
            >
              确认删除 {selectedRowKeys.length} 个用户
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          确定要删除选中的 <span className="font-semibold text-red-600">{selectedRowKeys.length}</span> 个用户吗？此操作无法撤销。
        </p>
      </Modal>

      {/* 批量修改角色 Modal */}
      <Modal
        isOpen={showBatchRoleModal}
        onClose={() => setShowBatchRoleModal(false)}
        title="批量修改角色"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setShowBatchRoleModal(false)}>
              取消
            </Button>
            <Button
              className="flex-1"
              onClick={handleBatchUpdateRole}
            >
              确认修改
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            将选中的 <span className="font-semibold text-blue-600">{selectedRowKeys.length}</span> 个用户的角色修改为：
          </p>
          <Select
            value={batchRoleValue}
            onChange={(value) => setBatchRoleValue(String(value || "parent"))}
            options={[
              { value: "parent", label: "家长" },
              { value: "child", label: "孩子" },
              { value: "admin", label: "管理员" },
            ]}
            placeholder="选择角色"
          />
        </div>
      </Modal>

      <div className="space-y-6">
        {/* 搜索和筛选工具栏 - 一行显示 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 左侧：搜索和筛选 */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* 搜索框 */}
            <div className="relative" style={{ minWidth: '300px', width: '300px' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="搜索用户名或昵称..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 角色筛选 */}
            <div style={{ minWidth: '300px', width: '300px' }}>
              <Select
                value={roleFilter}
                onChange={handleRoleFilter}
                options={[
                  { value: "all", label: "全部角色" },
                  { value: "admin", label: "管理员" },
                  { value: "parent", label: "家长" },
                  { value: "child", label: "孩子" },
                ]}
                placeholder="筛选角色"
              />
            </div>

            {/* 性别筛选 */}
            <div style={{ minWidth: '300px', width: '300px' }}>
              <Select
                value={genderFilter}
                onChange={handleGenderFilter}
                options={[
                  { value: "all", label: "全部性别" },
                  { value: "boy", label: "男" },
                  { value: "girl", label: "女" },
                  { value: "none", label: "未设置" },
                ]}
                placeholder="筛选性别"
              />
            </div>

            {/* 清除筛选按钮 */}
            {(searchQuery || roleFilter !== "all" || genderFilter !== "all") && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap px-1"
              >
                清除
              </button>
            )}
          </div>

          {/* 右侧：刷新和添加用户按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
              title="刷新数据"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">刷新</span>
            </Button>
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
                setFormErrors({});
                setShowAddAccountModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <Plus size={16} /> <span className="hidden sm:inline">添加用户</span>
              <span className="sm:hidden">添加</span>
            </Button>
          </div>
        </div>

        {/* 结果统计 */}
        {(searchQuery || roleFilter !== "all" || genderFilter !== "all") && (
          <div className="text-sm text-gray-500">
            找到 <span className="font-medium text-gray-700">{total}</span> 个用户
            {searchQuery && <span>，搜索 &quot;{searchQuery}&quot;</span>}
          </div>
        )}

        {/* 批量操作工具栏 */}
        {selectedRowKeys.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="text-sm text-blue-800">
              已选择 <span className="font-semibold">{selectedRowKeys.length}</span> 个用户
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBatchRoleModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <UserCog size={16} />
                修改角色
              </button>
              <button
                onClick={() => setShowBatchDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash size={16} />
                批量删除
              </button>
              <button
                onClick={() => setSelectedRowKeys([])}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消选择
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          dataSource={familyMembers}
          actionColumn={actionColumn}
          fixedColumns={{ left: ["username"], right: ["actions"] }}
          pageOptions={pageOptions}
          minWidth={800}
          loading={loading}
          emptyText={searchQuery || roleFilter !== "all" || genderFilter !== "all" ? "没有找到匹配的用户" : "暂无用户数据"}
          rowSelection={{
            selectedRowKeys,
            onChange: handleRowSelectionChange,
            getRowKey: (row) => row.id,
          }}
        />
      </div>

      <Modal
        isOpen={showAddAccountModal}
        onClose={() => {
          setShowAddAccountModal(false);
          setFormErrors({});
        }}
        title="添加用户"
        footer={
          <Button onClick={handleCreateAccount} fullWidth className="mt-2">
            创建账号
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <Input
              label="账号 *"
              value={accountForm.username}
              onChange={(e) => {
                setAccountForm({ ...accountForm, username: e.target.value });
                if (formErrors.username) {
                  setFormErrors({ ...formErrors, username: undefined });
                }
              }}
              placeholder="请输入账号"
              className={formErrors.username ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {formErrors.username && (
              <p className="mt-1 text-sm text-red-500">{formErrors.username}</p>
            )}
          </div>
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
          <div>
            <PasswordInput
              label="密码 *"
              value={accountForm.password}
              onChange={(e) => {
                setAccountForm({ ...accountForm, password: e.target.value });
                if (formErrors.password) {
                  setFormErrors({ ...formErrors, password: undefined });
                }
              }}
              placeholder="请输入密码（默认 123456）"
              className={formErrors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
            )}
          </div>
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
        onClose={() => {
          setShowEditAccountModal(false);
          setFormErrors({});
        }}
        title="编辑账号"
        footer={
          <Button onClick={handleUpdateAccount} fullWidth className="mt-2">
            保存修改
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <Input
              label="账号 *"
              value={accountForm.username}
              onChange={(e) => {
                setAccountForm({ ...accountForm, username: e.target.value });
                if (formErrors.username) {
                  setFormErrors({ ...formErrors, username: undefined });
                }
              }}
              className={formErrors.username ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {formErrors.username && (
              <p className="mt-1 text-sm text-red-500">{formErrors.username}</p>
            )}
          </div>
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
          <div>
            <PasswordInput
              label="密码 (留空不修改)"
              value={accountForm.password}
              onChange={(e) => {
                setAccountForm({ ...accountForm, password: e.target.value });
                if (formErrors.password) {
                  setFormErrors({ ...formErrors, password: undefined });
                }
              }}
              placeholder="******"
              className={formErrors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
            )}
          </div>
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

// 包装组件以添加 Suspense
export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <UsersPageContent />
    </Suspense>
  );
}
