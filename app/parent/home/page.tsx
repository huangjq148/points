"use client";

import Button from "@/components/ui/Button";
import { User, useApp } from "@/context/AppContext";
import { Check, ChevronRight, Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function HomePage() {
  const router = useRouter();
  const { childList } = useApp();

  // 计算家庭总计
  const totalSubmittedTasks = useMemo(
    () => childList.reduce((acc, child) => acc + (child.submittedCount || 0), 0),
    [childList],
  );
  const totalPendingOrders = useMemo(
    () => childList.reduce((acc, child) => acc + (child.orderCount || 0), 0),
    [childList],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="card-parent cursor-pointer hover:shadow-lift transition-all duration-300"
            onClick={() => {
              router.push("/parent/overview");
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-xl flex items-center justify-center shadow-yellow">
                <Clock size={24} className="text-yellow-700" />
              </div>
              <span className="text-sm text-slate-600 font-medium">待审核</span>
            </div>
            <p className="text-3xl font-bold text-slate-800 text-shadow-sm">{totalSubmittedTasks}</p>
          </div>
          <div
            className="card-parent cursor-pointer hover:shadow-lift transition-all duration-300"
            onClick={() => {
              router.push("/parent/orders");
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-blue">
                <Check size={24} className="text-white" />
              </div>
              <span className="text-sm text-slate-600 font-medium">待核销</span>
            </div>
            <p className="text-3xl font-bold text-slate-800 text-shadow-sm">{totalPendingOrders}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">孩子档案</h2>
            <span className="text-xs text-slate-400">点击任意卡片进入对应模块</span>
          </div>
          <div className="flex flex-col gap-3">
            {childList.map((child: User) => {
              return (
              <div
                  key={child.id as string}
                  className="card-parent flex items-center gap-4 cursor-pointer hover:shadow-lift transition-all duration-300"
                >
                  <div className="text-3xl filter drop-shadow-md">{child.avatar}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-shadow-sm">{child.username}</p>
                    <p className="text-sm text-slate-500 flex flex-wrap gap-2 mt-1">
                      <span className="bg-slate-50 px-2 py-0.5 rounded-xl shadow-inner-soft">💰 积分: {child.availablePoints}</span>
                      <span
                        className="text-orange-600 cursor-pointer hover:underline bg-gradient-to-r from-orange-50 to-orange-100 px-2 py-0.5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/tasks?status=uncompleted&childId=${child.id}`);
                        }}
                      >
                        ⏳ 待完成: {child.pendingCount || 0}
                      </span>
                      <span
                        className="text-blue-600 cursor-pointer hover:underline bg-gradient-to-r from-blue-50 to-blue-100 px-2 py-0.5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/audit?childId=${child.id}`);
                        }}
                      >
                        📝 待审核: {child.submittedCount || 0}
                      </span>
                      <span
                        className="text-green-600 cursor-pointer hover:underline bg-gradient-to-r from-green-50 to-green-100 px-2 py-0.5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/orders?status=pending&childId=${child.id}`);
                        }}
                      >
                        ✅ 待核销: {child.orderCount || 0}
                      </span>
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-slate-400" />
                </div>
              );
            })}
            {childList.length === 0 && (
              <div className="card-parent text-center py-8 hover:shadow-medium transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner-soft">
                  <Users size={32} className="text-slate-400" />
                </div>
                <p className="text-slate-500 mb-4">还没有孩子档案</p>
                <Button onClick={() => router.push("/parent/family")} className="shadow-blue hover:shadow-glow transition-shadow">
                  + 添加孩子
                </Button>
              </div>
            )}
            {childList.length > 0 && (
              <Button
                variant="secondary"
                className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-400 hover:shadow-soft transition-all"
                onClick={() => router.push("/parent/family")}
              >
                + 添加更多孩子
              </Button>
            )}
          </div>
        </div>
    </div>
  );
}
