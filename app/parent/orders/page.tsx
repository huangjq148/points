"use client";

import { IDisplayedOrder, PlainOrder } from "@/app/typings";
import Layout from "@/components/Layouts";
import { Button } from "@/components/ui";
import Select, { SelectOption } from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import { Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function OrdersPage() {
  const { currentUser, childList } = useApp();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [pendingOrders, setPendingOrders] = useState<IDisplayedOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<IDisplayedOrder[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  const childOptions: SelectOption[] = [
    { value: "all", label: "全部孩子" },
    ...childList.map((child) => ({
      value: child.id.toString(),
      label: child.username,
    })),
  ];

  const fetchOrders = useCallback(
    async (status: string, page: number = 1, limit: number = 100) => {
      if (!currentUser?.token) return { orders: [], total: 0 };
      
      let url = `/api/orders?userId=${currentUser.id}&status=${status}&page=${page}&limit=${limit}`;
      if (selectedChildFilter !== "all") {
        url += `&childId=${selectedChildFilter}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data: { success: boolean; orders: PlainOrder[]; total: number } = await res.json();
      
      if (data.success) {
        const ordersWithNames: IDisplayedOrder[] = await Promise.all(
          data.orders.map(async (order: PlainOrder) => {
            const childRes = await fetch(`/api/children?childId=${order.childId}`, {
              headers: {
                Authorization: `Bearer ${currentUser.token}`,
              },
            });
            const childData: { success: boolean; child: { nickname: string; avatar: string } } = await childRes.json();
            return {
              ...order,
              childName: childData.child?.nickname || "未知",
              childAvatar: childData.child?.avatar || "👶",
            };
          })
        );
        return { orders: ordersWithNames, total: data.total };
      }
      return { orders: [], total: 0 };
    },
    [currentUser, selectedChildFilter]
  );

  const refreshPending = useCallback(async () => {
    setIsLoading(true);
    const { orders } = await fetchOrders("pending", 1, 100);
    setPendingOrders(orders);
    setIsLoading(false);
  }, [fetchOrders]);

  const refreshHistory = useCallback(async () => {
    setIsLoading(true);
    const { orders, total } = await fetchOrders("verified,cancelled", historyPage, 10);
    setHistoryOrders(orders);
    setHistoryTotal(total);
    setIsLoading(false);
  }, [fetchOrders, historyPage]);

  useEffect(() => {
    const init = async () => {
      if (currentUser) {
        await refreshPending();
      }
    };
    init();
  }, [currentUser, refreshPending]);

  useEffect(() => {
    const initHistory = async () => {
      if (currentUser && activeTab === "history") {
        await refreshHistory();
      }
    };
    initHistory();
  }, [currentUser, activeTab, refreshHistory]);

  const handleVerifyOrder = async (orderId: string) => {
    if (!currentUser?.token) return;
    await fetch("/api/orders", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({ orderId, action: "verify" }),
    });
    refreshPending();
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!currentUser?.token) return;
    await fetch("/api/orders", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({ orderId, action: "cancel" }),
    });
    refreshPending();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">兑换核销</h2>
        <div className="flex items-center gap-2">
          {isLoading && <div className="loading-spinner w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          <div className="w-40">
            <Select
              value={selectedChildFilter}
              onChange={(value) => {
                if (value) {
                  setSelectedChildFilter(value.toString());
                }
              }}
              options={childOptions}
              placeholder="选择孩子"
            />
          </div>
        </div>
      </div>

      <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
            activeTab === "pending" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          待核销 ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
            activeTab === "history" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          核销记录
        </button>
      </div>

      {activeTab === "pending" ? (
        pendingOrders.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <Ticket size={48} className="mx-auto mb-2 opacity-50" />
            <p>暂无待核销记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div key={order._id.toString()} className="order-card">
                <div className="order-header">
                  <div className="order-reward">
                    <div className="order-reward-icon">{order.rewardIcon || "🎁"}</div>
                    <div>
                      <div className="order-reward-name">{order.rewardName}</div>
                      <div className="order-reward-points">🪙 {order.pointsSpent}</div>
                    </div>
                  </div>
                  <span className="status-badge status-submitted">待核销</span>
                </div>
                <div className="order-info">
                  <div className="order-child">
                    <span>{order.childAvatar}</span>
                    <span>{order.childName}</span>
                  </div>
                  <div className="order-code">{order.verificationCode}</div>
                </div>
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
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {historyOrders.length === 0 ? (
            <div className="card text-center py-12 text-gray-500">
              <Ticket size={48} className="mx-auto mb-2 opacity-50" />
              <p>暂无核销记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyOrders.map((order) => (
                <div key={order._id.toString()} className="order-card opacity-75">
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
                        order.status === "verified" ? "status-verified" : "status-rejected"
                      }`}
                    >
                      {order.status === "verified" ? "已核销" : "已取消"}
                    </span>
                  </div>
                  <div className="order-info">
                    <div className="order-child">
                      <span>{order.childAvatar}</span>
                      <span>{order.childName}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {historyTotal > 10 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="ghost"
                disabled={historyPage === 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="text-gray-500 disabled:opacity-30"
              >
                上一页
              </Button>
              <span className="text-sm text-gray-500">
                第 {historyPage} 页 / 共 {Math.ceil(historyTotal / 10)} 页
              </span>
              <Button
                variant="ghost"
                disabled={historyPage >= Math.ceil(historyTotal / 10)}
                onClick={() => setHistoryPage((p) => p + 1)}
                className="text-gray-500 disabled:opacity-30"
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
