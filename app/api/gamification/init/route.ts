import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MedalDefinition, AvatarSkin, AvatarAccessory } from '@/models/Gamification';

// 初始化勋章定义数据
const defaultMedals = [
  // 任务达人系列
  {
    type: 'task_master' as const,
    level: 'bronze' as const,
    name: '初级探险者',
    description: '累计完成 3 次任务，迈出成长的第一步！',
    icon: '🥉',
    requirement: 3,
    requirementType: 'total' as const,
    xpReward: 50,
    color: '#CD7F32',
    order: 1,
  },
  {
    type: 'task_master' as const,
    level: 'silver' as const,
    name: '进阶冒险家',
    description: '累计完成 10 次任务，进步明显！',
    icon: '🥈',
    requirement: 10,
    requirementType: 'total' as const,
    xpReward: 150,
    color: '#C0C0C0',
    order: 2,
  },
  {
    type: 'task_master' as const,
    level: 'gold' as const,
    name: '稳步前进',
    description: '累计完成 21 次任务，养成好习惯！',
    icon: '🥇',
    requirement: 21,
    requirementType: 'total' as const,
    xpReward: 500,
    color: '#FFD700',
    order: 3,
  },
  {
    type: 'task_master' as const,
    level: 'diamond' as const,
    name: '传奇大师',
    description: '累计完成 100 次任务，成为领域专家！',
    icon: '💎',
    requirement: 100,
    requirementType: 'total' as const,
    xpReward: 2000,
    color: '#B9F2FF',
    order: 4,
  },
  // 毅力系列
  {
    type: 'persistence' as const,
    level: 'bronze' as const,
    name: '小火苗',
    description: '累计完成 15 次任务，星星之火可以燎原！',
    icon: '🔥',
    requirement: 15,
    requirementType: 'total' as const,
    xpReward: 30,
    color: '#FF6B35',
    order: 5,
  },
  {
    type: 'persistence' as const,
    level: 'silver' as const,
    name: '坚持者',
    description: '累计完成 30 次任务，毅力可嘉！',
    icon: '📅',
    requirement: 30,
    requirementType: 'total' as const,
    xpReward: 100,
    color: '#4ECDC4',
    order: 6,
  },
  {
    type: 'persistence' as const,
    level: 'gold' as const,
    name: '习惯养成者',
    description: '累计完成 60 次任务，好习惯已养成！',
    icon: '✨',
    requirement: 60,
    requirementType: 'total' as const,
    xpReward: 800,
    color: '#FFE66D',
    order: 7,
  },
  {
    type: 'persistence' as const,
    level: 'diamond' as const,
    name: '不屈意志',
    description: '累计完成 120 次任务，意志力惊人！',
    icon: '👑',
    requirement: 120,
    requirementType: 'total' as const,
    xpReward: 3000,
    color: '#9B59B6',
    order: 8,
  },
];

// 初始化皮肤数据
const defaultSkins = [
  { id: 'default', name: '默认外观', description: '最经典的探险家造型', unlockLevel: 1, icon: '🧒', rarity: 'common' as const },
  { id: 'explorer_camo', name: '迷彩探险家', description: '融入自然的探险装扮', unlockLevel: 3, icon: '🧑‍🌾', rarity: 'common' as const },
  { id: 'scholar', name: '小学者', description: '充满智慧的书香气息', unlockLevel: 5, icon: '🧑‍🎓', rarity: 'rare' as const },
  { id: 'superhero', name: '小英雄', description: '守护正义的英雄装扮', unlockLevel: 7, icon: '🦸', rarity: 'epic' as const },
  { id: 'legend', name: '传说形态', description: '散发传奇光芒的神圣形态', unlockLevel: 10, icon: '🧙', rarity: 'legendary' as const },
];

// 初始化配饰数据
const defaultAccessories = [
  { id: 'baseball_cap', name: '探险帽', description: '遮阳又帅气的帽子', unlockLevel: 2, type: 'hat' as const, icon: '🧢', rarity: 'common' as const },
  { id: 'glasses', name: '学者眼镜', description: '让你看起来更聪明', unlockLevel: 3, type: 'glasses' as const, icon: '👓', rarity: 'common' as const },
  { id: 'sunglasses', name: '酷炫墨镜', description: '耍帅必备', unlockLevel: 5, type: 'glasses' as const, icon: '🕶️', rarity: 'rare' as const },
  { id: 'backpack', name: '探险背包', description: '装满冒险的必需品', unlockLevel: 4, type: 'cape' as const, icon: '🎒', rarity: 'common' as const },
  { id: 'cape', name: '英雄披风', description: '随风飘扬的英雄象征', unlockLevel: 7, type: 'cape' as const, icon: '🦸‍♂️', rarity: 'epic' as const },
  { id: 'dog', name: '小狗伙伴', description: '忠诚的冒险伙伴', unlockLevel: 6, type: 'pet' as const, icon: '🐕', rarity: 'rare' as const },
  { id: 'cat', name: '猫咪伙伴', description: '优雅神秘的伙伴', unlockLevel: 6, type: 'pet' as const, icon: '🐈', rarity: 'rare' as const },
  { id: 'forest_bg', name: '森林背景', description: '生机勃勃的森林', unlockLevel: 8, type: 'background' as const, icon: '🌲', rarity: 'epic' as const },
];

export async function POST() {
  try {
    await connectDB();

    // 初始化勋章
    const medalCount = await MedalDefinition.countDocuments();
    if (medalCount === 0) {
      await MedalDefinition.insertMany(defaultMedals);
      console.log('✅ 勋章定义初始化完成');
    }

    // 初始化皮肤
    const skinCount = await AvatarSkin.countDocuments();
    if (skinCount === 0) {
      await AvatarSkin.insertMany(defaultSkins);
      console.log('✅ 皮肤定义初始化完成');
    }

    // 初始化配饰
    const accessoryCount = await AvatarAccessory.countDocuments();
    if (accessoryCount === 0) {
      await AvatarAccessory.insertMany(defaultAccessories);
      console.log('✅ 配饰定义初始化完成');
    }

    return NextResponse.json({
      success: true,
      message: '游戏化数据初始化成功',
      data: {
        medals: medalCount === 0 ? defaultMedals.length : '已存在',
        skins: skinCount === 0 ? defaultSkins.length : '已存在',
        accessories: accessoryCount === 0 ? defaultAccessories.length : '已存在',
      },
    });
  } catch (error) {
    console.error('初始化游戏化数据失败:', error);
    return NextResponse.json(
      { success: false, message: '初始化失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 获取所有游戏化配置
export async function GET() {
  try {
    await connectDB();

    const medals = await MedalDefinition.find().sort({ order: 1 });
    const skins = await AvatarSkin.find().sort({ unlockLevel: 1 });
    const accessories = await AvatarAccessory.find().sort({ unlockLevel: 1 });

    return NextResponse.json({
      success: true,
      data: {
        medals,
        skins,
        accessories,
      },
    });
  } catch (error) {
    console.error('获取游戏化配置失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
