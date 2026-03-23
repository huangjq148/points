"use client";
import Button from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { FileText, Gift, Home, LogOut, Star, Ticket, UserCog, Users, PanelLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

type NavItemId = "home" | "overview" | "audit" | "tasks" | "orders" | "rewards" | "family" | "users";

const TAB_TITLE: Record<NavItemId, { title: string; desc: string }> = {
  home: {
    title: "首页",
    desc: "一站式查看核心数据，快速进入各功能模块",
  },
  overview: {
    title: "总览",
    desc: "看清优先级、节奏和孩子进展，先处理最关键的事",
  },
  audit: {
    title: "任务审核",
    desc: "审核孩子提交的任务，确认完成状态并评分",
  },
  tasks: {
    title: "任务管理",
    desc: "创建、编辑、删除任务，自定义任务规则和奖励",
  },
  orders: {
    title: "礼品核销",
    desc: "核对孩子兑换的礼品，完成核销流程并记录",
  },
  rewards: {
    title: "奖品商城",
    desc: "管理奖品库存，上架/下架奖品，设置兑换规则",
  },
  family: {
    title: "家庭成员",
    desc: "添加、管理家庭成员，分配角色和权限",
  },
  users: {
    title: "系统用户",
    desc: "管理后台系统用户，配置账号权限和状态",
  },
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
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="logo-section">
          <div className="logo-brand">
            <div className="logo-icon">🌟</div>
            {!sidebarCollapsed && (
              <div className="logo-copy">
                <div className="logo-title">小小奋斗者</div>
                <div className="logo-subtitle">家长管理后台</div>
              </div>
            )}
          </div>
        </div>

        <div className="desktop-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`desktop-nav-item ${activeTab === item.id ? "active" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={sidebarCollapsed ? 24 : 22} />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="badge">{item.badge}</span>
              )}
              {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="badge-collapsed">{item.badge}</span>
              )}
            </div>
          ))}
        </div>
      </aside>

      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="sidebar-toggle-btn"
        title={sidebarCollapsed ? "展开菜单" : "收起菜单"}
      >
        <PanelLeft size={18} className={sidebarCollapsed ? "rotate-180" : ""} />
      </button>

      <div className="main-wrapper flex flex-col min-h-screen">
        <header className="desktop-header">
          <div className="desktop-header-inner">
            <div>
              <h1 className="desktop-header-title">{TAB_TITLE[activeTab].title}</h1>
              <p className="desktop-header-subtitle">{TAB_TITLE[activeTab].desc}</p>
            </div>
            <div className="desktop-header-user">
              <div className="desktop-header-avatar">
                {currentUser?.username ? currentUser.username[0].toUpperCase() : "P"}
              </div>
              <div className="desktop-header-userinfo">
                <span className="desktop-header-username">{currentUser?.username || "家长"}</span>
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
          <div className="main-inner ">{children}</div>
        </main>
      </div>
    </div>
  );
}
