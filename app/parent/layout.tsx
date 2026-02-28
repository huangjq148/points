"use client";
import Button from "@/components/ui/Button";
import { TabFilter } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { FileText, Gift, Home, LogOut, Star, Ticket, UserCog, Users, Trophy, Clock, PanelLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

type NavItemId = "home" | "overview" | "audit" | "tasks" | "orders" | "rewards" | "family" | "users" | "achievements" | "scheduled-jobs";

const TAB_TITLE: Record<NavItemId, string> = {
  home: "首页",
  overview: "数据概览",
  audit: "任务审核",
  tasks: "任务管理",
  orders: "礼品核销",
  rewards: "奖品商城",
  achievements: "勋章管理",
  family: "家庭成员",
  users: "系统用户",
  "scheduled-jobs": "定时任务",
};

export default function ParentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, logout, childList } = useApp();
  const router = useRouter();
  // 计算家庭总计
  const totalPendingOrders = useMemo(
    () => childList.reduce((acc, child) => acc + (child.orderCount || 0), 0),
    [childList],
  );
  const totalSubmittedTasks = useMemo(
    () => childList.reduce((acc, child) => acc + (child.submittedCount || 0), 0),
    [childList],
  );

  const navItems: { id: NavItemId; icon: React.ElementType; label: string; badge?: number }[] = useMemo(
    () => [
      { id: "home", icon: Home, label: "首页" },
      { id: "overview", icon: Gift, label: "概览" },
      { id: "audit", icon: FileText, label: "审核", badge: totalSubmittedTasks },
      { id: "tasks", icon: Star, label: "任务" },
      { id: "orders", icon: Ticket, label: "核销", badge: totalPendingOrders },
      { id: "rewards", icon: Gift, label: "商城" },
      { id: "achievements", icon: Trophy, label: "勋章" },
      { id: "family", icon: Users, label: "家庭" },
      { id: "users", icon: UserCog, label: "用户" },
      { id: "scheduled-jobs", icon: Clock, label: "定时任务" },
    ],
    [totalPendingOrders, totalSubmittedTasks],
  );
  const activeTab: NavItemId = useMemo(() => {
    const pathSegments = pathname.split("/");
    const currentTab = pathSegments[pathSegments.length - 1];
    if (["home", "overview", "tasks", "rewards", "audit", "orders", "family", "users", "achievements", "scheduled-jobs"].includes(currentTab)) {
      return currentTab as NavItemId;
    }
    return "home"; // Default to home if path is not recognized
  }, [pathname]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleNavClick = (itemId: NavItemId) => {
    router.push(`/parent/${itemId}`);
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar - Desktop only */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="logo-section">
          <div className="logo-icon">🌟</div>
          {!sidebarCollapsed && (
            <>
              <div className="logo-title">小小奋斗者</div>
              <div className="logo-subtitle">家长管理后台</div>
            </>
          )}
        </div>

        <div className="desktop-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`desktop-nav-item ${activeTab === item.id ? "active" : ""} ${sidebarCollapsed ? 'collapsed' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={sidebarCollapsed ? 24 : 22} />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && <span className="badge">{item.badge}</span>}
              {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && <span className="badge-collapsed">{item.badge}</span>}
            </div>
          ))}
        </div>

      </aside>

      {/* Sidebar Toggle Button - positioned at right middle of sidebar */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="sidebar-toggle-btn"
        title={sidebarCollapsed ? "展开菜单" : "收起菜单"}
      >
        <PanelLeft size={18} className={sidebarCollapsed ? 'rotate-180' : ''} />
      </button>

      {/* Main Content */}
      <div className="main-wrapper flex flex-col min-h-screen">
        {/* Header - Fixed at top, always visible */}
        <header className="mobile-header desktop-header fixed top-0 left-0 right-0 z-50">
          <div className="bg-white/90 backdrop-blur-xl lg:backdrop-blur-md px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              <span className="font-bold text-blue-600">小小奋斗者</span>
            </div>
            <div className="flex gap-2 lg:hidden">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 ">
                  <div className="relative">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      👤
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {currentUser?.username || "家长"}
                  </span>
                </div>
              </div>
              <Button onClick={logout} variant="secondary" className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 border-none bg-transparent shadow-none">
                <LogOut size={20} />
              </Button>
            </div>
            {/* Desktop header content */}
            <div className="hidden lg:flex items-center gap-4 w-full justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{TAB_TITLE[activeTab]}</h1>
                <p className="text-gray-500 text-sm mt-1">欢迎回来，开启美好的一天</p>
              </div>
              <div className="bg-white/80 px-4 py-2 rounded-2xl flex items-center gap-3 border border-white shadow-sm">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200 font-bold">
                  {currentUser?.username ? currentUser.username[0].toUpperCase() : "P"}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 leading-none">
                    {currentUser?.username || "家长"}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">管理员</span>
                </div>
                <div className="h-8 w-[1px] bg-gray-100 mx-2" />
                <Button onClick={logout} variant="secondary" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border-none bg-transparent shadow-none transition-colors">
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area - Scrollable */}
        <main className="main-area flex-1 overflow-auto">
          <div className="main-inner !m-0">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation - Fixed */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 z-50 pb-safe">
          <div className="px-2 py-2">
            <TabFilter
              items={navItems.map(item => ({ key: item.id, label: item.label }))}
              activeKey={activeTab}
              onFilterChange={(key) => handleNavClick(key as NavItemId)}
              className="bg-transparent border-none shadow-none p-0"
            />
          </div>
        </nav>
      </div>
    </div>
  );
}
