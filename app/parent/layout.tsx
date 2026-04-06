"use client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PasswordInput from "@/components/ui/PasswordInput";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/context/AppContext";
import request from "@/utils/request";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { applyDocumentTheme, resolvePreferredTheme, setThemeStorage } from "@/lib/theme";
import { ChevronDown, FileText, Gift, Home, KeyRound, LogOut, Settings, Star, Ticket, UserCog, Users, PanelLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
    desc: "管理家庭关系、邀请成员，并为孩子加减积分。",
  },
  users: {
    title: "系统用户",
    desc: "管理后台系统用户，配置账号权限和状态",
  },
};

export default function ParentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, logout, childList, refreshCurrentUser } = useApp();
  const router = useRouter();
  const toast = useToast();
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
  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const navItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [navIndicatorStyle, setNavIndicatorStyle] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [parentTheme, setParentTheme] = useState<"light" | "dark">(() => resolvePreferredTheme("parent"));
  const [profileForm, setProfileForm] = useState({
    username: "",
    nickname: "",
    gender: "none" as "boy" | "girl" | "none",
  });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleNavClick = (itemId: NavItemId) => {
    router.push(`/parent/${itemId}`);
  };

  const updateTooltipPosition = (event: MouseEvent<HTMLButtonElement>, label: string) => {
    if (!sidebarCollapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      x: rect.right + 12,
      y: rect.top + rect.height / 2,
    });
  };

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeIndex = navItems.findIndex((item) => item.id === activeTab);
      const container = navRef.current;
      const activeButton = navItemRefs.current[activeIndex];

      if (!container || !activeButton) {
        setNavIndicatorStyle(null);
        return;
      }

      setNavIndicatorStyle({
        width: activeButton.offsetWidth,
        height: activeButton.offsetHeight,
        x: activeButton.offsetLeft,
        y: activeButton.offsetTop,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(() => {
      updateIndicator();
    });

    if (navRef.current) {
      resizeObserver.observe(navRef.current);
    }

    navItemRefs.current.forEach((button) => {
      if (button) {
        resizeObserver.observe(button);
      }
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeTab, navItems, sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setThemeStorage("parent", parentTheme);
    applyDocumentTheme(parentTheme);
  }, [parentTheme]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    body.classList.add("parent-theme");
    body.classList.remove("parent-theme-light", "parent-theme-dark");
    body.classList.add(parentTheme === "dark" ? "parent-theme-dark" : "parent-theme-light");

    return () => {
      body.classList.remove("parent-theme", "parent-theme-light", "parent-theme-dark");
    };
  }, [parentTheme]);

  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event: MouseEvent | globalThis.MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const toggleTheme = () => {
    const next = parentTheme === "dark" ? "light" : "dark";
    setParentTheme(next);
    toast.success(next === "dark" ? "已切换到深色主题" : "已切换到浅色主题");
    setShowUserMenu(false);
  };

  const handleOpenProfileModal = () => {
    setProfileForm({
      username: currentUser?.username || "",
      nickname: currentUser?.nickname || currentUser?.identity || "",
      gender: currentUser?.gender || "none",
    });
    setShowUserMenu(false);
    setShowProfileModal(true);
  };

  const handleOpenPasswordModal = () => {
    setPasswordForm({ password: "", confirmPassword: "" });
    setShowUserMenu(false);
    setShowPasswordModal(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return;
    if (!profileForm.username.trim()) {
      toast.error("请输入用户名");
      return;
    }

    const data = await request("/api/user", {
      method: "PUT",
      body: {
        id: currentUser.id,
        username: profileForm.username.trim(),
        nickname: profileForm.nickname.trim(),
        gender: profileForm.gender,
      },
    });

    if (data.success) {
      await refreshCurrentUser();
      toast.success("用户信息已更新");
      setShowProfileModal(false);
      return;
    }

    toast.error(data.message || "更新失败");
  };

  const handleSavePassword = async () => {
    if (!currentUser?.id) return;
    if (!passwordForm.password) {
      toast.error("请输入新密码");
      return;
    }
    if (passwordForm.password.length < 6) {
      toast.error("密码至少需要 6 个字符");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    const data = await request("/api/user", {
      method: "PUT",
      body: {
        id: currentUser.id,
        password: passwordForm.password,
      },
    });

    if (data.success) {
      toast.success("密码已更新");
      setShowPasswordModal(false);
      setPasswordForm({ password: "", confirmPassword: "" });
      return;
    }

    toast.error(data.message || "密码更新失败");
  };

  return (
    <div className={`dashboard-layout parent-theme ${parentTheme === "dark" ? "parent-theme-dark" : "parent-theme-light"}`}>
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

        <div ref={navRef} className="desktop-nav">
          {navIndicatorStyle && (
            <div
              aria-hidden
              className="desktop-nav-indicator"
              style={{
                width: navIndicatorStyle.width,
                height: navIndicatorStyle.height,
                transform: `translate(${navIndicatorStyle.x}px, ${navIndicatorStyle.y}px)`,
              }}
            />
          )}
          {navItems.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                navItemRefs.current[index] = node;
              }}
              type="button"
              onClick={() => handleNavClick(item.id)}
              onMouseEnter={(event) => updateTooltipPosition(event, item.label)}
              onMouseMove={(event) => updateTooltipPosition(event, item.label)}
              onMouseLeave={() => setHoveredTooltip(null)}
              className={`desktop-nav-item ${activeTab === item.id ? "active" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}
              title={sidebarCollapsed ? item.label : undefined}
              aria-label={item.label}
            >
              <item.icon size={sidebarCollapsed ? 24 : 22} />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="badge">{item.badge}</span>
              )}
              {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="badge-collapsed">{item.badge}</span>
              )}
            </button>
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

      {hoveredTooltip && (
        <div
          className="sidebar-hover-tooltip"
          style={{ left: hoveredTooltip.x, top: hoveredTooltip.y }}
        >
          {hoveredTooltip.label}
        </div>
      )}

      <div className="main-wrapper flex flex-col min-h-screen">
        <header className="desktop-header">
          <div className="desktop-header-inner">
            <div>
              <h1 className="desktop-header-title">{TAB_TITLE[activeTab].title}</h1>
              <p className="desktop-header-subtitle">{TAB_TITLE[activeTab].desc}</p>
            </div>
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                className="desktop-header-user desktop-header-user-trigger"
                onClick={() => setShowUserMenu((prev) => !prev)}
                aria-label="打开用户菜单"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
              >
                <div className="desktop-header-avatar">
                  {currentUser?.username ? currentUser.username[0].toUpperCase() : "P"}
                </div>
                <div className="desktop-header-userinfo">
                  <span className="desktop-header-username">{currentUser?.nickname || currentUser?.username || "家长"}</span>
                  <span className="desktop-header-role">{parentTheme === "dark" ? "深色主题" : "浅色主题"}</span>
                </div>
                <span className="desktop-header-menu-trigger" aria-hidden="true">
                  <ChevronDown size={18} className={`transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`} />
                </span>
              </button>

                  {showUserMenu && (
                    <div className="desktop-user-menu">
                      <button type="button" className="desktop-user-menu-item" onClick={handleOpenProfileModal}>
                        <div className="desktop-user-menu-icon desktop-user-menu-icon-blue">
                          <Settings size={16} />
                        </div>
                        <div className="desktop-user-menu-copy">
                          <div className="desktop-user-menu-title">用户信息设置</div>
                          <div className="desktop-user-menu-subtitle">修改昵称、用户名和性别</div>
                        </div>
                      </button>

                      <button type="button" className="desktop-user-menu-item" onClick={handleOpenPasswordModal}>
                        <div className="desktop-user-menu-icon desktop-user-menu-icon-amber">
                          <KeyRound size={16} />
                        </div>
                        <div className="desktop-user-menu-copy">
                          <div className="desktop-user-menu-title">密码管理</div>
                          <div className="desktop-user-menu-subtitle">更新登录密码</div>
                        </div>
                      </button>

                      <ThemeToggle theme={parentTheme} onToggle={toggleTheme} variant="menu" />

                  <div className="desktop-user-menu-divider" />

                  <button
                    type="button"
                    className="desktop-user-menu-item desktop-user-menu-item-danger"
                    onClick={logout}
                  >
                    <div className="desktop-user-menu-icon desktop-user-menu-icon-rose">
                      <LogOut size={16} />
                    </div>
                    <div className="desktop-user-menu-copy">
                      <div className="desktop-user-menu-title">登出</div>
                      <div className="desktop-user-menu-subtitle">退出当前账号并返回登录页</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-area overflow-auto">
          <div className="main-inner parent-content-shell">{children}</div>
        </main>
      </div>

      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="用户信息设置"
        footer={
          <Button onClick={handleSaveProfile} fullWidth>
            保存资料
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="用户名"
            value={profileForm.username}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
          />
          <Input
            label="昵称"
            value={profileForm.nickname}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, nickname: e.target.value }))}
            placeholder="请输入昵称"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">性别</label>
            <Select
              value={profileForm.gender}
              onChange={(value) =>
                setProfileForm((prev) => ({
                  ...prev,
                  gender: (value as "boy" | "girl" | "none") || "none",
                }))
              }
              options={[
                { value: "none", label: "未设置" },
                { value: "boy", label: "男" },
                { value: "girl", label: "女" },
              ]}
              placeholder="选择性别"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="密码管理"
        footer={
          <Button onClick={handleSavePassword} fullWidth>
            更新密码
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="当前账号"
            value={currentUser?.username || ""}
            readOnly
            autoComplete="username"
          />
          <PasswordInput
            label="新密码"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="请输入至少 6 位的新密码"
            autoComplete="new-password"
          />
          <PasswordInput
            label="确认密码"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="请再次输入新密码"
            autoComplete="new-password"
          />
        </div>
      </Modal>
    </div>
  );
}
