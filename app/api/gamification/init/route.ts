import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { AvatarSkin, AvatarAccessory } from '@/models/Gamification';

const defaultSkins = [
  { id: 'default', name: '默认外观', description: '最经典的探险家造型', unlockLevel: 1, icon: '🧒', rarity: 'common' as const },
  { id: 'explorer_camo', name: '迷彩探险家', description: '融入自然的探险装扮', unlockLevel: 3, icon: '🧑‍🌾', rarity: 'common' as const },
  { id: 'scholar', name: '小学者', description: '充满智慧的书香气息', unlockLevel: 5, icon: '🧑‍🎓', rarity: 'rare' as const },
  { id: 'superhero', name: '小英雄', description: '守护正义的英雄装扮', unlockLevel: 7, icon: '🦸', rarity: 'epic' as const },
  { id: 'legend', name: '传说形态', description: '散发传奇光芒的神圣形态', unlockLevel: 10, icon: '🧙', rarity: 'legendary' as const },
];

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

    const skinCount = await AvatarSkin.countDocuments();
    if (skinCount === 0) {
      await AvatarSkin.insertMany(defaultSkins);
      console.log('✅ 皮肤定义初始化完成');
    }

    const accessoryCount = await AvatarAccessory.countDocuments();
    if (accessoryCount === 0) {
      await AvatarAccessory.insertMany(defaultAccessories);
      console.log('✅ 配饰定义初始化完成');
    }

    return NextResponse.json({
      success: true,
      message: '游戏化数据初始化成功',
      data: {
        skins: skinCount === 0 ? defaultSkins.length : '已存在',
        accessories: accessoryCount === 0 ? defaultAccessories.length : '已存在',
      },
    });
  } catch (error) {
    console.error('初始化游戏化数据失败:', error);
    return NextResponse.json(
      { success: false, message: '初始化失败', error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const skins = await AvatarSkin.find().sort({ unlockLevel: 1 });
    const accessories = await AvatarAccessory.find().sort({ unlockLevel: 1 });

    return NextResponse.json({
      success: true,
      data: {
        skins,
        accessories,
      },
    });
  } catch (error) {
    console.error('获取游戏化配置失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 },
    );
  }
}
