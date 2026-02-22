'use client';

import { useApp } from '@/context/AppContext';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import { useState } from 'react';

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

export default function ChildLayout({ children }: ChildLayoutProps) {
  const { currentUser } = useApp();
  const pathname = usePathname();
  
  const totalXP = currentUser?.totalPoints || 0;
  const levelInfo = getLevelInfo(totalXP);
  
  const isHomePage = pathname === '/child' || pathname === '/child/';
  const isStorePage = pathname === '/child/store' || pathname === '/child/store';
  const isAchievementsPage = pathname === '/child/achievements' || pathname === '/child/achievements';
  const isWalletPage = pathname === '/child/wallet' || pathname === '/child/wallet';

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
        .float-anim {
          animation: float 4s ease-in-out infinite;
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

      {/* 固定Header - 与首页完全一致 */}
      <header className="relative z-10 px-6 pt-12 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border-4 float-anim relative overflow-hidden"
                style={{
                  background: isHomePage ? 'white' : 'white',
                  borderColor: '#fbbf24',
                }}
              >
                <span className="character-eye">{currentUser?.avatar || '👦'}</span>
                <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-blue-100 to-transparent opacity-50"></div>
              </div>
              <div 
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-lg"
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
          
          <button 
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 border border-white/30"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="relative z-10 px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>

      {/* 固定底部导航 - 与首页完全一致 */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
        <div className="glass-strong px-4 py-3 flex justify-between items-center shadow-xl">
          <button
            onClick={() => window.location.href = '/child'}
            className={`flex flex-col items-center gap-1 p-2 ${isHomePage ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-500`}
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
            onClick={() => window.location.href = '/child/store'}
            className={`flex flex-col items-center gap-1 p-2 ${isStorePage ? 'text-pink-500' : 'text-gray-400'} hover:text-pink-500`}
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
            onClick={() => window.location.href = '/child/achievements'}
            className={`flex flex-col items-center gap-1 p-2 ${isAchievementsPage ? 'text-orange-500' : 'text-gray-400'} hover:text-orange-500`}
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
            onClick={() => window.location.href = '/child/wallet'}
            className={`flex flex-col items-center gap-1 p-2 ${isWalletPage ? 'text-purple-600' : 'text-gray-400'} hover:text-purple-500`}
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
    </div>
  );
}
