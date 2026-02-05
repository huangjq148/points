"use client";

import Button from "@/components/ui/Button";
import { ChildProfile, useApp } from "@/context/AppContext";
import { Check, ChevronRight, Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";

import Layout from "@/components/Layouts";

interface ChildStats {
  pendingTasks: number;
  submittedTasks: number;
  pendingOrders: number;
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

export default function HomePage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<IDisplayedTask[]>([]);
  const [orders, setOrders] = useState<IDisplayedOrder[]>([]);
  const { currentUser, childList, switchToChild, addChild } = useApp();
  const [childStats, setChildStats] = useState<Record<string, ChildStats>>({});
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
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

  const fetchOrders = useCallback(async () => {
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
  }, [currentUser?.id]);

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

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        const fetchedTasks = await fetchTasks();
        setTasks(fetchedTasks);
        const fetchedOrders = await fetchOrders();
        setOrders(fetchedOrders);
      }
    };
    loadData();
  }, [currentUser, fetchOrders, fetchRewards, fetchTasks]);

  return (
    <Layout>
      <>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div
            className="card cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => {
              router.push("/parent/audit");
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-yellow-200/80 backdrop-blur rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-yellow-600" />
              </div>
              <span className="text-sm text-gray-600">待审核</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{tasks.filter((t) => t.status === "submitted").length}</p>
          </div>
          <div
            className="card cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => {
              router.push("/parent/orders");
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-200/80 backdrop-blur rounded-xl flex items-center justify-center">
                <Check size={24} className="text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">待核销</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{orders.filter((o) => o.status === "pending").length}</p>
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
                          router.push(`/parent/tasks?status=uncompleted&childId=${child.id}`);
                        }}
                      >
                        待完成: {stats.pendingTasks}
                      </span>
                      <span
                        className="text-blue-500 cursor-pointer hover:underline bg-blue-50 px-2 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/audit?childId=${child.id}`);
                        }}
                      >
                        待审核: {stats.submittedTasks}
                      </span>
                      <span
                        className="text-green-500 cursor-pointer hover:underline bg-green-50 px-2 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/orders?status=pending&childId=${child.id}`);
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
    </Layout>
  );
}
