"use client";
import Button from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { FileText, Gift, Home, LogOut, Star, Ticket, UserCog, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type NavItemId = "home" | "audit" | "tasks" | "orders" | "rewards" | "family" | "users";

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { currentUser, logout, childList } = useApp();
  const router = useRouter();
  // 计算家庭总计
  const totalPendingOrders = childList.reduce((acc, child) => acc + (child.orderCount || 0), 0);
  const totalSubmittedTasks = childList.reduce((acc, child) => acc + (child.submittedCount || 0), 0);

  const navItems: { id: NavItemId; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "home", icon: Home, label: "首页" },
    { id: "audit", icon: FileText, label: "审核", badge: totalSubmittedTasks },
    { id: "tasks", icon: Star, label: "任务" },
    { id: "orders", icon: Ticket, label: "核销", badge: totalPendingOrders },
    { id: "rewards", icon: Gift, label: "商城" },
    { id: "family", icon: Users, label: "家庭管理" },
    { id: "users", icon: UserCog, label: "用户管理" },
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">🌟</div>
          <div className="logo-title">小小奋斗者</div>
          <div className="logo-subtitle">家长管理后台</div>
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
        </div>

        <div className="mt-auto"></div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-lg px-4 py-3 flex items-center justify-between sticky top-0 z-40 rounded-2xl mb-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌟</span>
            <span className="font-bold text-blue-600">小小奋斗者</span>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 ">
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    👤
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {mounted && currentUser?.username ? currentUser.username : "家长"}
                </span>
              </div>
            </div>
            <Button onClick={logout} variant="secondary" className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 border-none bg-transparent shadow-none">
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
