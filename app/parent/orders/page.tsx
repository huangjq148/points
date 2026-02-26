"use client";

import { IDisplayedOrder, PlainOrder } from "@/app/typings";
import { Button, TabFilter } from "@/components/ui";
import Select, { SelectOption } from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import { Ticket } from "lucide-react";
import request from "@/utils/request";
import { formatDate } from "@/utils/date";
import { useCallback, useEffect, useState } from "react";

export default function OrdersPage() {
  const { childList } = useApp();
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
    async (status: string, page: number = 1, fetchLimit: number = 100) => {
      const params: Record<string, string | number> = {
        status,
        page,
        limit: fetchLimit,
      };

      if (selectedChildFilter !== "all") {
        params.childId = selectedChildFilter;
      }

      const data = (await request("/api/orders", {
        params,
      })) as { success: boolean; orders: IDisplayedOrder[]; total: number };

      if (data.success) {
        return { orders: data.orders, total: data.total };
      }
      return { orders: [], total: 0 };
    },
    [selectedChildFilter],
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
      await refreshPending();
    };
    init();
  }, [refreshPending]);

  useEffect(() => {
    const initHistory = async () => {
      if (activeTab === "history") {
        await refreshHistory();
      }
    };
    initHistory();
  }, [activeTab, refreshHistory]);

  const handleVerifyOrder = async (orderId: string) => {
    await request("/api/orders", {
      method: "PUT",
      body: { orderId, action: "verify" },
    });
    refreshPending();
  };

  const handleCancelOrder = async (orderId: string) => {
    await request("/api/orders", {
      method: "PUT",
      body: { orderId, action: "cancel" },
    });
    refreshPending();
  };

  const orderTabs = [
    { key: "pending", label: `待核销 (${pendingOrders.length})` },
    { key: "history", label: "核销记录" },
  ] as const;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            兑换核销
          </h2>
          <p className="text-gray-500 text-sm mt-1">核销孩子兑换的礼品</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="loading-spinner w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
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

      <TabFilter
        items={orderTabs}
        activeKey={activeTab}
        onFilterChange={(key) => setActiveTab(key as "pending" | "history")}
        className="mb-8"
      />

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
                      className={`status-badge ${order.status === "verified" ? "status-verified" : "status-rejected"}`}
                    >
                      {order.status === "verified" ? "已核销" : "已取消"}
                    </span>
                  </div>
                  <div className="order-info">
                    <div className="order-child">
                      <span>{order.childAvatar}</span>
                      <span>{order.childName}</span>
                    </div>
                    <div className="text-xs text-gray-400">{formatDate(order.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {historyTotal > 10 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="secondary"
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
                variant="secondary"
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
    </>
  );
}
