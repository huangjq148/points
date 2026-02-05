"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import { ColumnDef, createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  Copy,
  FileText,
  Gift,
  Home,
  LogOut,
  Plus,
  Settings,
  Star,
  Ticket,
  Trash2,
  UserCog,
  Users,
  X
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import AlertModal from "./AlertModal";

interface SelectOption {
  value: string | number;
  label: string;
}

interface PlainTask {
  _id: string;
  userId: string;
  childId: string;
  name: string;
  description: string;
  points: number;
  type: "daily" | "advanced" | "challenge";
  icon: string;
  requirePhoto: boolean;
  status: "pending" | "submitted" | "approved" | "rejected";
  photoUrl?: string;
  imageUrl?: string;
  submittedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlainOrder {
  _id: string;
  userId: string;
  childId: string;
  rewardId: string;
  rewardName: string;
  rewardIcon?: string;
  pointsSpent: number;
  status: "pending" | "verified" | "cancelled";
  verificationCode: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface FamilyMember {
  id: string;
  username: string;
  role: string;
  type: string;
  isMe: boolean;
  phone?: string;
  identity?: string;
}

interface IDisplayedTask extends PlainTask {
  childName: string;
  childAvatar?: string;
}

interface IDisplayedOrder extends PlainOrder {
  rewardName: string;
  rewardIcon?: string;
  childName: string;
  childAvatar: string;
}

interface ChildStats {
  pendingTasks: number;
  submittedTasks: number;
  pendingOrders: number;
}

export default function ParentDashboard() {
  const { currentUser, childList, logout, switchToChild, addChild } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = (() => {
    const pathSegments = pathname.split("/");
    const currentTab = pathSegments[pathSegments.length - 1];
    if (["home", "tasks", "rewards", "audit", "orders", "family", "users"].includes(currentTab)) {
      return currentTab as "home" | "tasks" | "rewards" | "audit" | "orders" | "family" | "users";
    }
    return "home"; // Default to home if path is not recognized
  })();
  const [activeTab, setActiveTab] = useState<"home" | "tasks" | "rewards" | "audit" | "orders" | "family" | "users">(
    initialTab,
  );

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });
  const showAlert = (message: string, type: "success" | "error" | "info" = "info") => {
    setAlertState({ isOpen: true, message, type });
  };

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [accountForm, setAccountForm] = useState({ username: "", password: "", role: "parent", identity: "" });

  const fetchFamilyMembers = useCallback(() => {
    if (!currentUser) return;
    fetch(`/api/family/members?userId=${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFamilyMembers(data.members);
        } else {
          console.error("Fetch members failed:", data.message);
          if (data.message?.includes("User not found")) {
            logout();
          }
        }
      })
      .catch((e) => console.error(e));
  }, [currentUser, logout]);

  useEffect(() => {
    if ((activeTab === "family" || activeTab === "users") && currentUser) {
      fetchFamilyMembers();
    }
  }, [activeTab, currentUser]);

  const handleJoinFamily = async () => {
    if (!inviteCodeInput) return;
    if (!currentUser) return;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          pin: currentUser.pin,
          action: "join-family",
          inviteCode: inviteCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert("加入成功！请重新登录以刷新数据", "success");
        setTimeout(logout, 2000);
      } else {
        showAlert(data.message, "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("加入失败", "error");
    }
  };

  const handleCreateAccount = async () => {
    if (!accountForm.username || !accountForm.password) return showAlert("请输入完整信息", "error");
    // "添加用户时，不应当自动加入当前家庭" -> Remove familyId
    const payload = { ...accountForm };
    // If it's a child account (which is not handled here, this is for parents/users), we might want to keep familyId?
    // The user said "Add User", which implies the "Users" tab.
    // If activeTab is 'family', maybe we DO want to add to family?
    // "添加用户时，不应当自动加入当前家庭" implies specifically the generic user creation.
    // But in `handleCreateAccount`, we are using `accountForm`.
    // Let's remove familyId from the payload.

    const res = await fetch("/api/family/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showAlert("创建成功", "success");
      setShowAddAccountModal(false);
      fetchFamilyMembers();
      setAccountForm({ username: "", password: "", role: "parent", identity: "" });
    } else {
      showAlert(data.message, "error");
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingMember) return;
    const res = await fetch("/api/family/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingMember.id, ...accountForm }),
    });
    const data = await res.json();
    if (data.success) {
      showAlert("更新成功", "success");
      setShowEditAccountModal(false);
      fetchFamilyMembers();
    } else {
      showAlert(data.message, "error");
    }
  };

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      if (!confirm("确定删除该账号吗？")) return;
      const res = await fetch(`/api/family/members?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showAlert("删除成功", "success");
        fetchFamilyMembers();
      } else {
        showAlert("删除失败", "error");
      }
    },
    [fetchFamilyMembers],
  );

  const columnHelper = createColumnHelper<FamilyMember>();

  const columns = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<FamilyMember, any>[] = [
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
    ];

    if (activeTab !== "users") {
      cols.push(
        columnHelper.accessor("identity", {
          header: "身份",
          cell: (info) => info.getValue() || "-",
        }),
      );
    }

    cols.push(
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
    );

    return cols;
  }, [handleDeleteAccount, activeTab]);

  const tableData = useMemo(() => {
    return activeTab === "users" ? familyMembers.filter((m) => m.type === "parent") : familyMembers;
  }, [activeTab, familyMembers]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Duplicate removed

  type NavItemId = "home" | "audit" | "tasks" | "orders" | "rewards";

  const navItems: { id: NavItemId; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "home", icon: Home, label: "首页" },
    { id: "audit", icon: FileText, label: "审核" },
    { id: "tasks", icon: Star, label: "任务" },
    { id: "orders", icon: Ticket, label: "核销" },
    { id: "rewards", icon: Gift, label: "商城" },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">🌟</div>
          <div className="logo-title">小小奋斗者</div>
          <div className="logo-subtitle">家长管理后台</div>
        </div>

        <div className="user-info">
          <div className="user-avatar">👨‍👩‍👧</div>
          <div>
            <div className="user-name">家长</div>
            <div className="user-role">管理员</div>
          </div>
        </div>

        <div className="desktop-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                router.push(`/parent/${item.id}`);
              }}
              className={`desktop-nav-item ${activeTab === item.id ? "active" : ""}`}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && <span className="badge">{item.badge}</span>}
            </div>
          ))}
          <div
            onClick={() => setActiveTab("users")}
            className={`desktop-nav-item ${activeTab === "users" ? "active" : ""}`}
          >
            <UserCog size={22} />
            <span>用户管理</span>
          </div>
          <div
            onClick={() => setActiveTab("family")}
            className={`desktop-nav-item ${activeTab === "family" ? "active" : ""}`}
          >
            <Users size={22} />
            <span>家庭管理</span>
          </div>
        </div>

        <div className="mt-auto">
          <div
            onClick={() => {
              if (confirm("确定要退出登录吗？")) {
                logout();
              }
            }}
            className="desktop-nav-item text-red-600"
          >
            <LogOut size={22} />
            <span>退出登录</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-lg px-4 py-3 flex items-center justify-between sticky top-0 z-40 rounded-2xl m-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌟</span>
            <span className="font-bold text-blue-600">小小奋斗者</span>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 ">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  👤
                </div>
                <span className="text-sm font-medium text-gray-700">{currentUser?.username || "家长"}</span>
              </div>
            </div>
            <Button onClick={logout} variant="ghost" className="p-2 hover:bg-gray-100 rounded-xl text-gray-600">
              <LogOut size={20} />
            </Button>
          </div>
        </header>

        {(activeTab === "family" || activeTab === "users") && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {activeTab === "family" ? "家庭成员管理" : "用户管理"}
              </h2>
              <div className="flex gap-2">
                {activeTab === "family" && (
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    variant="success"
                    className="flex items-center gap-2"
                  >
                    <Users size={20} /> 邀请家长
                  </Button>
                )}
                {activeTab === "users" && (
                  <Button
                    onClick={() => {
                      setAccountForm({ username: "", password: "", role: "parent", identity: "" });
                      setShowAddAccountModal(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus size={20} /> 添加用户
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
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAddAccountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">添加用户</h3>
            <div className="space-y-4">
              <Input
                label="账号"
                value={accountForm.username}
                onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                placeholder="请输入账号"
              />
              <Input
                label="密码 (默认123456)"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                placeholder="请输入密码"
              />
              {activeTab !== "users" && (
                <Input
                  label="身份 (例如: 爸爸)"
                  value={accountForm.identity}
                  onChange={(e) => setAccountForm({ ...accountForm, identity: e.target.value })}
                  placeholder="请输入身份标识"
                />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <Select
                  value={{
                    value: accountForm.role,
                    label:
                      accountForm.role === "parent"
                        ? "家长"
                        : accountForm.role === "child"
                          ? "孩子"
                          : accountForm.role === "admin"
                            ? "管理员"
                            : "未知",
                  }}
                  onChange={(option) =>
                    setAccountForm({ ...accountForm, role: (option as SelectOption).value as string })
                  }
                  options={[
                    { value: "parent", label: "家长" },
                    { value: "child", label: "孩子" },
                    { value: "admin", label: "管理员" },
                  ]}
                  placeholder="选择角色"
                />
              </div>
              <Button onClick={handleCreateAccount} fullWidth className="mt-2">
                创建账号
              </Button>
            </div>
            <Button
              onClick={() => setShowAddAccountModal(false)}
              variant="ghost"
              className="absolute top-4 right-4 text-gray-400 p-1"
            >
              <X size={24} />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditAccountModal && (
        <div className="modal-overlay" onClick={() => setShowEditAccountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">编辑账号</h3>
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
              {activeTab !== "users" && (
                <Input
                  label="身份"
                  value={accountForm.identity}
                  onChange={(e) => setAccountForm({ ...accountForm, identity: e.target.value })}
                  placeholder="请输入身份标识"
                />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <Select
                  value={{
                    value: accountForm.role,
                    label:
                      accountForm.role === "parent"
                        ? "家长"
                        : accountForm.role === "child"
                          ? "孩子"
                          : accountForm.role === "admin"
                            ? "管理员"
                            : "未知",
                  }}
                  onChange={(option) =>
                    setAccountForm({ ...accountForm, role: (option as SelectOption).value as string })
                  }
                  options={[
                    { value: "parent", label: "家长" },
                    { value: "children", label: "孩子" },
                    { value: "admin", label: "管理员" },
                  ]}
                  placeholder="选择角色"
                />
              </div>
              <Button onClick={handleUpdateAccount} fullWidth className="mt-2">
                保存修改
              </Button>
            </div>
            <Button
              onClick={() => setShowEditAccountModal(false)}
              variant="ghost"
              className="absolute top-4 right-4 text-gray-400 p-1"
            >
              <X size={24} />
            </Button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">邀请与加入</h3>
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="ghost"
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={24} />
              </Button>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl mb-6">
              <p className="text-sm text-blue-800 font-medium mb-1">您的家庭邀请码</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-mono font-bold text-blue-600">
                  {currentUser?.inviteCode || "Loading..."}
                </code>
                <Button
                  onClick={() => {
                    if (currentUser?.inviteCode) {
                      navigator.clipboard.writeText(currentUser.inviteCode);
                      showAlert("复制成功", "success");
                    }
                  }}
                  variant="ghost"
                  className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                >
                  <Copy size={20} />
                </Button>
              </div>
              <p className="text-xs text-blue-600 mt-2">其他家长可以使用此邀请码加入您的家庭，共同管理孩子。</p>
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
        </div>
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Mobile Bottom Nav */}
      <nav className="nav-bar">
        {navItems.map((item) => (
          <Button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id as "home" | "tasks" | "rewards" | "audit" | "orders");
              router.push(`/parent/${item.id}`);
            }}
            variant="ghost"
            className={`nav-item ${activeTab === item.id ? "active" : ""} flex-col h-auto p-2`}
          >
            <item.icon size={24} />
            <span className="text-xs">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && <span className="badge">{item.badge}</span>}
          </Button>
        ))}
      </nav>
    </div>
  );
}
