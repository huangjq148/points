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
} from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmModal from "./ConfirmModal";

interface ChildContextType {
  showMessage: (msg: string) => void;
}

const ChildContext = createContext<ChildContextType>({ showMessage: () => {} });

export const useChild = () => useContext(ChildContext);

export default function ChildShell({ children }: { children: React.ReactNode }) {
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
    return "tasks";
  })();

  const [showPinModal, setShowPinModal] = useState(false);
  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
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
      <div className="min-h-screen child-theme pb-16 md:pb-8">
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

        <header className="px-6 py-2 flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-blue-50">
           <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setShowChildSwitcher(true)}
            >
              <div className="text-3xl bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center border-2 border-white shadow-sm">
                {currentUser?.avatar}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <h1 className="font-bold text-gray-800 text-base leading-tight max-w-[120px] truncate">
                    {currentUser?.username}
                  </h1>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
                <p className="text-[10px] text-blue-500 font-medium">小小奋斗者 🌟</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Button
                onClick={() => setShowPinModal(true)}
                variant="secondary"
                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 p-0 border-none shadow-none"
              >
                <Lock size={18} className="text-blue-600" />
              </Button>
              <Button
                onClick={handleLogout}
                variant="secondary"
                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 p-0 border-none shadow-none"
              >
                <LogOut size={18} className="text-gray-600" />
              </Button>
              <div className="h-10 px-3 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600 font-bold border border-blue-100 min-w-[60px]">
                🪙 {currentUser?.availablePoints || 0}
              </div>
            </div>
        </header>

        <main className="px-6 pt-4 md:max-w-4xl md:mx-auto min-h-[calc(100vh-120px)] overflow-auto pb-20">
          {children}
        </main>

        <nav className="nav-bar">
          <Button
            onClick={() => router.push(`/child/task`)}
            variant="secondary"
            className={`nav-item ${activeTab === "tasks" ? "active" : ""} flex-col h-auto p-2 border-none bg-transparent shadow-none`}
          >
            <Star size={24} />
            <span className="text-xs">任务</span>
          </Button>
          <Button
            onClick={() => router.push(`/child/store`)}
            variant="secondary"
            className={`nav-item ${activeTab === "store" ? "active" : ""} flex-col h-auto p-2 border-none bg-transparent shadow-none`}
          >
            <Gift size={24} />
            <span className="text-xs">商城</span>
          </Button>
          <Button
            onClick={() => router.push(`/child/wallet`)}
            variant="secondary"
            className={`nav-item ${activeTab === "wallet" ? "active" : ""} flex-col h-auto p-2 border-none bg-transparent shadow-none`}
          >
            <Wallet size={24} />
            <span className="text-xs">钱包</span>
          </Button>
        </nav>
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
