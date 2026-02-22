'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Crown, Sparkles, Shirt, Glasses, Backpack, Cat, TreePine, Edit3, Check, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LevelInfo {
  level: number;
  name: string;
  title: string;
  xpRequired: number;
  icon: string;
  description: string;
}

interface AvatarData {
  level: number;
  currentXP: number;
  totalXP: number;
  stage: string;
  stageInfo: {
    name: string;
    description: string;
    icon: string;
    color: string;
  };
  unlockedSkins: string[];
  currentSkin: string;
  equippedAccessories: string[];
  unlockedAccessories: string[];
  petName?: string;
  consecutiveDays: number;
  maxConsecutiveDays: number;
  totalTasksCompleted: number;
}

interface Skin {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked: boolean;
}

interface Accessory {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  type: 'hat' | 'glasses' | 'cape' | 'pet' | 'background';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked: boolean;
  isEquipped: boolean;
}

interface AvatarGrowthProps {
  avatar: AvatarData;
  levelInfo: {
    current: LevelInfo;
    next?: LevelInfo;
    progress: number;
    progressPercent: number;
    xpToNextLevel: number;
    allLevels: LevelInfo[];
  };
  customization: {
    skins: Skin[];
    accessories: Accessory[];
  };
  onUpdateConfig?: (config: { currentSkin?: string; equippedAccessories?: string[]; petName?: string }) => void;
}

const rarityColors = {
  common: 'from-gray-500 to-gray-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-500 to-orange-500',
};

const accessoryIcons: Record<string, React.ReactNode> = {
  hat: <Shirt className="w-4 h-4" />,
  glasses: <Glasses className="w-4 h-4" />,
  cape: <Backpack className="w-4 h-4" />,
  pet: <Cat className="w-4 h-4" />,
  background: <TreePine className="w-4 h-4" />,
};

export const AvatarGrowth: React.FC<AvatarGrowthProps> = ({
  avatar,
  levelInfo,
  customization,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'growth' | 'customize'>('growth');
  const [selectedSkin, setSelectedSkin] = useState(avatar.currentSkin);
  const [selectedAccessories, setSelectedAccessories] = useState(avatar.equippedAccessories || []);
  const [isEditingName, setIsEditingName] = useState(false);
  const [petName, setPetName] = useState(avatar.petName || '');
  const [showLevelUp, setShowLevelUp] = useState(false);

  const handleSkinSelect = (skinId: string) => {
    const skin = customization.skins.find(s => s.id === skinId);
    if (skin?.isUnlocked) {
      setSelectedSkin(skinId);
      onUpdateConfig?.({ currentSkin: skinId });
    }
  };

  const handleAccessoryToggle = (accessoryId: string) => {
    const accessory = customization.accessories.find(a => a.id === accessoryId);
    if (!accessory?.isUnlocked) return;

    const newAccessories = selectedAccessories.includes(accessoryId)
      ? selectedAccessories.filter(id => id !== accessoryId)
      : [...selectedAccessories, accessoryId];
    
    setSelectedAccessories(newAccessories);
    onUpdateConfig?.({ equippedAccessories: newAccessories });
  };

  const handleNameSave = () => {
    onUpdateConfig?.({ petName });
    setIsEditingName(false);
  };

  // 触发升级庆祝
  const triggerLevelUp = () => {
    setShowLevelUp(true);
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1'],
    });
    setTimeout(() => setShowLevelUp(false), 3000);
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'egg': return '🥚';
      case 'hatchling': return '🐣';
      case 'explorer': return '🐥';
      case 'adventurer': return '🦅';
      case 'hero': return '🦄';
      case 'legend': return '🐉';
      default: return '🥚';
    }
  };

  return (
    <div className="space-y-6">
      {/* 升级庆祝动画 */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLevelUp(false)}
          >
            <motion.div
              className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 text-center text-white max-w-sm mx-4"
              initial={{ y: 50 }}
              animate={{ y: 0 }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-bold mb-2">升级啦！</h2>
              <p className="text-lg opacity-90">恭喜达到 {levelInfo.current.name}</p>
              <p className="text-sm opacity-75 mt-2">{levelInfo.current.title}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 角色展示区 */}
      <div 
        className="relative rounded-2xl p-8 text-center overflow-hidden"
        style={{ backgroundColor: avatar.stageInfo.color + '30' }}
      >
        <div 
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: avatar.stageInfo.color }}
        />
        
        {/* 角色 */}
        <div className="relative z-10">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-8xl mb-4"
          >
            {getStageIcon(avatar.stage)}
          </motion.div>

          {/* 名字编辑 */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="给你的伙伴起个名字"
                  className="px-3 py-1 rounded-lg bg-white/20 text-white placeholder-white/50 outline-none border border-white/30 text-center"
                  maxLength={10}
                />
                <button
                  onClick={handleNameSave}
                  className="p-1 rounded-full bg-green-500/80 hover:bg-green-500 text-white"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  {avatar.petName || '我的小伙伴'}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white/70 hover:text-white transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <p className="text-sm opacity-80 text-white">{avatar.stageInfo.description}</p>
        </div>
      </div>

      {/* 等级信息 */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl">
              {levelInfo.current.icon}
            </div>
            <div>
              <h3 className="font-bold text-white">{levelInfo.current.name}</h3>
              <p className="text-sm text-gray-400">{levelInfo.current.title}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-400">Lv.{avatar.level}</div>
            {levelInfo.next && (
              <div className="text-xs text-gray-400">
                距离升级还需 {levelInfo.xpToNextLevel} XP
              </div>
            )}
          </div>
        </div>

        {/* 经验条 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>当前经验: {levelInfo.progress} XP</span>
            <span>{levelInfo.progressPercent}%</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{avatar.totalTasksCompleted}</div>
            <div className="text-xs text-gray-400">完成任务</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{avatar.consecutiveDays}</div>
            <div className="text-xs text-gray-400">当前连续</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{avatar.maxConsecutiveDays}</div>
            <div className="text-xs text-gray-400">最高连续</div>
          </div>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('growth')}
          className={`flex-1 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'growth'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          成长历程
        </button>
        <button
          onClick={() => setActiveTab('customize')}
          className={`flex-1 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'customize'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          外观装扮
        </button>
      </div>

      {/* 成长历程 */}
      {activeTab === 'growth' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h4 className="font-bold text-white mb-3">等级历程</h4>
          {levelInfo.allLevels.map((level, index) => {
            const isReached = level.level <= avatar.level;
            const isCurrent = level.level === avatar.level;
            
            return (
              <motion.div
                key={level.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isCurrent 
                    ? 'bg-blue-600/20 border border-blue-500/50' 
                    : isReached 
                      ? 'bg-gray-800/50' 
                      : 'bg-gray-800/20 opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  isReached 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                    : 'bg-gray-700'
                }`}>
                  {level.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{level.name}</span>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">
                        当前
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{level.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-300">Lv.{level.level}</div>
                  <div className="text-xs text-gray-500">{level.xpRequired} XP</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* 外观装扮 */}
      {activeTab === 'customize' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 皮肤选择 */}
          <div>
            <h4 className="font-bold text-white mb-3">外观皮肤</h4>
            <div className="grid grid-cols-2 gap-3">
              {customization.skins.map((skin) => (
                <motion.button
                  key={skin.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSkinSelect(skin.id)}
                  disabled={!skin.isUnlocked}
                  className={`relative p-4 rounded-xl text-left transition-all ${
                    selectedSkin === skin.id
                      ? 'ring-2 ring-blue-500 bg-blue-600/20'
                      : skin.isUnlocked
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-gray-800/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{skin.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">{skin.name}</div>
                      <div className="text-xs text-gray-400">{skin.description}</div>
                    </div>
                  </div>
                  {!skin.isUnlocked && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                  {skin.isUnlocked && selectedSkin === skin.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 text-green-400"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 配饰选择 */}
          <div>
            <h4 className="font-bold text-white mb-3">配饰装备</h4>
            <div className="grid grid-cols-2 gap-3">
              {customization.accessories.map((accessory) => (
                <motion.button
                  key={accessory.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAccessoryToggle(accessory.id)}
                  disabled={!accessory.isUnlocked}
                  className={`relative p-3 rounded-xl text-left transition-all ${
                    selectedAccessories.includes(accessory.id)
                      ? 'ring-2 ring-purple-500 bg-purple-600/20'
                      : accessory.isUnlocked
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-gray-800/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${rarityColors[accessory.rarity]} flex items-center justify-center text-white`}>
                      {accessoryIcons[accessory.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{accessory.name}</div>
                      <div className="text-[10px] text-gray-400">{accessory.description}</div>
                    </div>
                  </div>
                  {!accessory.isUnlocked && (
                    <div className="absolute top-2 right-2 text-xs text-gray-500">
                      Lv.{accessory.unlockLevel}
                    </div>
                  )}
                  {accessory.isUnlocked && selectedAccessories.includes(accessory.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 text-green-400"
                    >
                      <Check className="w-3 h-3" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AvatarGrowth;