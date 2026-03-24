"use client";
import Button from "@/components/ui/Button";
import { TabFilter } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { ChevronDown, FileText, Gift, Home, LogOut, Star, Ticket, UserCog, Users, PanelsLeftRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type NavItemId = "home" | "overview" | "audit" | "tasks" | "orders" | "rewards" | "family" | "users";

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { currentUser, logout, childList, savedChildSessions, favoriteChildIds, switchToChild, toggleFavoriteChild } = useApp();
  const router = useRouter();
  const totalPendingOrders = childList.reduce((acc, child) => acc + (child.orderCount || 0), 0);
  const totalSubmittedTasks = childList.reduce((acc, child) => acc + (child.submittedCount || 0), 0);
  const [showChildMenu, setShowChildMenu] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const navItems: { id: NavItemId; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "home", icon: Home, label: "首页" },
    { id: "overview", icon: Gift, label: "概览" },
    { id: "audit", icon: FileText, label: "审核", badge: totalSubmittedTasks },
    { id: "tasks", icon: Star, label: "任务" },
    { id: "orders", icon: Ticket, label: "核销", badge: totalPendingOrders },
    { id: "rewards", icon: Gift, label: "商城" },
    { id: "family", icon: Users, label: "家庭" },
    { id: "users", icon: UserCog, label: "用户" },
  ];
  const initialTab = (() => {
    const pathSegments = pathname.split("/");
    const currentTab = pathSegments[pathSegments.length - 1];
    if (["home", "overview", "tasks", "rewards", "audit", "orders", "family", "users"].includes(currentTab)) {
      return currentTab as NavItemId;
    }
    return "home";
  })();
  const [activeTab, setActiveTab] = useState<NavItemId>(initialTab);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleNavClick = (itemId: NavItemId) => {
    setActiveTab(itemId);
    router.push(`/parent/${itemId}`);
  };

  const handleSwitchChild = (childId: string) => {
    const target = savedChildSessions.find((child) => child.id === childId);
    if (!target) return;
    switchToChild(target);
    setShowChildMenu(false);
  };

  const formatLastUsed = (lastUsedAt?: string) => {
    if (!lastUsedAt) return "最近未记录";
    const date = new Date(lastUsedAt);
    if (Number.isNaN(date.getTime())) return "最近未记录";
    return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const childCard = (child: typeof savedChildSessions[number]) => (
    <div
      key={child.id}
      onClick={() => handleSwitchChild(child.id)}
      className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/70 cursor-pointer"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl shadow-sm">
        {child.avatar || "👶"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-gray-800">{child.username}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">已登录</span>
          {favoriteChildIds.includes(child.id) && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">常用</span>
          )}
        </div>
        <span className="block truncate text-xs text-gray-500">
          {child.availablePoints !== undefined ? `🪙 ${child.availablePoints} · ` : ""}
          {formatLastUsed(child.lastUsedAt)}
        </span>
        {favoriteChildIds.includes(child.id) && (
          <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            已固定在前排
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavoriteChild(child.id);
        }}
        className="rounded-full p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-500"
        aria-label={favoriteChildIds.includes(child.id) ? "取消常用" : "设为常用"}
      >
        <Star size={16} fill={favoriteChildIds.includes(child.id) ? "currentColor" : "none"} />
      </button>
    </div>
  );

  const visibleChildren = showFavoritesOnly
    ? savedChildSessions.filter((child) => favoriteChildIds.includes(child.id))
    : savedChildSessions;

  const childDrawer = showChildMenu ? (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="关闭孩子抽屉"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setShowChildMenu(false)}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black text-gray-800">孩子账号抽屉</p>
                <p className="text-sm text-gray-500">切换、固定、筛选都在这里</p>
              </div>
              <Button
                onClick={() => setShowChildMenu(false)}
                variant="secondary"
                className="rounded-xl border-none bg-gray-100 text-gray-600 shadow-none"
              >
                <ChevronDown size={16} />
              </Button>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                onClick={() => setShowFavoritesOnly((v) => !v)}
                variant="secondary"
                className="w-full rounded-2xl border-none bg-amber-50 text-amber-700 shadow-none"
              >
                {showFavoritesOnly ? "显示全部孩子" : "只看常用孩子"}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <span className="block font-bold text-slate-700">{savedChildSessions.length}</span>
                <span>已保存账号</span>
              </div>
              <div className="rounded-2xl bg-amber-50 px-3 py-2">
                <span className="block font-bold text-amber-700">{favoriteChildIds.length}</span>
                <span>常用账号</span>
              </div>
            </div>
            <div className="space-y-2">
              {visibleChildren.length > 0 ? (
                visibleChildren.map((child) => childCard(child))
              ) : (
                <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  {showFavoritesOnly ? "暂无常用孩子" : "暂无已登录孩子"}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-2">
              <Button
                onClick={() => router.push("/child")}
                variant="secondary"
                className="flex-1 rounded-xl border-none bg-blue-50 text-blue-600 shadow-none"
              >
                去孩子页
              </Button>
              <Button onClick={logout} variant="secondary" className="p-2 rounded-xl text-gray-600 border-none bg-transparent shadow-none">
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <div className="dashboard-layout">
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
              onClick={() => handleNavClick(item.id)}
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

      <div className="main-wrapper flex flex-col min-h-screen">
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
                    {mounted && currentUser?.username ? currentUser.username : "家长"}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Button
                  onClick={() => setShowChildMenu((v) => !v)}
                  variant="secondary"
                  className="p-2 hover:bg-blue-50 rounded-xl text-blue-600 border-none bg-transparent shadow-none"
                >
                  <PanelsLeftRight size={20} />
                </Button>
                {childDrawer}
              </div>
              <Button onClick={logout} variant="secondary" className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 border-none bg-transparent shadow-none">
                <LogOut size={20} />
              </Button>
            </div>
            <div className="hidden lg:flex items-center gap-4 w-full justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {activeTab === "home" ? "首页" :
                   activeTab === "overview" ? "数据概览" :
                   activeTab === "audit" ? "任务审核" :
                   activeTab === "tasks" ? "任务管理" :
                   activeTab === "orders" ? "礼品核销" :
                   activeTab === "rewards" ? "奖品商城" :
                   activeTab === "family" ? "家庭成员" : "系统用户"}
                </h1>
                <p className="text-gray-500 text-sm mt-1">欢迎回来，开启美好的一天</p>
              </div>
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
                <div className="relative">
                  <Button
                    onClick={() => setShowChildMenu((v) => !v)}
                    variant="secondary"
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border-none bg-transparent shadow-none transition-colors"
                  >
                    <PanelsLeftRight size={20} />
                  </Button>
                  {childDrawer}
                </div>
                <Button onClick={logout} variant="secondary" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border-none bg-transparent shadow-none transition-colors">
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="main-area flex-1 overflow-auto">
          <div className="main-inner !m-0">{children}</div>
        </main>

        <nav className="lg:hidden mobile-nav fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50">
          <TabFilter
            items={navItems.map(item => ({ key: item.id, label: item.label }))}
            activeKey={activeTab}
            onFilterChange={(key) => handleNavClick(key as NavItemId)}
            className="bg-transparent border-none shadow-none p-0"
          />
        </nav>
      </div>
    </div>
  );
};

export default Layout;
