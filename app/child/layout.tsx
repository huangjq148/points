"use client";

import { useApp } from "@/context/AppContext";
import { usePathname, useRouter } from "next/navigation";
import { Button, Input, PasswordInput } from "@/components/ui";
import { useState, useEffect } from "react";
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

function generateStars() {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    delay: `${Math.random() * 3}s`,
  }));
}

function StarsBackground() {
  const [stars, setStars] = useState<ReturnType<typeof generateStars>>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setStars(generateStars());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle 3s infinite`,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

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
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
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
    if (typeof window === "undefined") return;
    localStorage.setItem("little_achievers_focus_reminder", String(focusReminderEnabled));
  }, [focusReminderEnabled]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const shellBackground = isDarkMode
    ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 48%, #312e81 100%)"
    : "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)";

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
    <div
      className="relative min-h-screen text-white"
      style={{
        background: shellBackground,
      }}
    >
      <style jsx global>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(2deg);
          }
        }
        @keyframes blink {
          0%,
          90%,
          100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
        }
        .character-eye {
          animation: blink 4s infinite;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>

      <StarsBackground />

      {showChildSwitcher && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: "var(--z-child-overlay)" }}
          onClick={() => setShowChildSwitcher(false)}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔄</div>
              <h3 className="text-xl font-bold text-gray-800">切换孩子</h3>
              <p className="text-gray-600">选择要切换的孩子</p>
            </div>
            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-slate-800">
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
                  className="h-9 rounded-xl border-none bg-white px-3 text-xs font-semibold text-slate-600 shadow-none"
                >
                  恢复顺序
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => previousSession && switchToChild(previousSession)}
                  variant="secondary"
                  disabled={!previousSession}
                  className="h-10 rounded-xl border-none bg-white px-3 text-xs font-semibold text-slate-600 shadow-none disabled:opacity-40"
                >
                  上一个
                </Button>
                <Button
                  onClick={() => nextSession && switchToChild(nextSession)}
                  variant="secondary"
                  disabled={!nextSession}
                  className="h-10 rounded-xl border-none bg-white px-3 text-xs font-semibold text-slate-600 shadow-none disabled:opacity-40"
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
                    className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      isActive ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-gray-50 hover:bg-gray-100"
                    } ${draggingChildId === child.id ? "scale-[0.99] opacity-70" : ""}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-2xl shadow-sm">
                      {child.avatar || "👶"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-gray-800">{child.username}</p>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">#{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-500">🪙 {child.availablePoints} 积分</p>
                      <div className="mt-1 flex items-center gap-2">
                        {isActive && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">当前</span>}
                        {isFavorite && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">常用</span>}
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
            <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
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

      <header
        className="fixed top-0 left-0 right-0 z-50 px-6 pt-4"
        style={{
          background: shellBackground,
        }}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {!isHomePage && (
              <button
                onClick={() => router.push("/child")}
                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 border border-white/30"
              >
                <Home size={20} />
              </button>
            )}
            <div className="flex items-center gap-4" onClick={() => setShowChildSwitcher(true)}>
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border-4 relative overflow-hidden"
                  style={{
                    background: isHomePage ? "white" : "white",
                    borderColor: "#fbbf24",
                  }}
                >
                  <span className="character-eye">{currentUser?.avatar || "👦"}</span>
                  <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-blue-100 to-transparent opacity-50"></div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white drop-shadow-lg">{currentUser?.username || "小探险家"}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-bold border border-white/30">
                    ⭐ 小探险家
                  </span>
                  <span className="bg-green-400/80 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    在线
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 border border-white/30"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 border border-white/30"
            >
              <LogOut size={20} />
            </button>
            <div className="h-10 px-3 rounded-xl flex items-center justify-center shadow-sm font-bold bg-white/20 text-white border border-white/30">
              🪙 {currentUser?.availablePoints || 0}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 sm:px-6 pb-24 pt-44">
        <div className={`mx-auto ${isStorePage ? "max-w-4xl" : "max-w-2xl"}`}>{children}</div>
      </main>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-purple-600 shadow-lg hover:bg-white transition-all active:scale-95 border-2 border-purple-300"
        >
          <ArrowUp size={24} />
        </button>
      )}

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 pb-safe">
        <div className="relative overflow-visible rounded-3xl shadow-[0_22px_44px_rgba(30,27,75,0.28)]">
          <div className="absolute inset-0 bg-white/92 backdrop-blur-xl border-2 border-white/60 rounded-3xl"></div>
          <div className="relative px-2 py-2.5 flex justify-between items-end">
            {[
              {
                href: "/child",
                icon: Home,
                label: "首页",
                isActive: isHomePage,
                bgColor: "from-blue-500 to-indigo-600",
                textColor: "text-blue-700",
                isCenter: false,
              },
              {
                href: "/child/task",
                icon: ClipboardList,
                label: "任务",
                isActive: isTaskPage,
                bgColor: "from-orange-500 to-amber-600",
                textColor: "text-orange-700",
                isCenter: false,
              },
              {
                href: "/child/store",
                icon: ShoppingBag,
                label: "商城",
                isActive: isStorePage,
                bgColor: "from-pink-500 to-rose-600",
                textColor: "text-pink-700",
                isCenter: true,
              },
              {
                href: "/child/gift",
                icon: Gift,
                label: "奖品",
                isActive: isGiftPage,
                bgColor: "from-amber-500 to-orange-600",
                textColor: "text-amber-700",
                isCenter: false,
              },
              {
                href: "/child/wallet",
                icon: Wallet,
                label: "钱包",
                isActive: isWalletPage,
                bgColor: "from-violet-500 to-purple-600",
                textColor: "text-violet-700",
                isCenter: false,
              },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`group relative flex flex-col items-center justify-center min-w-[70px] px-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                  item.isCenter ? "-mt-5 pt-0 pb-1" : "py-1.5"
                } ${item.isActive ? "text-white" : `${item.textColor} hover:text-gray-800`}`}
              >
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-200 ${
                    item.isActive
                      ? `bg-gradient-to-br ${item.bgColor} shadow-[0_10px_20px_rgba(79,70,229,0.35)]`
                      : "bg-slate-100 group-hover:bg-slate-200"
                  }`}
                ></div>
                {item.isActive && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/35 via-white/10 to-transparent"></div>
                  </div>
                )}
                <div
                  className={`relative ${
                    item.isCenter ? "w-14 h-14 rounded-2xl" : "w-10 h-10 rounded-xl"
                  } flex items-center justify-center transition-transform duration-200 ${
                    item.isActive ? "scale-105" : "group-hover:scale-105"
                  }`}
                >
                  <item.icon
                    size={item.isCenter ? 24 : 21}
                    strokeWidth={item.isActive ? 2.6 : 2.3}
                    className={`transition-opacity duration-200 ${
                      item.isActive ? "opacity-100 drop-shadow-sm" : "opacity-80 group-hover:opacity-100"
                    }`}
                  />
                </div>
                <span
                  className={`relative text-[11px] font-extrabold tracking-wide transition-all duration-200 ${
                    item.isActive ? "opacity-100" : "opacity-75 group-hover:opacity-100"
                  }`}
                >
                  {item.label}
                </span>
                {item.isActive && (
                  <div className="absolute -top-1 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

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
