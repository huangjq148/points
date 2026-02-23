"use client";

import { useState, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp, User } from "@/context/AppContext";
import {
  Wallet,
  Lock,
  Star,
  Gift,
  LogOut,
  ChevronDown,
  Trophy,
  Settings,
  User as UserIcon,
  Bell,
  HelpCircle,
  Moon,
} from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmModal from "./ConfirmModal";
import GamificationNotifier from "./gamification/GamificationNotifier";

interface ChildContextType {
  showMessage: (msg: string) => void;
}

const ChildContext = createContext<ChildContextType>({ showMessage: () => {} });

export const useChild = () => useContext(ChildContext);

export default function ChildShell({ children, showShell = true, isHomePage = false, pageTitle = "" }: { children: React.ReactNode; showShell?: boolean; isHomePage?: boolean; pageTitle?: string }) {
  const { currentUser, childList, switchToChild, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = (() => {
    const pathSegments = pathname.split("/");
    const currentTab = pathSegments[pathSegments.length - 1];
    if (currentTab === "task") return "tasks";
    if (currentTab === "store") return "store";
    if (currentTab === "wallet") return "wallet";
    if (currentTab === "gift") return "store";
    if (currentTab === "achievements") return "achievements";
    return "tasks";
  })();

  const [showPinModal, setShowPinModal] = useState(false);
  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleShowMessage = (msg: string) => {
    setMessage(msg);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const handleSwitchChild = (child: User) => {
    switchToChild(child);
    setShowChildSwitcher(false);
  };

  const handleLogout = () => {
    setShowConfirmLogout(true);
  };

  const confirmLogout = () => {
    logout();
    setShowConfirmLogout(false);
  };

  return (
      <ChildContext.Provider value={{ showMessage: handleShowMessage }}>
      <div className={`min-h-screen ${isHomePage ? 'child-home' : 'child-home pb-16 md:pb-8'}`}>
        <GamificationNotifier onViewAchievements={() => router.push('/child/achievements')} />
        
        {showPinModal && (
          <PinVerification onVerified={() => setShowPinModal(false)} onCancel={() => setShowPinModal(false)} />
        )}

        {showChildSwitcher && (
            <div className="modal-overlay" onClick={() => setShowChildSwitcher(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🔄</div>
                  <h3 className="text-xl font-bold text-gray-800">切换孩子</h3>
                  <p className="text-gray-600">选择要切换的孩子</p>
                </div>
                <div className="space-y-3 mb-4">
                  {childList.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => handleSwitchChild(child)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition ${
                        child.id === currentUser?.id
                          ? "bg-blue-100 border-2 border-blue-400"
                          : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                      }`}
                    >
                      <div className="text-3xl">{child.avatar}</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{child.username}</p>
                        <p className="text-sm text-gray-500">🪙 {child.availablePoints} 积分</p>
                      </div>
                      {child.id === currentUser?.id && <span className="text-blue-500 font-bold">当前</span>}
                    </div>
                  ))}
                </div>
                <Button onClick={() => setShowChildSwitcher(false)} variant="secondary" fullWidth>
                  取消
                </Button>
              </div>
            </div>
        )}

        {showMessage && (
          <div className="modal-overlay" onClick={() => setShowMessage(false)}>
            <div className="modal-content text-center" onClick={(e) => e.stopPropagation()}>
              <div className="text-5xl mb-4">💬</div>
              <p className="text-lg text-gray-800 whitespace-pre-line">{message}</p>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={showConfirmLogout}
          onClose={() => setShowConfirmLogout(false)}
          onConfirm={confirmLogout}
          title="退出登录"
          message="确定要退出当前账号吗？"
          confirmText="退出"
          cancelText="取消"
          type="danger"
        />

        {showShell && (
          <header className={`px-4 py-3 flex items-center justify-between sticky top-0 z-40 ${isHomePage ? 'bg-transparent' : 'bg-white/80 backdrop-blur-md border-b border-white/20'}`}>
             <div
               className="flex items-center gap-3 cursor-pointer"
               onClick={() => setShowChildSwitcher(true)}
             >
               <div className={`text-3xl rounded-full w-10 h-10 flex items-center justify-center border-2 border-white shadow-sm ${isHomePage ? 'bg-white/20' : 'bg-blue-100'}`}>
                 {currentUser?.avatar}
               </div>
               <div className="flex flex-col">
                 <div className="flex items-center gap-1">
                   <h1 className={`font-bold text-base leading-tight max-w-[100px] truncate ${isHomePage ? 'text-white' : 'text-gray-800'}`}>
                     {currentUser?.username}
                   </h1>
                   <ChevronDown size={14} className={isHomePage ? "text-white/70" : "text-gray-400"} />
                 </div>
                 {!isHomePage && <p className="text-[10px] text-blue-500 font-medium">小小奋斗者 🌟</p>}
               </div>
             </div>

              <div className="flex items-center gap-2">
                {!isHomePage && (
                  <>
                    <Button
                      onClick={() => setShowSettingsModal(true)}
                      variant="secondary"
                      className="w-9 h-9 bg-white/80 rounded-xl flex items-center justify-center shadow-sm hover:bg-white p-0 border-none"
                    >
                      <Settings size={16} className="text-gray-600" />
                    </Button>
                    <Button
                      onClick={() => setShowPinModal(true)}
                      variant="secondary"
                      className="w-9 h-9 bg-white/80 rounded-xl flex items-center justify-center shadow-sm hover:bg-white p-0 border-none"
                    >
                      <Lock size={16} className="text-blue-600" />
                    </Button>
                    <Button
                      onClick={handleLogout}
                      variant="secondary"
                      className="w-9 h-9 bg-white/80 rounded-xl flex items-center justify-center shadow-sm hover:bg-white p-0 border-none"
                    >
                      <LogOut size={16} className="text-gray-600" />
                    </Button>
                  </>
                )}
               {/* 积分显示 */}
               <div className={`h-9 px-3 rounded-xl flex items-center justify-center shadow-sm font-bold min-w-[60px] ${isHomePage ? 'bg-white/20 text-white border border-white/30' : 'bg-white border border-yellow-100 text-yellow-600'}`}>
                 🪙 {currentUser?.availablePoints || 0}
               </div>
             </div>
           </header>
        )}

        <main className={`px-4 pt-2 md:max-w-2xl md:mx-auto min-h-[calc(100vh-80px)] pb-24`}>
          {children}
        </main>

        {showShell && (
          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
          <div className="glass-strong rounded-3xl px-4 py-3 flex justify-between items-center border border-white/50">
            <Button
              onClick={() => router.push(`/child`)}
              variant="secondary"
              className={`flex flex-col items-center gap-0.5 p-2 ${activeTab === "tasks" || isHomePage ? "text-blue-600" : "text-gray-400"} hover:text-blue-500`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${activeTab === "tasks" || isHomePage ? "bg-blue-100" : "bg-gray-100"}`}>
                🏠
              </div>
              <span className={`text-[9px] ${activeTab === "tasks" || isHomePage ? "font-black" : "font-medium"}`}>首页</span>
            </Button>
            <Button
              onClick={() => router.push(`/child/store`)}
              variant="secondary"
              className={`flex flex-col items-center gap-0.5 p-2 ${activeTab === "store" ? "text-pink-500" : "text-gray-400"} hover:text-pink-500`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${activeTab === "store" ? "bg-pink-100" : "bg-gray-100"}`}>
                🎁
              </div>
              <span className={`text-[9px] ${activeTab === "store" ? "font-black" : "font-medium"}`}>商城</span>
            </Button>
            <Button
              onClick={() => router.push(`/child/achievements`)}
              variant="secondary"
              className={`flex flex-col items-center gap-0.5 p-2 ${activeTab === "achievements" ? "text-orange-500" : "text-gray-400"} hover:text-orange-500`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${activeTab === "achievements" ? "bg-orange-100" : "bg-gray-100"}`}>
                🏅
              </div>
              <span className={`text-[9px] ${activeTab === "achievements" ? "font-black" : "font-medium"}`}>成就</span>
            </Button>
            <Button
              onClick={() => router.push(`/child/wallet`)}
              variant="secondary"
              className={`flex flex-col items-center gap-0.5 p-2 ${activeTab === "wallet" ? "text-purple-600" : "text-gray-400"} hover:text-purple-500`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${activeTab === "wallet" ? "bg-purple-100" : "bg-gray-100"}`}>
                👤
              </div>
              <span className={`text-[9px] ${activeTab === "wallet" ? "font-black" : "font-medium"}`}>我的</span>
            </Button>
          </div>
          </nav>
        )}

        {/* 设置弹窗 */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowSettingsModal(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">设置</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => { setShowSettingsModal(false); router.push('/child/wallet'); }}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <UserIcon size={24} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-800">个人信息</p>
                    <p className="text-sm text-gray-500">查看和修改个人资料</p>
                  </div>
                  <ChevronDown size={20} className="text-gray-400 rotate-[-90deg]" />
                </button>
                
                <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Bell size={24} className="text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-800">通知设置</p>
                    <p className="text-sm text-gray-500">管理消息通知</p>
                  </div>
                  <ChevronDown size={20} className="text-gray-400 rotate-[-90deg]" />
                </button>
                
                <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Moon size={24} className="text-yellow-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-800">夜间模式</p>
                    <p className="text-sm text-gray-500">切换深色/浅色主题</p>
                  </div>
                  <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <HelpCircle size={24} className="text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-800">帮助中心</p>
                    <p className="text-sm text-gray-500">常见问题和使用指南</p>
                  </div>
                  <ChevronDown size={20} className="text-gray-400 rotate-[-90deg]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ChildContext.Provider>
  );
}

function PinVerification({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }) {
  const { switchToParent } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError("请输入4位PIN码");
      return;
    }
    const success = await switchToParent(pin);
    if (success) {
      onVerified();
    } else {
      setError("PIN码错误");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-3xl p-6 md:p-8 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔐</div>
          <h2 className="text-xl font-bold text-gray-800">家长验证</h2>
          <p className="text-gray-600">请输入4位PIN码</p>
        </div>

        <div className="flex gap-2 justify-center mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold border-2 border-gray-200"
            >
              {pin[i] || ""}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              onClick={() => pin.length < 4 && setPin(pin + num.toString())}
              variant="secondary"
              className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200 p-0 shadow-none border-none"
            >
              {num}
            </Button>
          ))}
          <Button
            onClick={() => setPin(pin.slice(0, -1))}
            variant="secondary"
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 p-0 shadow-none border-none"
          >
            删除
          </Button>
          <Button
            onClick={() => pin.length < 4 && setPin(pin + "0")}
            variant="secondary"
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200 p-0 shadow-none border-none"
          >
            0
          </Button>
          <Button
            onClick={() => setPin("")}
            variant="secondary"
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 p-0 shadow-none border-none"
          >
            清空
          </Button>
        </div>

        {error && <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-center mb-4">{error}</div>}

        <Button onClick={handleSubmit} variant="primary" fullWidth className="mb-3">
          确认
        </Button>
        <Button onClick={onCancel} variant="error" fullWidth className="text-white font-semibold py-3">
          取消
        </Button>
      </div>
    </div>
  );
}
