'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, X, ChevronRight, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import request from '@/utils/request';

interface GamificationNotification {
  id: string;
  type: 'medal' | 'levelup' | 'reward';
  title: string;
  message: string;
  icon: string;
  xp?: number;
  level?: number;
}

interface GamificationNotifierProps {
  onViewAchievements?: () => void;
}

export const GamificationNotifier: React.FC<GamificationNotifierProps> = ({ onViewAchievements }) => {
  const { currentUser } = useApp();
  const [notifications, setNotifications] = useState<GamificationNotification[]>([]);
  const [lastMedalCount, setLastMedalCount] = useState(0);
  const [lastLevel, setLastLevel] = useState(1);

  // 检查游戏化进度
  const checkProgress = useCallback(async () => {
    if (!currentUser?.token) return;

    try {
      // 获取勋章数据
      const medalsData = await request('/api/gamification/medals');

      // 获取角色数据
      const avatarData = await request('/api/gamification/avatar');

      if (medalsData.success && avatarData.success) {
        const currentMedalCount = medalsData.data.stats.earned;
        const currentLevel = avatarData.data.avatar.level;
        const newMedals = medalsData.data.medals.filter((m: any) => m.isNew);

        const newNotifications: GamificationNotification[] = [];

        // 检查新勋章
        if (newMedals.length > 0 && currentMedalCount > lastMedalCount) {
          newMedals.forEach((medal: any) => {
            newNotifications.push({
              id: `medal-${medal.id}`,
              type: 'medal',
              title: '获得新勋章！',
              message: `${medal.name} - ${medal.description}`,
              icon: medal.icon,
              xp: medal.xpReward,
            });
          });

          // 触发庆祝效果
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#FFD700', '#FFA500', '#FF6347'],
          });
        }

        // 检查升级
        if (currentLevel > lastLevel && lastLevel > 0) {
          newNotifications.push({
            id: `levelup-${currentLevel}`,
            type: 'levelup',
            title: '升级啦！',
            message: `恭喜达到等级 ${currentLevel}`,
            icon: '🎉',
            level: currentLevel,
          });

          // 触发升级庆祝
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'],
            });
          }, 500);
        }

        if (newNotifications.length > 0) {
          setNotifications(prev => [...prev, ...newNotifications]);
        }

        setLastMedalCount(currentMedalCount);
        setLastLevel(currentLevel);
      }
    } catch (error) {
      console.error('检查游戏化进度失败:', error);
    }
  }, [currentUser, lastMedalCount, lastLevel]);

  // 初始加载
  useEffect(() => {
    const initialize = async () => {
      if (!currentUser?.token) return;

      try {
        // 获取初始数据
        const [medalsData, avatarData] = await Promise.all([
          request('/api/gamification/medals'),
          request('/api/gamification/avatar'),
        ]);

        if (medalsData.success && avatarData.success) {
          setLastMedalCount(medalsData.data.stats.earned);
          setLastLevel(avatarData.data.avatar.level);
        }
      } catch (error) {
        console.error('初始化游戏化数据失败:', error);
      }
    };

    initialize();
  }, [currentUser]);

  // 定期检查（每30秒）
  useEffect(() => {
    const interval = setInterval(checkProgress, 30000);
    return () => clearInterval(interval);
  }, [checkProgress]);

  // 页面可见性变化时检查
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkProgress]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ delay: index * 0.1 }}
            className="pointer-events-auto"
          >
            <div 
              className={`relative rounded-2xl p-4 shadow-2xl backdrop-blur-md border ${
                notification.type === 'levelup' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400/50' 
                  : notification.type === 'medal'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-400/50'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-400/50'
              }`}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => removeNotification(notification.id)}
                className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                {/* 图标 */}
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-3xl shrink-0">
                  {notification.icon}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {notification.type === 'medal' && <Trophy className="w-4 h-4 text-yellow-200" />}
                    {notification.type === 'levelup' && <Sparkles className="w-4 h-4 text-purple-200" />}
                    <span className="font-bold text-white text-sm">
                      {notification.title}
                    </span>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {notification.message}
                  </p>
                  
                  {/* 奖励信息 */}
                  {(notification.xp || notification.level) && (
                    <div className="flex items-center gap-3 mt-2">
                      {notification.xp && (
                        <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full text-yellow-200">
                          <Star className="w-3 h-3" />
                          +{notification.xp} XP
                        </span>
                      )}
                      {notification.level && (
                        <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full text-purple-200">
                          Lv.{notification.level}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 查看成就按钮 */}
              {index === notifications.length - 1 && (
                <button
                  onClick={() => {
                    clearAll();
                    onViewAchievements?.();
                  }}
                  className="mt-3 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  查看我的成就
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default GamificationNotifier;