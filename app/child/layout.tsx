"use client";

import { useApp } from "@/context/AppContext";
import { usePathname, useRouter } from "next/navigation";
import { Button, Input, PasswordInput } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
import {
  Settings,
  LogOut,
  User as UserIcon,
  Bell,
  Home,
  ArrowUp,
  ShoppingBag,
  Wallet,
  ClipboardList,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  MessageCircleQuestion,
  Gift,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { applyDocumentTheme, resolvePreferredTheme, setThemeStorage } from "@/lib/theme";

interface ChildLayoutProps {
  children: React.ReactNode;
}

const CHILD_DARK_BODY_THEME_VARS: Record<string, string> = {
  "--child-bg": "#0f172a",
  "--child-bg-soft": "#111827",
  "--child-bg-accent": "#1e293b",
  "--child-surface": "rgba(15, 23, 42, 0.86)",
  "--child-surface-strong": "rgba(15, 23, 42, 0.96)",
  "--child-surface-muted": "rgba(30, 41, 59, 0.82)",
  "--child-border": "rgba(148, 163, 184, 0.26)",
  "--child-border-strong": "rgba(125, 211, 252, 0.28)",
  "--child-text": "#f8fafc",
  "--child-text-muted": "#cbd5e1",
  "--ui-text-primary": "#f8fafc",
  "--ui-text-secondary": "#e2e8f0",
  "--ui-text-muted": "#94a3b8",
  "--ui-text-soft": "#64748b",
  "--ui-surface-1": "rgba(15, 23, 42, 0.94)",
  "--ui-surface-2": "rgba(30, 41, 59, 0.9)",
  "--ui-surface-3": "rgba(30, 41, 59, 0.76)",
  "--ui-panel-bg": "rgba(15, 23, 42, 0.96)",
  "--ui-panel-bg-subtle": "rgba(30, 41, 59, 0.82)",
  "--ui-border": "rgba(71, 85, 105, 0.82)",
  "--ui-border-strong": "rgba(100, 116, 139, 0.7)",
  "--ui-focus": "rgba(96, 165, 250, 1)",
  "--ui-focus-ring": "rgba(96, 165, 250, 0.16)",
  "--ui-shadow-sm": "0 8px 20px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(148, 163, 184, 0.08)",
  "--ui-shadow-md": "0 14px 34px rgba(2, 6, 23, 0.44)",
  "--ui-shadow-lg": "0 18px 34px rgba(2, 6, 23, 0.5), inset 0 1px 0 rgba(148, 163, 184, 0.1)",
  "--ui-primary-bg": "linear-gradient(90deg, rgba(96, 165, 250, 0.98) 0%, rgba(59, 130, 246, 0.98) 100%)",
  "--ui-primary-border": "rgba(191, 219, 254, 0.3)",
  "--ui-primary-shadow": "0 10px 26px rgba(37, 99, 235, 0.42), 0 6px 16px rgba(59, 130, 246, 0.24)",
  "--ui-primary-shadow-hover": "0 14px 32px rgba(37, 99, 235, 0.46), 0 8px 18px rgba(59, 130, 246, 0.28)",
  "--ui-overlay-bg": "rgba(2, 6, 23, 0.62)",
  "--control-surface-bg": "rgba(15, 23, 42, 0.9)",
  "--control-surface-bg-hover": "rgba(30, 41, 59, 0.96)",
  "--control-border-color": "rgba(71, 85, 105, 0.82)",
  "--control-border-color-hover": "rgba(148, 163, 184, 0.46)",
  "--control-border-color-focus": "rgba(96, 165, 250, 1)",
  "--control-panel-bg": "rgba(15, 23, 42, 0.98)",
  "--control-box-shadow": "0 8px 20px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(148, 163, 184, 0.08)",
  "--control-box-shadow-hover": "0 14px 28px rgba(2, 6, 23, 0.42), inset 0 1px 0 rgba(148, 163, 184, 0.1)",
  "--control-box-shadow-focus": "0 14px 28px rgba(59, 130, 246, 0.18), inset 0 1px 0 rgba(148, 163, 184, 0.08)",
};

function ChildAccountSignIn({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("请输入孩子账号和密码");
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.message || "登录失败");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: "var(--z-child-overlay)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/95 p-6 text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.22)]" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">👶</div>
          <h3 className="text-xl font-bold text-gray-800">添加/切换孩子账号</h3>
          <p className="text-gray-600 text-sm">登录后会保留之前已登录的孩子账号</p>
        </div>

        <div className="space-y-4">
          <Input label="孩子账号" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入孩子账号" />
          <PasswordInput label="密码" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-100 px-4 py-2 text-center text-sm text-red-600">{error}</div>}

        <div className="mt-5 flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            取消
          </Button>
          <Button fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChildLayout({ children }: ChildLayoutProps) {
  const { currentUser, savedChildSessions, favoriteChildIds, switchToChild, toggleFavoriteChild, reorderChildSessions, resetChildOrder, logout } = useApp();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const isHomePage = pathname === "/child" || pathname === "/child/";
  const isStorePage = pathname === "/child/store";
  const isWalletPage = pathname === "/child/wallet";
  const isTaskPage = pathname === "/child/task";
  const isGiftPage = pathname === "/child/gift";
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const shellScrollRef = useRef<HTMLDivElement | null>(null);

  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  const [showChildAccountSignIn, setShowChildAccountSignIn] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [draggingChildId, setDraggingChildId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("little_achievers_notifications") !== "false";
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("little_achievers_reduced_motion") === "true";
  });
  const [isDarkMode, setIsDarkMode] = useState(() => resolvePreferredTheme("child") === "dark");
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [focusReminderEnabled, setFocusReminderEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("little_achievers_focus_reminder") !== "false";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("little_achievers_notifications", String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("little_achievers_reduced_motion", String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setThemeStorage("child", isDarkMode ? "dark" : "light");
    applyDocumentTheme(isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.toggle("child-theme-dark", isDarkMode);
    if (isDarkMode) {
      Object.entries(CHILD_DARK_BODY_THEME_VARS).forEach(([key, value]) => {
        document.body.style.setProperty(key, value);
      });
    } else {
      Object.keys(CHILD_DARK_BODY_THEME_VARS).forEach((key) => {
        document.body.style.removeProperty(key);
      });
    }

    return () => {
      document.body.classList.remove("child-theme-dark");
      Object.keys(CHILD_DARK_BODY_THEME_VARS).forEach((key) => {
        document.body.style.removeProperty(key);
      });
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("little_achievers_focus_reminder", String(focusReminderEnabled));
  }, [focusReminderEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const scrollElement = isMobileViewport ? shellScrollRef.current : mainScrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      setShowScrollTop(scrollElement.scrollTop > 300);
    };

    handleScroll();
    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [isMobileViewport]);

  useEffect(() => {
    const scrollElement = isMobileViewport ? shellScrollRef.current : mainScrollRef.current;
    if (!scrollElement) return;
    scrollElement.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, isMobileViewport]);

  const scrollToTop = () => {
    const scrollElement = isMobileViewport ? shellScrollRef.current : mainScrollRef.current;
    scrollElement?.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const handleLogout = () => {
    setShowConfirmLogout(true);
  };

  const confirmLogout = () => {
    logout();
    setShowConfirmLogout(false);
  };

  const copySupportText = async () => {
    const text = `我是 ${currentUser?.username || "孩子"}，我需要帮助。`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制求助信息");
    } catch {
      toast.error("复制失败，请手动重试");
    }
  };

  const currentSessionIndex = savedChildSessions.findIndex((child) => child.id === currentUser?.id);
  const nextSession = currentSessionIndex >= 0 ? savedChildSessions[(currentSessionIndex + 1) % savedChildSessions.length] : null;
  const previousSession =
    currentSessionIndex > 0
      ? savedChildSessions[currentSessionIndex - 1]
      : savedChildSessions.length > 1
        ? savedChildSessions[savedChildSessions.length - 1]
        : null;

  const handleDropChild = (targetId: string) => {
    if (!draggingChildId) return;
    if (draggingChildId !== targetId) {
      reorderChildSessions(draggingChildId, targetId);
    }
    setDraggingChildId(null);
  };

  return (
    <div className={`child-app ${isDarkMode ? "child-app-dark" : "child-app-light"} ${reducedMotion ? "child-reduced-motion" : ""}`}>
      {showChildSwitcher && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: "var(--z-child-overlay)" }}
          onClick={() => setShowChildSwitcher(false)}
        >
          <div className="w-full max-w-sm rounded-[32px] border border-slate-200/70 bg-white/95 p-6 text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.2)] backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔄</div>
              <h3 className="text-xl font-bold text-gray-800">切换孩子</h3>
              <p className="text-gray-600">选择要切换的孩子</p>
            </div>
            <div className="mb-4 rounded-[22px] border border-slate-200/70 bg-slate-50/90 p-4 text-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">已登录孩子</p>
                  <p className="text-sm text-slate-600">
                    {savedChildSessions.length > 0 ? `${savedChildSessions.length} 个账号可切换` : "当前设备还没有其他孩子账号"}
                  </p>
                </div>
                <Button
                  onClick={resetChildOrder}
                  variant="secondary"
                className="h-9 rounded-full border-none bg-white px-3 text-xs font-semibold text-slate-600 shadow-none ring-1 ring-slate-200/70"
              >
                恢复顺序
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => previousSession && switchToChild(previousSession)}
                  variant="secondary"
                  disabled={!previousSession}
                  className="h-10 rounded-full border-none bg-white px-3 text-xs font-semibold text-slate-600 shadow-none ring-1 ring-slate-200/70 disabled:opacity-40"
                >
                  上一个
                </Button>
                <Button
                  onClick={() => nextSession && switchToChild(nextSession)}
                  variant="secondary"
                  disabled={!nextSession}
                  className="h-10 rounded-full border-none bg-white px-3 text-xs font-semibold text-slate-600 shadow-none ring-1 ring-slate-200/70 disabled:opacity-40"
                >
                  下一个
                </Button>
              </div>
            </div>
            <div className="space-y-3 mb-4 max-h-[42vh] overflow-y-auto pr-1">
              {savedChildSessions.map((child, index) => {
                const isActive = child.id === currentUser?.id;
                const isFavorite = favoriteChildIds.includes(child.id);

                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => switchToChild(child)}
                    draggable
                    onDragStart={() => setDraggingChildId(child.id)}
                    onDragEnd={() => setDraggingChildId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropChild(child.id)}
                    className={`w-full flex items-center gap-4 rounded-[22px] border p-4 text-left transition ${
                      isActive ? "border-sky-200 bg-sky-50/90" : "border-slate-200/70 bg-white hover:bg-slate-50"
                    } ${draggingChildId === child.id ? "scale-[0.99] opacity-70" : ""}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-amber-100 to-orange-100 text-2xl shadow-[0_10px_18px_rgba(15,23,42,0.08)]">
                      {child.avatar || "👶"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-gray-800">{child.username}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200/70">#{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-500">🪙 {child.availablePoints} 积分</p>
                      <div className="mt-1 flex items-center gap-2">
                        {isActive && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 ring-1 ring-sky-100">当前</span>}
                        {isFavorite && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">常用</span>}
                        <span className="text-[10px] font-medium text-slate-400">拖动可排序</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteChild(child.id);
                      }}
                      className="rounded-full p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-500"
                      aria-label={isFavorite ? "取消常用" : "设为常用"}
                    >
                      <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                  </button>
                );
              })}
            </div>
            <div className="mb-4 rounded-[22px] border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-700">
              只要该孩子账号在本设备上登录过，就可以直接切换。
            </div>
            <Button onClick={() => setShowChildAccountSignIn(true)} variant="secondary" fullWidth className="mb-3">
              添加/切换孩子账号
            </Button>
            <Button onClick={() => setShowChildSwitcher(false)} variant="secondary" fullWidth>
              取消
            </Button>
          </div>
        </div>
      )}

      {showChildAccountSignIn && (
        <ChildAccountSignIn
          onClose={() => setShowChildAccountSignIn(false)}
          onSuccess={() => {
            setShowChildAccountSignIn(false);
            setShowChildSwitcher(false);
          }}
        />
      )}

      <ConfirmModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        onConfirm={confirmLogout}
        title="退出登录"
        message="确定要退出当前账号吗？"
        confirmText="退出"
        cancelText="取消"
        // type='danger'
      />

      <div ref={shellScrollRef} className="child-shell">
        <aside className="child-nav-rail" aria-label="孩子端导航">
          <button
            type="button"
            onClick={() => setShowChildSwitcher(true)}
            className="mb-2 flex h-16 w-full items-center justify-center rounded-[24px] bg-white/90 text-3xl shadow-sm ring-1 ring-white"
            aria-label="切换孩子"
          >
            {currentUser?.avatar || "👦"}
          </button>
          {[
            { href: "/child", icon: Home, label: "首页", isActive: isHomePage },
            { href: "/child/task", icon: ClipboardList, label: "任务", isActive: isTaskPage },
            { href: "/child/store", icon: ShoppingBag, label: "商城", isActive: isStorePage },
            { href: "/child/gift", icon: Gift, label: "奖品", isActive: isGiftPage },
            { href: "/child/wallet", icon: Wallet, label: "钱包", isActive: isWalletPage },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={`child-nav-item ${item.isActive ? "child-nav-item-active" : ""}`}
            >
              <item.icon size={22} strokeWidth={2.5} />
              <span className="text-[11px] font-black">{item.label}</span>
            </button>
          ))}
          <div className="mt-auto flex w-full flex-col gap-2">
            <button type="button" onClick={() => setShowSettingsModal(true)} className="child-nav-item min-h-[52px]" aria-label="设置">
              <Settings size={21} />
              <span className="text-[11px] font-black">设置</span>
            </button>
          </div>
        </aside>

        <div className="child-workspace">
          <header className="child-topbar">
            <button type="button" onClick={() => setShowChildSwitcher(true)} className="flex min-w-0 items-center gap-3 text-left">
              <span className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-3xl shadow-sm ring-1 ring-white">
                {currentUser?.avatar || "👦"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xl font-black text-[var(--child-text)]">{currentUser?.username || "小探险家"}</span>
                <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  在线学习中
                </span>
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-800 ring-1 ring-yellow-100">
                积分 {currentUser?.availablePoints || 0}
              </div>
              <ThemeToggle
                theme={isDarkMode ? "dark" : "light"}
                onToggle={() => {
                  const next = !isDarkMode;
                  setIsDarkMode(next);
                  toast.success(next ? "已切换到深色主题" : "已切换到浅色主题");
                }}
                variant="pill"
                className="border-[var(--child-border)] bg-[var(--child-surface-strong)] text-[var(--child-text)]"
              />
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--child-surface-strong)] text-[var(--child-text-muted)] shadow-sm ring-1 ring-[var(--child-border)] transition hover:text-rose-600"
                aria-label="退出登录"
              >
                <LogOut size={20} />
              </button>
            </div>
          </header>

          <main className="child-main">
            <div ref={mainScrollRef} className="child-main-scroll hide-scrollbar">
              <div className="mx-auto max-w-6xl">{children}</div>
            </div>
          </main>
        </div>
      </div>

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-28 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-200 bg-white/90 text-sky-600 shadow-lg transition-all hover:bg-white active:scale-95 md:bottom-6 md:right-6"
          aria-label="回到顶部"
        >
          <ArrowUp size={24} />
        </button>
      )}

      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ zIndex: "var(--z-child-overlay-strong)" }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-white text-slate-800 shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 px-6 py-5 text-white">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/30 blur-2xl" />
                <div className="absolute left-4 bottom-0 h-20 w-20 rounded-full bg-cyan-300/30 blur-2xl" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                    <Sparkles size={14} />
                    孩子设置
                  </div>
                  <h3 className="text-2xl font-black">个人中心</h3>
                  <p className="mt-1 text-sm text-white/80">管理提醒、主题和使用帮助</p>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6 hide-scrollbar">
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    router.push("/child/wallet");
                  }}
                  className="rounded-3xl border border-sky-100 bg-sky-50/80 p-4 text-left transition hover:-translate-y-0.5 hover:bg-sky-50"
                >
                  <UserIcon size={20} className="text-sky-600" />
                  <p className="mt-3 text-sm font-bold">个人信息</p>
                  <p className="mt-1 text-[11px] text-slate-500">资料与积分</p>
                </button>
                <button
                  onClick={() => {
                    const next = !notificationsEnabled;
                    setNotificationsEnabled(next);
                    toast.info(next ? "通知已开启" : "通知已关闭");
                  }}
                  className="rounded-3xl border border-violet-100 bg-violet-50/80 p-4 text-left transition hover:-translate-y-0.5 hover:bg-violet-50"
                >
                  <Bell size={20} className="text-violet-600" />
                  <p className="mt-3 text-sm font-bold">通知</p>
                  <p className="mt-1 text-[11px] text-slate-500">{notificationsEnabled ? "已开启" : "已关闭"}</p>
                </button>
                <ThemeToggle
                  theme={isDarkMode ? "dark" : "light"}
                  onToggle={() => {
                    const next = !isDarkMode;
                    setIsDarkMode(next);
                    toast.success(next ? "已切换到深色主题" : "已切换到浅色主题");
                  }}
                  variant="tile"
                  className="border-amber-100 bg-amber-50/80 hover:bg-amber-50"
                />
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  快捷偏好
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setFocusReminderEnabled((v) => {
                        const next = !v;
                        toast.info(next ? "专注提醒已开启" : "专注提醒已关闭");
                        return next;
                      });
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">专注提醒</p>
                      <p className="text-xs text-slate-500">提醒我按时查看任务和奖励</p>
                    </div>
                    <span
                      className={`relative h-7 w-12 rounded-full transition ${
                        focusReminderEnabled ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          focusReminderEnabled ? "left-6" : "left-1"
                        }`}
                      />
                    </span>
                  </button>
                  <button
                    onClick={() => setReducedMotion((v) => !v)}
                    className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">减少动画</p>
                      <p className="text-xs text-slate-500">降低弹窗与页面动画强度</p>
                    </div>
                    <span className={`text-sm font-bold ${reducedMotion ? "text-emerald-600" : "text-slate-400"}`}>
                      {reducedMotion ? "开启" : "关闭"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <MessageCircleQuestion size={18} className="text-blue-600" />
                  帮助与支持
                </div>
                <div className="grid gap-3">
                  <button
                    onClick={() => {
                      toast.info("遇到问题时可以先查看任务页和钱包页的说明。");
                      setShowSettingsModal(false);
                      router.push("/child/wallet");
                    }}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">查看使用指南</p>
                      <p className="text-xs text-slate-500">从钱包页查看积分和记录</p>
                    </div>
                    <ArrowRight size={18} className="text-slate-400" />
                  </button>
                  <button
                    onClick={copySupportText}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">复制求助消息</p>
                      <p className="text-xs text-slate-500">可直接发给家长或管理员</p>
                    </div>
                    <Volume2 size={18} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-rose-600 transition hover:bg-rose-100"
              >
                <LogOut size={18} />
                <div className="flex-1 text-left">
                  <p className="font-bold">退出登录</p>
                  <p className="text-xs text-rose-500/80">切换到其他账号</p>
                </div>
                <Star size={16} className="opacity-60" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
