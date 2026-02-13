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
      <div className="main-content flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm mb-4 border-b border-gray-100">
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

        {/* Header Section for Desktop */}
        <header className="hidden lg:flex items-center justify-between mb-8 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/40 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {activeTab === "home" ? "管理概览" : 
               activeTab === "audit" ? "任务审核" :
               activeTab === "tasks" ? "任务管理" :
               activeTab === "orders" ? "礼品核销" :
               activeTab === "rewards" ? "奖品商城" :
               activeTab === "family" ? "家庭成员" : "系统用户"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">欢迎回来，开启美好的一天</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/80 px-4 py-2 rounded-2xl flex items-center gap-3 border border-white shadow-sm">
               <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200 font-bold">
                 {mounted && currentUser?.username ? currentUser.username[0].toUpperCase() : "P"}
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-bold text-gray-800 leading-none">
                   {mounted && currentUser?.username ? currentUser.username : "家长"}
                 </span>
                 <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">管理员</span>
               </div>
               <div className="h-8 w-[1px] bg-gray-100 mx-2" />
               <Button onClick={logout} variant="secondary" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border-none bg-transparent shadow-none transition-colors">
                 <LogOut size={20} />
               </Button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
