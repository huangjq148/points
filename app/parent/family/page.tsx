"use client";

import { FamilyMember } from "@/app/typings";
import Layout from "@/components/Layouts";
import ParentDashboard from "@/components/ParentDashboard";
import { Button } from "@/components/ui";
import { Settings, Trash2, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ColumnDef, createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useApp } from "@/context/AppContext";

export default function FamilyPage() {
  const { currentUser, childList, logout, switchToChild, addChild } = useApp();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ username: "", password: "", role: "parent", identity: "" });

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

  const tableData = useMemo(() => {
    return familyMembers;
  }, [familyMembers]);

  const columnHelper = createColumnHelper<FamilyMember>();
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

    cols.push(
      columnHelper.accessor("identity", {
        header: "身份",
        cell: (info) => info.getValue() || "-",
      }),
    );

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
  }, [handleDeleteAccount]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">家庭成员管理 </h2>
          <div className="flex gap-2">
            <Button onClick={() => setShowInviteModal(true)} variant="success" className="flex items-center gap-2">
              <Users size={20} /> 邀请家长
            </Button>
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
    </Layout>
  );
}
