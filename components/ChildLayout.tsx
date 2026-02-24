'use client';

import { useApp } from '@/context/AppContext';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useState, useEffect } from 'react';
import {
  Lock,
  ChevronDown,
  Settings,
  LogOut,
  User as UserIcon,
  Bell,
  HelpCircle,
  Moon,
  Home,
  ArrowUp,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import GamificationNotifier from './gamification/GamificationNotifier';

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
  const [stars] = useState(generateStars);

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

const LEVEL_TITLES = ['探险新手', '小小冒险家', '勇敢探险家', '智慧先锋', '金牌达人', '传奇英雄'];
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500];

function getLevelInfo(totalXP: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      const level = i + 1;
      const title = LEVEL_TITLES[Math.min(i, LEVEL_TITLES.length - 1)];
      return { level, title };
    }
  }
  return { level: 1, title: LEVEL_TITLES[0] };
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

export default function ChildLayout({ children }: ChildLayoutProps) {
  const { currentUser, childList, switchToChild, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  
  const totalXP = currentUser?.totalPoints || 0;
  const levelInfo = getLevelInfo(totalXP);
  
  const isHomePage = pathname === '/child' || pathname === '/child/';
  const isStorePage = pathname === '/child/store' || pathname === '/child/store';
  const isAchievementsPage = pathname === '/child/achievements' || pathname === '/child/achievements';
  const isWalletPage = pathname === '/child/wallet' || pathname === '/child/wallet';

  const [showPinModal, setShowPinModal] = useState(false);
  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchChild = (child: typeof currentUser) => {
    if (child) {
      switchToChild(child);
      setShowChildSwitcher(false);
    }
  };

  const handleLogout = () => {
    setShowConfirmLogout(true);
  };

  const confirmLogout = () => {
    logout();
    setShowConfirmLogout(false);
  };

  return (
    <div className="relative min-h-screen text-gray-800" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        .character-eye {
          animation: blink 4s infinite;
        }
        .glass-strong {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-radius: 1.5rem;
        }
      `}</style>
      
      <StarsBackground />
      <GamificationNotifier onViewAchievements={() => router.push('/child/achievements')} />
      
      {showPinModal && (
        <PinVerification onVerified={() => setShowPinModal(false)} onCancel={() => setShowPinModal(false)} />
      )}

      {showChildSwitcher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowChildSwitcher(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
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

      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {!isHomePage && (
              <button 
                onClick={() => router.push('/child')}
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
                    background: isHomePage ? 'white' : 'white',
                    borderColor: '#fbbf24',
                  }}
                >
                  <span className="character-eye">{currentUser?.avatar || '👦'}</span>
                  <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-blue-100 to-transparent opacity-50"></div>
                </div>
                <div 
                  className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-lg"
                  style={{ background: 'linear-gradient(to bottom right, #fbbf24, #f97316)' }}
                >
                  {levelInfo.level}
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white drop-shadow-lg">
                  {currentUser?.username || '小探险家'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-bold border border-white/30">
                    ⭐ {levelInfo.title}
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
              onClick={() => setShowPinModal(true)}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 border border-white/30"
            >
              <Lock size={20} />
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

      <main className="relative z-10 px-6 pb-24 pt-32">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-purple-600 shadow-lg hover:bg-white transition-all active:scale-95 border-2 border-purple-300"
        >
          <ArrowUp size={24} />
        </button>
      )}

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
        <div className="glass-strong px-4 py-3 flex justify-between items-center shadow-xl rounded-2xl">
          <button
            onClick={() => router.push('/child')}
            className={`flex flex-col items-center gap-1 p-2 ${isHomePage ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-500 transition-colors`}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform hover:scale-110"
              style={{ background: isHomePage ? '#dbeafe' : '#f3f4f6' }}
            >
              🏠
            </div>
            <span className={`text-[10px] ${isHomePage ? 'font-black' : 'font-medium'}`}>首页</span>
          </button>
          
          <button
            onClick={() => router.push('/child/store')}
            className={`flex flex-col items-center gap-1 p-2 ${isStorePage ? 'text-pink-500' : 'text-gray-400'} hover:text-pink-500 transition-colors`}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform hover:scale-110"
              style={{ background: isStorePage ? '#fce7f3' : '#f3f4f6' }}
            >
              🎁
            </div>
            <span className={`text-[10px] ${isStorePage ? 'font-black' : 'font-medium'}`}>商城</span>
          </button>
          
          <button
            onClick={() => router.push('/child/achievements')}
            className={`flex flex-col items-center gap-1 p-2 ${isAchievementsPage ? 'text-orange-500' : 'text-gray-400'} hover:text-orange-500 transition-colors`}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform hover:scale-110"
              style={{ background: isAchievementsPage ? '#ffedd5' : '#f3f4f6' }}
            >
              🏅
            </div>
            <span className={`text-[10px] ${isAchievementsPage ? 'font-black' : 'font-medium'}`}>成就</span>
          </button>
          
          <button
            onClick={() => router.push('/child/wallet')}
            className={`flex flex-col items-center gap-1 p-2 ${isWalletPage ? 'text-purple-600' : 'text-gray-400'} hover:text-purple-500 transition-colors`}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform hover:scale-110"
              style={{ background: isWalletPage ? '#f3e8ff' : '#f3f4f6' }}
            >
              👤
            </div>
            <span className={`text-[10px] ${isWalletPage ? 'font-black' : 'font-medium'}`}>我的</span>
          </button>
        </div>
      </nav>

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
  );
}
