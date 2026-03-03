"use client";
import Button from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { FileText, Gift, Home, LogOut, Star, Ticket, UserCog, Users, PanelLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

type NavItemId = "home" | "overview" | "audit" | "tasks" | "orders" | "rewards" | "family" | "users";

const TAB_TITLE: Record<NavItemId, string> = {
  home: "首页",
  overview: "数据概览",
  audit: "任务审核",
  tasks: "任务管理",
  orders: "礼品核销",
  rewards: "奖品商城",
  family: "家庭成员",
  users: "系统用户",
};

export default function ParentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, logout, childList } = useApp();
  const router = useRouter();
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
      { id: "family", icon: Users, label: "家庭" },
      { id: "users", icon: UserCog, label: "用户" },
    ],
    [totalPendingOrders, totalSubmittedTasks],
  );
  const activeTab: NavItemId = useMemo(() => {
    const pathSegments = pathname.split("/");
    const currentTab = pathSegments[pathSegments.length - 1];
    if (["home", "overview", "tasks", "rewards", "audit", "orders", "family", "users"].includes(currentTab)) {
      return currentTab as NavItemId;
    }
    return "home";
  }, [pathname]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleNavClick = (itemId: NavItemId) => {
    router.push(`/parent/${itemId}`);
  };

  return (
    <div className="dashboard-layout">
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

      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="sidebar-toggle-btn"
        title={sidebarCollapsed ? "展开菜单" : "收起菜单"}
      >
        <PanelLeft size={18} className={sidebarCollapsed ? 'rotate-180' : ''} />
      </button>

      <div className="main-wrapper flex flex-col min-h-screen">
        <header className="desktop-header">
          <div className="desktop-header-inner">
            <div>
              <h1 className="desktop-header-title">{TAB_TITLE[activeTab]}</h1>
              <p className="desktop-header-subtitle">欢迎回来，开启美好的一天 ✨</p>
            </div>
            <div className="desktop-header-user">
              <div className="desktop-header-avatar">
                {currentUser?.username ? currentUser.username[0].toUpperCase() : "P"}
              </div>
              <div className="desktop-header-userinfo">
                <span className="desktop-header-username">
                  {currentUser?.username || "家长"}
                </span>
                <span className="desktop-header-role">管理员</span>
              </div>
              <div className="desktop-header-divider" />
              <Button onClick={logout} variant="secondary" className="desktop-header-logout">
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </header>

        <main className="main-area overflow-auto">
          <div className="main-inner !m-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
