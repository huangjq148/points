"use client";

import { IDisplayedTask, PlainTask } from "@/app/typings";
import Layout from "@/components/Layouts";
import { useApp } from "@/context/AppContext";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui";
import Select, { SelectOption } from "@/components/ui/Select";

export default function AuditPage() {
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>("all");
  const { currentUser, childList, logout, switchToChild, addChild } = useApp();
  const [tasks, setTasks] = useState<IDisplayedTask[]>([]);

  const childOptions: SelectOption[] = [
    { value: "all", label: "全部孩子" },
    ...childList.map((child) => ({
      value: child.id.toString(),
      label: child.nickname,
    })),
  ];

  const pendingTasks =
    selectedChildFilter === "all"
      ? tasks.filter((t) => t.status === "submitted")
      : tasks.filter((t) => t.status === "submitted" && t.childId.toString() === selectedChildFilter);

  const handleApproveTask = async (taskId: string, status: "approved" | "rejected", rejectionReason?: string) => {
    if (!currentUser?.token) return;
    await fetch("/api/tasks", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({ taskId, status, rejectionReason }),
    });
    const updatedTasks = await fetchTasks();
    setTasks(updatedTasks);
  };

  const fetchTasks = useCallback(async () => {
    if (!currentUser?.token) return [];
    const res = await fetch(`/api/tasks?userId=${currentUser?.id}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    });
    const data: { success: boolean; tasks: PlainTask[] } = await res.json();
    if (data.success) {
      const tasksWithNames: IDisplayedTask[] = await Promise.all(
        data.tasks.map(async (task: PlainTask) => {
          const childRes = await fetch(`/api/children?childId=${task.childId}`, {
            headers: {
              Authorization: `Bearer ${currentUser.token}`,
            },
          });
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

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        const fetchedTasks = await fetchTasks();
        setTasks(fetchedTasks);
      }
    };
    loadData();
  }, [currentUser, fetchTasks]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">任务审核</h2>
        <div className="w-40">
          <Select
            value={childOptions.find((opt) => opt.value === selectedChildFilter) || childOptions[0]}
            onChange={(option) => {
              if (option) {
                setSelectedChildFilter(option.value.toString());
              }
            }}
            options={childOptions}
            placeholder="选择孩子"
          />
        </div>
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
    </Layout>
  );
}
