"use client";
import Button from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import {
  FileText,
  Gift,
  Home,
  LogOut,
  Star,
  Ticket,
  UserCog,
  Users
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

type NavItemId = "home" | "audit" | "tasks" | "orders" | "rewards";

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { currentUser, childList, logout, switchToChild, addChild } = useApp();
  const router = useRouter();
  const navItems: { id: NavItemId; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "home", icon: Home, label: "首页" },
    { id: "audit", icon: FileText, label: "审核" },
    // { id: "audit", icon: FileText, label: "审核", badge: pendingTasks.length },
    { id: "tasks", icon: Star, label: "任务" },
    { id: "orders", icon: Ticket, label: "核销" },
    // { id: "orders", icon: Ticket, label: "核销", badge: pendingOrders.length },
    { id: "rewards", icon: Gift, label: "商城" },
  ];
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
        {children}
      </div>
    </div>
  );
};

export default Layout;
