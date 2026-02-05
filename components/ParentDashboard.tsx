"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp, ChildProfile } from "@/context/AppContext";
import Image from "next/image";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, ColumnDef } from "@tanstack/react-table";
import {
  Home,
  Users,
  UserCog,
  Gift,
  FileText,
  Plus,
  Check,
  X,
  Clock,
  Star,
  ChevronRight,
  Settings,
  LogOut,
  Ticket,
  Camera,
  Copy,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { zhCN } from "date-fns/locale";
import Select, { StylesConfig, SingleValue, ActionMeta } from "react-select";
import AlertModal from "./AlertModal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmModal from "./ConfirmModal";

interface SelectOption {
  value: string | number;
  label: string;
}

const customSelectStyles: StylesConfig = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(8px)",
    borderColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: "16px",
    padding: "4px",
    boxShadow: "none",
    "&:hover": {
      borderColor: "rgba(59, 130, 246, 0.5)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(16px)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: "0 10px 40px rgba(59, 130, 246, 0.15)",
    overflow: "hidden",
    zIndex: 100,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "rgba(59, 130, 246, 0.1)"
      : state.isFocused
        ? "rgba(59, 130, 246, 0.05)"
        : "transparent",
    color: state.isSelected ? "#2563eb" : "#1e3a5f",
    cursor: "pointer",
  }),
};

interface PlainReward {
  _id: string;
  userId: string;
  name: string;
  description: string;
  points: number;
  type: "physical" | "privilege";
  icon: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  const [tasks, setTasks] = useState<IDisplayedTask[]>([]);
  const [rewards, setRewards] = useState<PlainReward[]>([]);
  const [orders, setOrders] = useState<IDisplayedOrder[]>([]);
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>("all");
  const [childStats, setChildStats] = useState<Record<string, ChildStats>>({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newTask, setNewTask] = useState({
    name: "",
    points: 5,
    icon: "⭐",
    type: "daily",
    requirePhoto: false,
    selectedChildren: [] as string[],
    imageUrl: "",
    recurrence: "none" as "none" | "daily" | "weekly" | "monthly",
    recurrenceDay: undefined as number | undefined,
    deadline: null as Date | null,
  });
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null);
  const [taskPhotoPreview, setTaskPhotoPreview] = useState<string>("");

  // Task Edit/Delete States
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PlainTask | null>(null);
  const [editingTaskData, setEditingTaskData] = useState({
    name: "",
    points: 0,
    icon: "",
    type: "daily" as "daily" | "advanced" | "challenge",
    requirePhoto: false,
    imageUrl: "",
    deadline: null as Date | null,
  });
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

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

  const [activeTaskFilter, setActiveTaskFilter] = useState<"all" | "completed" | "uncompleted">("all");
  const [selectedChildTaskFilter, setSelectedChildTaskFilter] = useState<string>("all");

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

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?userId=${currentUser?.id}`);
    const data: { success: boolean; tasks: PlainTask[] } = await res.json();
    if (data.success) {
      const tasksWithNames: IDisplayedTask[] = await Promise.all(
        data.tasks.map(async (task: PlainTask) => {
          const childRes = await fetch(`/api/children?childId=${task.childId}`);
          const childData: { success: boolean; child: { nickname: string; avatar: string } } = await childRes.json();
          return {
            ...task,
            childName: childData.child?.nickname || "未知",
            childAvatar: childData.child?.avatar || "👶",
          };
        }),
      );

      // Sort: Pending tasks at the end
      tasksWithNames.sort((a, b) => {
        // Priority 1: Pending last
        const isAPending = a.status === "pending";
        const isBPending = b.status === "pending";
        if (isAPending && !isBPending) return 1;
        if (!isAPending && isBPending) return -1;

        // Priority 2: Approved first
        const isACompleted = a.status === "approved";
        const isBCompleted = b.status === "approved";
        if (isACompleted && !isBCompleted) return -1;
        if (!isACompleted && isBCompleted) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return tasksWithNames;
    }
    return [];
  }, [currentUser?.id]);

  const fetchRewards = useCallback(async () => {
    const res = await fetch(`/api/rewards?userId=${currentUser?.id}&t=${Date.now()}`);
    const data: { success: boolean; rewards: PlainReward[] } = await res.json();
    if (data.success) {
      return data.rewards;
    }
    return [];
  }, [currentUser?.id]);

  const fetchOrders = async () => {
    const res = await fetch(`/api/orders?userId=${currentUser?.id}`);
    const data: { success: boolean; orders: PlainOrder[] } = await res.json();
    if (data.success) {
      const ordersWithNames: IDisplayedOrder[] = await Promise.all(
        data.orders.map(async (order: PlainOrder) => {
          const childRes = await fetch(`/api/children?childId=${order.childId}`);
          const childData: { success: boolean; child: { nickname: string; avatar: string } } = await childRes.json();
          return {
            ...order,
            childName: childData.child?.nickname || "未知",
            childAvatar: childData.child?.avatar || "👶",
          };
        }),
      );
      return ordersWithNames;
    }
    return [];
  };

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        const fetchedTasks = await fetchTasks();
        setTasks(fetchedTasks);
        const fetchedRewards = await fetchRewards();
        setRewards(fetchedRewards);
        const fetchedOrders = await fetchOrders();
        setOrders(fetchedOrders);
      }
    };
    loadData();
  }, [currentUser]);

  const handleApproveTask = async (taskId: string, status: "approved" | "rejected", rejectionReason?: string) => {
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status, rejectionReason }),
    });
    const updatedTasks = await fetchTasks();
    setTasks(updatedTasks);
  };

  const handleVerifyOrder = async (orderId: string) => {
    await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action: "verify" }),
    });
    const updatedOrders = await fetchOrders();
    setOrders(updatedOrders);
  };

  const handleCancelOrder = async (orderId: string) => {
    await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action: "cancel" }),
    });
    const updatedOrders = await fetchOrders();
    setOrders(updatedOrders);
  };

  const handleTaskPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTaskPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTaskPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTask = async () => {
    if (!currentUser?.id) {
      showAlert("请先登录", "error");
      return;
    }
    if (newTask.selectedChildren.length === 0) {
      showAlert("请选择至少一个孩子", "error");
      return;
    }
    if (!newTask.name.trim()) {
      showAlert("请输入任务名称", "error");
      return;
    }

    let uploadedImageUrl = "";
    if (taskPhotoFile) {
      const formData = new FormData();
      formData.append("file", taskPhotoFile);
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedImageUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    for (const childId of newTask.selectedChildren) {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTask,
          userId: currentUser.id,
          childId,
          imageUrl: uploadedImageUrl,
        }),
      });

      if (!res.ok) {
        showAlert("添加失败", "error");
        return;
      }
    }

    setShowAddTask(false);
    setNewTask({
      name: "",
      points: 5,
      icon: "⭐",
      type: "daily",
      requirePhoto: false,
      selectedChildren: [],
      imageUrl: "",
      recurrence: "none",
      recurrenceDay: undefined,
      deadline: null,
    });
    setTaskPhotoFile(null);
    setTaskPhotoPreview("");
    const updatedTasks = await fetchTasks();
    setTasks(updatedTasks);
  };

  const handleEditTask = (task: PlainTask) => {
    setEditingTask(task);
    setEditingTaskData({
      name: task.name,
      points: task.points,
      icon: task.icon,
      type: task.type,
      requirePhoto: task.requirePhoto,
      imageUrl: task.imageUrl || "",
      deadline: task.deadline ? new Date(task.deadline) : null,
    });
    setTaskPhotoFile(null);
    setTaskPhotoPreview(task.imageUrl || "");
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    let uploadedImageUrl = editingTaskData.imageUrl;
    if (taskPhotoFile) {
      const formData = new FormData();
      formData.append("file", taskPhotoFile);
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedImageUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: editingTask._id,
          ...editingTaskData,
          imageUrl: uploadedImageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showAlert("任务更新成功", "success");
        setShowEditTaskModal(false);
        setEditingTask(null);
        const updatedTasks = await fetchTasks();
        setTasks(updatedTasks);
      } else {
        showAlert(data.message || "更新失败", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("更新失败", "error");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      const res = await fetch(`/api/tasks?taskId=${taskToDelete}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showAlert("任务删除成功", "success");
        setTaskToDelete(null);
        const updatedTasks = await fetchTasks();
        setTasks(updatedTasks);
      } else {
        showAlert(data.message, "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("删除失败", "error");
    }
  };

  // Duplicate removed

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
      const res = await fetch("/api/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: editingReward._id,
          ...editingRewardData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert("奖励更新成功", "success");
        setShowEditRewardModal(false);
        setEditingReward(null);
        fetchRewards();
      } else {
        showAlert(data.message, "error");
      }
    } catch (e) {
      showAlert("更新失败", "error");
    }
  };

  const handleToggleRewardStatus = async (reward: PlainReward) => {
    try {
      const res = await fetch("/api/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: reward._id,
          isActive: !reward.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert(reward.isActive ? "奖励已下架" : "奖励已上架", "success");
        const updatedRewards = await fetchRewards();
        setRewards(updatedRewards);
      } else {
        showAlert(data.message, "error");
      }
    } catch (e) {
      showAlert("操作失败", "error");
    }
  };

  const handleDeleteReward = async () => {
    if (!rewardToDelete) return;
    try {
      const res = await fetch(`/api/rewards?rewardId=${rewardToDelete}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showAlert("奖励删除成功", "success");
        setRewardToDelete(null);
        fetchRewards();
      } else {
        showAlert(data.message, "error");
      }
    } catch (e) {
      showAlert("删除失败", "error");
    }
  };

  const handleAddReward = async () => {
    if (!currentUser?.id) {
      showAlert("请先登录", "error");
      return;
    }

    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newReward, userId: currentUser.id }),
    });

    const data = await res.json();
    if (data.success) {
      setShowAddReward(false);
      setNewReward({ name: "", points: 50, type: "physical", icon: "🎁", stock: 10 });
      const updatedRewards = await fetchRewards();
      setRewards(updatedRewards);
    } else {
      showAlert("添加失败: " + data.message, "error");
    }
  };

  const toggleChild = (childId: string) => {
    setNewTask((prev) => ({
      ...prev,
      selectedChildren: prev.selectedChildren.includes(childId)
        ? prev.selectedChildren.filter((id) => id !== childId)
        : [...prev.selectedChildren, childId],
    }));
  };

  // 计算每个孩子的统计
  useEffect(() => {
    const calculateChildStats = () => {
      const stats: Record<string, ChildStats> = {};
      childList.forEach((child) => {
        stats[child.id] = {
          pendingTasks: tasks.filter((t) => t.childId === child.id && t.status === "pending").length,
          submittedTasks: tasks.filter((t) => t.childId === child.id && t.status === "submitted").length,
          pendingOrders: orders.filter((o) => o.childId === child.id && o.status === "pending").length,
        };
      });
      setChildStats(stats);
    };
    calculateChildStats();
  }, [tasks, orders, childList]);

  type NavItemId = "home" | "audit" | "tasks" | "orders" | "rewards";

  const pendingTasks =
    selectedChildFilter === "all"
      ? tasks.filter((t) => t.status === "submitted")
      : tasks.filter((t) => t.status === "submitted" && t.childId.toString() === selectedChildFilter);
  const pendingOrders =
    selectedChildFilter === "all"
      ? orders.filter((o) => o.status === "pending")
      : orders.filter((o) => o.status === "pending" && o.childId.toString() === selectedChildFilter);

  const navItems: { id: NavItemId; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "home", icon: Home, label: "首页" },
    { id: "audit", icon: FileText, label: "审核", badge: pendingTasks.length },
    { id: "tasks", icon: Star, label: "任务" },
    { id: "orders", icon: Ticket, label: "核销", badge: pendingOrders.length },
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

        {activeTab === "home" && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div
                className="card cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => {
                  setActiveTab("audit");
                  router.push("/parent/audit");
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-yellow-200/80 backdrop-blur rounded-xl flex items-center justify-center">
                    <Clock size={24} className="text-yellow-600" />
                  </div>
                  <span className="text-sm text-gray-600">待审核</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {tasks.filter((t) => t.status === "submitted").length}
                </p>
              </div>
              <div
                className="card cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => {
                  setActiveTab("orders");
                  router.push("/parent/orders");
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-200/80 backdrop-blur rounded-xl flex items-center justify-center">
                    <Check size={24} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">待核销</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {orders.filter((o) => o.status === "pending").length}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">孩子档案</h2>
              <div className="flex flex-col gap-3">
                {childList.map((child: ChildProfile) => {
                  const stats = childStats[child.id] || { pendingTasks: 0, submittedTasks: 0, pendingOrders: 0 };
                  return (
                    <div
                      key={child.id as string}
                      onClick={() => switchToChild(child)}
                      className="card flex items-center gap-4 cursor-pointer hover:bg-white/90 transition"
                    >
                      <div className="text-3xl">{child.avatar}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{child.nickname}</p>
                        <p className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                          <span>积分: {child.availablePoints}</span>
                          <span
                            className="text-orange-500 cursor-pointer hover:underline bg-orange-50 px-2 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab("tasks");
                              setSelectedChildTaskFilter(child.id);
                              setActiveTaskFilter("uncompleted");
                            }}
                          >
                            待完成: {stats.pendingTasks}
                          </span>
                          <span
                            className="text-blue-500 cursor-pointer hover:underline bg-blue-50 px-2 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab("audit");
                              setSelectedChildFilter(child.id);
                            }}
                          >
                            待审核: {stats.submittedTasks}
                          </span>
                          <span
                            className="text-green-500 cursor-pointer hover:underline bg-green-50 px-2 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab("orders");
                              setSelectedChildFilter(child.id);
                            }}
                          >
                            待核销: {stats.pendingOrders}
                          </span>
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  );
                })}
                {childList.length === 0 && (
                  <div className="card text-center py-8">
                    <Users size={48} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500 mb-4">还没有孩子档案</p>
                    <Button
                      onClick={() => {
                        const nickname = prompt("请输入孩子昵称");
                        if (nickname) {
                          addChild(nickname.trim());
                        }
                      }}
                    >
                      添加孩子
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "audit" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">任务审核</h2>
              <select
                value={selectedChildFilter}
                onChange={(e) => setSelectedChildFilter(e.target.value)}
                className="input-field w-auto px-4 py-2"
              >
                <option value="all">全部孩子</option>
                {childList.map((child) => (
                  <option key={child.id as string} value={child.id as string}>
                    {child.nickname}
                  </option>
                ))}
              </select>
            </div>
            {pendingTasks.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <Check size={48} className="mx-auto mb-2 opacity-50" />
                <p>暂无待审核任务</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <div key={task._id.toString()} className="card">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="text-4xl">{task.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{task.name}</span>
                          <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            {task.childAvatar} {task.childName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">+{task.points} 积分</p>
                        <p className="text-xs text-gray-400">
                          提交时间: {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : "-"}
                        </p>
                        {task.photoUrl && (
                          <Image
                            src={task.photoUrl}
                            alt="任务照片"
                            width={200}
                            height={200}
                            className="mt-2 rounded-lg max-h-48 object-cover"
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveTask(task._id, "rejected")}
                          variant="ghost"
                          className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition"
                          title="驳回"
                        >
                          <X size={20} />
                        </Button>
                        <Button
                          onClick={() => handleApproveTask(task._id, "approved")}
                          variant="ghost"
                          className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition"
                          title="通过"
                        >
                          <Check size={20} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "orders" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">兑换核销</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedChildFilter}
                  onChange={(e) => setSelectedChildFilter(e.target.value)}
                  className="input-field w-auto px-4 py-2"
                >
                  <option value="all">全部孩子</option>
                  {childList.map((child) => (
                    <option key={child.id.toString()} value={child.id.toString()}>
                      {child.nickname}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">{pendingOrders.length} 个待核销</span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <Ticket size={48} className="mx-auto mb-2 opacity-50" />
                <p>暂无兑换记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order._id.toString()} className="order-card">
                    <div className="order-header">
                      <div className="order-reward">
                        <div className="order-reward-icon">{order.rewardIcon || "🎁"}</div>
                        <div>
                          <div className="order-reward-name">{order.rewardName}</div>
                          <div className="order-reward-points">🪙 {order.pointsSpent}</div>
                        </div>
                      </div>
                      <span
                        className={`status-badge ${
                          order.status === "pending"
                            ? "status-submitted"
                            : order.status === "verified"
                              ? "status-verified"
                              : "status-rejected"
                        }`}
                      >
                        {order.status === "pending" ? "待核销" : order.status === "verified" ? "已核销" : "已取消"}
                      </span>
                    </div>
                    <div className="order-info">
                      <div className="order-child">
                        <span>{order.childAvatar}</span>
                        <span>{order.childName}</span>
                      </div>
                      <div className="order-code">{order.verificationCode}</div>
                    </div>
                    {order.status === "pending" && (
                      <div className="order-actions">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleVerifyOrder(order._id)}
                          className="order-btn order-btn-verify"
                        >
                          ✅ 确认核销
                        </Button>
                        <Button
                          size="sm"
                          variant="error"
                          onClick={() => {
                            if (confirm("确定取消这个兑换吗？积分将退还给孩子")) {
                              handleCancelOrder(order._id);
                            }
                          }}
                          className="order-btn order-btn-cancel"
                        >
                          ❌ 取消
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "tasks" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">任务管理</h2>
              <div className="flex gap-2">
                <div className="w-40">
                  <Select
                    value={{
                      value: selectedChildTaskFilter,
                      label:
                        selectedChildTaskFilter === "all"
                          ? "全部孩子"
                          : childList.find((c) => c.id === selectedChildTaskFilter)?.nickname || "未知",
                    }}
                    onChange={(option: unknown) =>
                      setSelectedChildTaskFilter(((option as SelectOption)?.value as string) || "all")
                    }
                    options={[
                      { value: "all", label: "全部孩子" },
                      ...childList.map((child) => ({ value: child.id, label: child.nickname })),
                    ]}
                    styles={customSelectStyles}
                  />
                </div>
                <Button onClick={() => setShowAddTask(true)} className="flex items-center gap-2">
                  <Plus size={18} /> 添加任务
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
              {(["all", "uncompleted", "completed"] as const).map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTaskFilter(tab)}
                  variant="ghost"
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                    activeTaskFilter === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "all" ? "全部" : tab === "uncompleted" ? "未完成" : "已完成"}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {tasks
                .filter((task) => {
                  if (selectedChildTaskFilter !== "all" && task.childId.toString() !== selectedChildTaskFilter)
                    return false;
                  if (activeTaskFilter === "completed") return task.status === "approved";
                  if (activeTaskFilter === "uncompleted")
                    return ["pending", "submitted", "rejected"].includes(task.status);
                  return true;
                })
                .map((task) => (
                  <div key={task._id} className="card flex items-center gap-4 group">
                    <div className="text-2xl">{task.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{task.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {task.childName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">+{task.points} 积分</p>
                    </div>
                    <span
                      className={`status-badge ${
                        task.status === "approved"
                          ? "status-approved"
                          : task.status === "submitted"
                            ? "status-submitted"
                            : task.status === "rejected"
                              ? "status-rejected"
                              : "status-pending"
                      }`}
                    >
                      {task.status === "approved"
                        ? "已完成"
                        : task.status === "submitted"
                          ? "待审核"
                          : task.status === "rejected"
                            ? "已驳回"
                            : "待完成"}
                    </span>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => handleEditTask(task)}
                        variant="ghost"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="编辑"
                      >
                        <Edit2 size={18} />
                      </Button>
                      <Button
                        onClick={() => setTaskToDelete(task._id)}
                        variant="ghost"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
              {tasks.filter((task) => {
                if (selectedChildTaskFilter !== "all" && task.childId.toString() !== selectedChildTaskFilter)
                  return false;
                if (activeTaskFilter === "completed") return task.status === "approved";
                if (activeTaskFilter === "uncompleted")
                  return ["pending", "submitted", "rejected"].includes(task.status);
                return true;
              }).length === 0 && <div className="text-center py-12 text-gray-400">暂无任务</div>}
            </div>
          </>
        )}

        {activeTab === "rewards" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">积分商城</h2>
              <Button onClick={() => setShowAddReward(true)} className="flex items-center gap-2">
                <Plus size={18} /> 添加奖励
              </Button>
            </div>
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div key={reward._id.toString()} className="reward-card group relative">
                  <div className="reward-icon">{reward.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{reward.name}</p>
                      {reward.isActive ? (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">已上架</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已下架</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{reward.points} 积分</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${reward.stock > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                      >
                        库存: {reward.stock}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {reward.type === "physical" ? "实物" : "特权"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => handleToggleRewardStatus(reward)}
                      variant="ghost"
                      className={`p-2 rounded-lg ${reward.isActive ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                      title={reward.isActive ? "下架" : "上架"}
                    >
                      {reward.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                    <Button
                      onClick={() => handleEditReward(reward)}
                      variant="ghost"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="编辑"
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      onClick={() => setRewardToDelete(reward._id)}
                      variant="ghost"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-xl font-bold text-gray-800">添加新任务</h3>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">选择孩子</label>
                <div className="child-selector">
                  {childList.map((child: ChildProfile) => (
                    <div
                      key={child.id}
                      onClick={() => toggleChild(child.id)}
                      className={`child-chip ${newTask.selectedChildren.includes(child.id) ? "selected" : ""}`}
                    >
                      <span className="avatar">{child.avatar}</span>
                      <span className="name">{child.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Input
                label="任务名称"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="如：整理书包"
              />

              <div>
                <label className="block text-sm text-gray-600 mb-1">任务配图（可选）</label>
                <label className="file-upload p-4">
                  <input type="file" accept="image/*" onChange={handleTaskPhotoSelect} />
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="text-blue-500" size={24} />
                    <span className="text-xs text-gray-500">点击上传图片</span>
                  </div>
                </label>
                {taskPhotoPreview && <img src={taskPhotoPreview} alt="预览" className="image-preview mt-2 max-h-32" />}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">积分</label>
                <Input
                  type="number"
                  value={newTask.points}
                  onChange={(e) => setNewTask({ ...newTask, points: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTask.requirePhoto}
                    onChange={(e) => setNewTask({ ...newTask, requirePhoto: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">要求拍照提交</span>
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {["⭐", "📚", "🧹", "🏃", "🎨", "🎵"].map((icon) => (
                    <Button
                      key={icon}
                      onClick={() => setNewTask({ ...newTask, icon })}
                      className={`w-10 h-10 rounded-lg text-xl p-0 transition-all ${newTask.icon === icon ? "bg-blue-100 ring-2 ring-blue-400" : "bg-white border border-gray-200 hover:bg-blue-50"}`}
                      variant="ghost"
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">任务类型</label>
                <div className="flex gap-2">
                  {["daily", "advanced", "challenge"].map((type) => (
                    <Button
                      key={type}
                      onClick={() => setNewTask({ ...newTask, type: type as "daily" | "advanced" | "challenge" })}
                      variant="ghost"
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        newTask.type === type
                          ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      }`}
                    >
                      {type === "daily" ? "日常" : type === "advanced" ? "进阶" : "挑战"}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">截止时间（可选）</label>
                <div className="relative z-50">
                  <DatePicker
                    selected={newTask.deadline}
                    onChange={(date: Date | null) => setNewTask({ ...newTask, deadline: date })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="yyyy/MM/dd HH:mm"
                    locale={zhCN}
                    className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholderText="点击选择截止时间"
                    isClearable
                  />
                  <Clock
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={18}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">自动创建（重复）</label>
                <Select
                  value={{
                    value: newTask.recurrence,
                    label:
                      newTask.recurrence === "none"
                        ? "不重复"
                        : newTask.recurrence === "daily"
                          ? "每天"
                          : newTask.recurrence === "weekly"
                            ? "每周"
                            : "每月",
                  }}
                  onChange={(newValue) => {
                    const val = (newValue as SelectOption | null)?.value;
                    const r =
                      typeof val === "string" && ["none", "daily", "weekly", "monthly"].includes(val)
                        ? (val as "none" | "daily" | "weekly" | "monthly")
                        : "none";
                    setNewTask({ ...newTask, recurrence: r });
                  }}
                  options={[
                    { value: "none", label: "不重复" },
                    { value: "daily", label: "每天" },
                    { value: "weekly", label: "每周" },
                    { value: "monthly", label: "每月" },
                  ]}
                  styles={customSelectStyles}
                  placeholder="选择重复频率"
                />

                {newTask.recurrence === "weekly" && (
                  <div className="mt-2">
                    <Select
                      value={
                        newTask.recurrenceDay !== undefined
                          ? {
                              value: newTask.recurrenceDay,
                              label: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][newTask.recurrenceDay],
                            }
                          : null
                      }
                      onChange={(option: unknown) =>
                        setNewTask({ ...newTask, recurrenceDay: (option as SelectOption)?.value as number })
                      }
                      options={[
                        { value: 1, label: "周一" },
                        { value: 2, label: "周二" },
                        { value: 3, label: "周三" },
                        { value: 4, label: "周四" },
                        { value: 5, label: "周五" },
                        { value: 6, label: "周六" },
                        { value: 0, label: "周日" },
                      ]}
                      styles={customSelectStyles}
                      placeholder="选择星期"
                    />
                  </div>
                )}

                {newTask.recurrence === "monthly" && (
                  <div className="mt-2">
                    <Select
                      value={
                        newTask.recurrenceDay
                          ? { value: newTask.recurrenceDay, label: `${newTask.recurrenceDay}号` }
                          : null
                      }
                      onChange={(newValue) =>
                        setNewTask({ ...newTask, recurrenceDay: (newValue as { value: number } | null)?.value })
                      }
                      options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}号` }))}
                      styles={customSelectStyles}
                      placeholder="选择日期"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <Button onClick={() => setShowAddTask(false)} variant="ghost" className="flex-1 py-3 text-gray-600">
                取消
              </Button>
              <Button onClick={handleAddTask} className="flex-1 py-3">
                确认添加
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && editingTask && (
        <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-xl font-bold text-gray-800">编辑任务</h3>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">任务名称</label>
                <Input
                  value={editingTaskData.name}
                  onChange={(e) => setEditingTaskData({ ...editingTaskData, name: e.target.value })}
                  placeholder="如：整理书包"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">任务配图（可选）</label>
                <label className="file-upload p-4">
                  <input type="file" accept="image/*" onChange={handleTaskPhotoSelect} />
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="text-blue-500" size={24} />
                    <span className="text-xs text-gray-500">点击上传图片</span>
                  </div>
                </label>
                {taskPhotoPreview && <img src={taskPhotoPreview} alt="预览" className="image-preview mt-2 max-h-32" />}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">积分</label>
                <Input
                  type="number"
                  value={editingTaskData.points}
                  onChange={(e) => setEditingTaskData({ ...editingTaskData, points: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTaskData.requirePhoto}
                    onChange={(e) => setEditingTaskData({ ...editingTaskData, requirePhoto: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">要求拍照提交</span>
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {["⭐", "📚", "🧹", "🏃", "🎨", "🎵"].map((icon) => (
                    <Button
                      key={icon}
                      onClick={() => setEditingTaskData({ ...editingTaskData, icon })}
                      className={`w-10 h-10 rounded-lg text-xl p-0 ${editingTaskData.icon === icon ? "bg-blue-100 ring-2 ring-blue-400" : "bg-gray-100"}`}
                      variant="ghost"
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">任务类型</label>
                <div className="flex gap-2">
                  {["daily", "advanced", "challenge"].map((type) => (
                    <Button
                      key={type}
                      onClick={() =>
                        setEditingTaskData({ ...editingTaskData, type: type as "daily" | "advanced" | "challenge" })
                      }
                      variant="ghost"
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        editingTaskData.type === type
                          ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      }`}
                    >
                      {type === "daily" ? "日常" : type === "advanced" ? "进阶" : "挑战"}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">截止时间（可选）</label>
                <div className="relative z-50">
                  <DatePicker
                    selected={editingTaskData.deadline}
                    onChange={(date: Date | null) => setEditingTaskData({ ...editingTaskData, deadline: date })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="yyyy/MM/dd HH:mm"
                    locale={zhCN}
                    className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholderText="点击选择截止时间"
                    isClearable
                  />
                  <Clock
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={18}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button onClick={() => setShowEditTaskModal(false)} variant="ghost" className="flex-1 py-3 text-gray-600">
                取消
              </Button>
              <Button onClick={handleUpdateTask} className="flex-1 py-3">
                保存修改
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reward Modal */}
      {showAddReward && (
        <div className="modal-overlay" onClick={() => setShowAddReward(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">添加新奖励</h3>
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
                <label className="block text-sm text-gray-600 mb-1">所需积分</label>
                <Input
                  type="number"
                  value={newReward.points}
                  onChange={(e) => setNewReward({ ...newReward, points: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {["🎁", "🍦", "📚", "🧸", "📺", "⏰"].map((icon) => (
                    <Button
                      key={icon}
                      onClick={() => setNewReward({ ...newReward, icon })}
                      className={`w-10 h-10 rounded-lg text-xl p-0 transition-all ${newReward.icon === icon ? "bg-yellow-100 ring-2 ring-yellow-400" : "bg-white border border-gray-200 hover:bg-yellow-50"}`}
                      variant="ghost"
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">奖励类型</label>
                <div className="flex gap-2">
                  {["physical", "privilege"].map((type) => (
                    <Button
                      key={type}
                      onClick={() => setNewReward({ ...newReward, type: type as "physical" | "privilege" })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${newReward.type === type ? "bg-yellow-500 text-white border-yellow-500 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:border-yellow-200"}`}
                      variant="ghost"
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
                <Button onClick={() => setShowAddReward(false)} variant="ghost" className="flex-1 py-3 text-gray-600">
                  取消
                </Button>
                <Button onClick={handleAddReward} className="flex-1 py-3">
                  确认添加
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  styles={customSelectStyles}
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
                  styles={customSelectStyles}
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

      {/* Edit Reward Modal */}
      {showEditRewardModal && editingReward && (
        <div className="modal-overlay" onClick={() => setShowEditRewardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">编辑奖励</h3>
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
                <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {["🎁", "🍦", "📚", "🧸", "📺", "⏰"].map((icon) => (
                    <Button
                      key={icon}
                      onClick={() => setEditingRewardData({ ...editingRewardData, icon })}
                      className={`w-10 h-10 rounded-lg text-xl p-0 ${editingRewardData.icon === icon ? "bg-yellow-100 ring-2 ring-yellow-400" : "bg-gray-100"}`}
                      variant="ghost"
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">奖励类型</label>
                <div className="flex gap-2">
                  {["physical", "privilege"].map((type) => (
                    <Button
                      key={type}
                      onClick={() =>
                        setEditingRewardData({ ...editingRewardData, type: type as "physical" | "privilege" })
                      }
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${editingRewardData.type === type ? "bg-yellow-500 text-white border-yellow-500 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:border-yellow-200"}`}
                      variant="ghost"
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
                <Button
                  onClick={() => setShowEditRewardModal(false)}
                  variant="ghost"
                  className="flex-1 py-3 text-gray-600"
                >
                  取消
                </Button>
                <Button onClick={handleUpdateReward} className="flex-1 py-3">
                  保存修改
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Task */}
      <ConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="确认删除任务"
        message="确定要删除这个任务吗？此操作无法撤销。"
        confirmText="删除"
        type="danger"
      />

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
