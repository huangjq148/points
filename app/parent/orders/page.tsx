"use client";

import { IDisplayedOrder, PlainOrder } from "@/app/typings";
import Layout from "@/components/Layouts";
import { Button } from "@/components/ui";
import Select, { SelectOption } from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import { Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function OrdersPage() {
  const { currentUser, childList, logout, switchToChild, addChild } = useApp();
  const [orders, setOrders] = useState<IDisplayedOrder[]>([]);
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>("all");

  const childOptions: SelectOption[] = [
    { value: "all", label: "全部孩子" },
    ...childList.map((child) => ({
      value: child.id.toString(),
      label: child.username,
    })),
  ];

  const pendingOrders =
    selectedChildFilter === "all"
      ? orders.filter((o) => o.status === "pending")
      : orders.filter((o) => o.status === "pending" && o.childId.toString() === selectedChildFilter);

  const fetchOrders = useCallback(async () => {
    if (!currentUser?.token) return [];
    const res = await fetch(`/api/orders?userId=${currentUser?.id}`, {
      headers: {
        "Authorization": `Bearer ${currentUser.token}`
      }
    });
    const data: { success: boolean; orders: PlainOrder[] } = await res.json();
    if (data.success) {
      const ordersWithNames: IDisplayedOrder[] = await Promise.all(
        data.orders.map(async (order: PlainOrder) => {
          const childRes = await fetch(`/api/children?childId=${order.childId}`, {
            headers: {
              "Authorization": `Bearer ${currentUser.token}`
            }
          });
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
  }, [currentUser]);

  const handleVerifyOrder = async (orderId: string) => {
    if (!currentUser?.token) return;
    await fetch("/api/orders", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({ orderId, action: "verify" }),
    });
    const updatedOrders = await fetchOrders();
    setOrders(updatedOrders);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!currentUser?.token) return;
    await fetch("/api/orders", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({ orderId, action: "cancel" }),
    });
    const updatedOrders = await fetchOrders();
    setOrders(updatedOrders);
  };

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        const fetchedOrders = await fetchOrders();
        setOrders(fetchedOrders);
      }
    };
    loadData();
  }, [currentUser, fetchOrders]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">兑换核销</h2>
        <div className="flex items-center gap-3">
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
                  className={`status-badge ${order.status === "pending"
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
    </Layout>
  );
}
