'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { ChevronRight, Trophy, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import MedalWall from '@/components/gamification/MedalWall';
import AvatarGrowth from '@/components/gamification/AvatarGrowth';
import request from '@/utils/request';

interface Medal {
  id: string;
  type: string;
  level: 'bronze' | 'silver' | 'gold' | 'diamond';
  name: string;
  description: string;
  icon: string;
  requirement: number;
  requirementType: 'total' | 'consecutive';
  xpReward: number;
  color: string;
  isEarned: boolean;
  earnedAt?: string;
  isNew: boolean;
  progress: number;
  progressPercent: number;
}

interface MedalStats {
  total: number;
  earned: number;
  newMedals: number;
  totalXPEarned: number;
}

export default function AchievementsPage() {
  const { currentUser } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'medals' | 'avatar'>('medals');
  const [loading, setLoading] = useState(true);

  // 勋章墙数据
  const [medals, setMedals] = useState<Medal[]>([]);
  const [medalStats, setMedalStats] = useState<MedalStats>({
    total: 0,
    earned: 0,
    newMedals: 0,
    totalXPEarned: 0,
  });

  // 角色成长数据
  const [avatarData, setAvatarData] = useState<any>(null);
  const [levelInfo, setLevelInfo] = useState<any>(null);
  const [customization, setCustomization] = useState<any>(null);

  // 获取勋章墙数据
  const fetchMedals = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const data = await request('/api/gamification/medals');
      if (data.success) {
        setMedals(data.data.medals);
        setMedalStats(data.data.stats);
      }
    } catch (error) {
      console.error('获取勋章失败:', error);
    }
  }, [currentUser]);

  // 获取角色成长数据
  const fetchAvatar = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const data = await request('/api/gamification/avatar');
      if (data.success) {
        setAvatarData(data.data.avatar);
        setLevelInfo(data.data.levelInfo);
        setCustomization(data.data.customization);
      }
    } catch (error) {
      console.error('获取角色数据失败:', error);
    }
  }, [currentUser]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMedals(), fetchAvatar()]);
      setLoading(false);
    };
    void loadData();
  }, [fetchMedals, fetchAvatar]);

  // 标记勋章为已查看
  const handleMedalViewed = async (medalId?: string) => {
    if (!currentUser?.token) return;
    try {
      await request('/api/gamification/medals', {
        method: 'PUT',
        body: { medalId },
      });
      // 刷新数据
      await fetchMedals();
    } catch (error) {
      console.error('标记勋章失败:', error);
    }
  };

  // 更新角色配置
  const handleUpdateConfig = async (config: { currentSkin?: string; equippedAccessories?: string[]; petName?: string }) => {
    if (!currentUser?.token) return;
    try {
      const data = await request('/api/gamification/avatar', {
        method: 'PUT',
        body: config,
      });
      if (data.success) {
        await fetchAvatar();
      }
    } catch (error) {
      console.error('更新角色配置失败:', error);
    }
  };

  const navigateTo = (path: string) => router.push(`/child/${path}`);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pb-8">
        {/* 标签切换 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('medals')}
            className={`flex-1 py-4 px-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-sm ${
              activeTab === 'medals'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Trophy className="w-5 h-5" />
            勋章墙
            {medalStats.newMedals > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
              {medalStats.newMedals}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('avatar')}
          className={`flex-1 py-4 px-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-sm ${
            activeTab === 'avatar'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <User className="w-5 h-5" />
          角色成长
        </button>
      </div>

      {/* 内容区域 */}
      <div className="min-h-[50vh]">
        {activeTab === 'medals' ? (
          <MedalWall
            medals={medals}
            stats={medalStats}
            onMedalViewed={handleMedalViewed}
          />
        ) : (
          avatarData && levelInfo && customization && (
            <AvatarGrowth
              avatar={avatarData}
              levelInfo={levelInfo}
              customization={customization}
              onUpdateConfig={handleUpdateConfig}
            />
          )
        )}
      </div>
      </div>
    </>
  );
}