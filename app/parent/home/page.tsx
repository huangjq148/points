"use client";

import Button from "@/components/ui/Button";
import { User, useApp } from "@/context/AppContext";
import { Check, ChevronRight, Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import "react-datepicker/dist/react-datepicker.css";
import Layout from "@/components/Layouts";

export default function HomePage() {
  const router = useRouter();
  const { childList, switchToChild } = useApp();

  // 计算家庭总计
  const totalSubmittedTasks = childList.reduce((acc, child) => acc + (child.submittedCount || 0), 0);
  const totalPendingOrders = childList.reduce((acc, child) => acc + (child.orderCount || 0), 0);

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
            <p className="text-3xl font-bold text-gray-800">{totalSubmittedTasks}</p>
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
            <p className="text-3xl font-bold text-gray-800">{totalPendingOrders}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">孩子档案</h2>
          <div className="flex flex-col gap-3">
            {childList.map((child: User) => {
              return (
                <div
                  key={child.id as string}
                  onClick={() => switchToChild(child)}
                  className="card flex items-center gap-4 cursor-pointer hover:bg-white/90 transition"
                >
                  <div className="text-3xl">{child.avatar}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{child.username}</p>
                    <p className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                      <span>积分: {child.availablePoints}</span>
                      <span
                        className="text-orange-500 cursor-pointer hover:underline bg-orange-50 px-2 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/tasks?status=uncompleted&childId=${child.id}`);
                        }}
                      >
                        待完成: {child.pendingCount || 0}
                      </span>
                      <span
                        className="text-blue-500 cursor-pointer hover:underline bg-blue-50 px-2 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/audit?childId=${child.id}`);
                        }}
                      >
                        待审核: {child.submittedCount || 0}
                      </span>
                      <span
                        className="text-green-500 cursor-pointer hover:underline bg-green-50 px-2 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/parent/orders?status=pending&childId=${child.id}`);
                        }}
                      >
                        待核销: {child.orderCount || 0}
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
                  onClick={() => router.push("/parent/family")}
                >
                  添加孩子
                </Button>
              </div>
            )}
            {childList.length > 0 && (
              <Button
                variant="ghost"
                className="w-full border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50"
                onClick={() => router.push("/parent/family")}
              >
                + 添加更多孩子
              </Button>
            )}
          </div>
        </div>
      </>
    </Layout>
  );
}
