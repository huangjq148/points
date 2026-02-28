import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { AccountModel, TransactionModel } from '@/models/Economy';
import { getTokenPayload } from '@/lib/auth';

// 获取账户信息
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    
    await connectDB();
    
    // 家长可查看孩子账户
    let targetUserId = userId;
    if (payload.role === 'parent' && childId) {
      targetUserId = childId;
    }

    // 获取或创建账户
    let account = await AccountModel.findOne({ userId: new mongoose.Types.ObjectId(targetUserId) });
    if (!account) {
      account = await AccountModel.create({
        userId: new mongoose.Types.ObjectId(targetUserId),
        coins: 0,
        stars: 0,
        creditScore: 80,
        creditLimit: 100,
        creditUsed: 0,
        interestRate: 0.001,
        lastInterestCalcAt: new Date(),
        totalInterestEarned: 0,
      });
    }

    // 获取最近交易记录
    const recentTransactions = await TransactionModel
      .find({ userId: new mongoose.Types.ObjectId(targetUserId) })
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({
      success: true,
      data: {
        account: {
          coins: account.coins,
          stars: account.stars,
          creditScore: account.creditScore,
          creditLimit: account.creditLimit,
          creditUsed: account.creditUsed,
          creditAvailable: account.creditLimit - account.creditUsed,
          interestRate: account.interestRate,
          totalInterestEarned: account.totalInterestEarned,
        },
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('获取账户信息失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 更新账户（利息计算、信用额度调整等）
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await request.json();
    const { action, amount, description, currency = 'coins' } = body;

    await connectDB();

    const account = await AccountModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!account) {
      return NextResponse.json({ success: false, message: '账户不存在' }, { status: 404 });
    }

    // 利息计算: Total = P(1 + r)^n
    if (action === 'calculateInterest') {
      const now = new Date();
      const lastCalc = new Date(account.lastInterestCalcAt);
      const daysDiff = Math.floor((now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0 && account.coins > 0) {
        const interest = Math.floor(account.coins * Math.pow(1 + account.interestRate, daysDiff) - account.coins);
        
        if (interest > 0) {
          account.coins += interest;
          account.totalInterestEarned += interest;
          account.lastInterestCalcAt = now;
          await account.save();

          // 记录交易
          await TransactionModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            type: 'interest',
            currency: 'coins',
            amount: interest,
            balance: account.coins,
            description: `利息收益 (${daysDiff}天)`,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          coins: account.coins,
          interestEarned: account.totalInterestEarned,
        },
      });
    }

    // 存入金币
    if (action === 'deposit' && amount > 0) {
      account.coins += amount;
      await account.save();

      await TransactionModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'income',
        currency,
        amount,
        balance: account.coins,
        description: description || '存入金币',
      });

      return NextResponse.json({
        success: true,
        data: { coins: account.coins, stars: account.stars },
      });
    }

    // 消费金币
    if (action === 'spend' && amount > 0) {
      if (account.coins < amount) {
        // 尝试使用信用额度
        const shortfall = amount - account.coins;
        const availableCredit = account.creditLimit - account.creditUsed;
        
        if (availableCredit >= shortfall) {
          // 使用信用额度
          account.coins = 0;
          account.creditUsed += shortfall;
          await account.save();

          await TransactionModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            type: 'credit',
            currency,
            amount: -shortfall,
            balance: account.coins,
            description: description || '信用消费',
          });
        } else {
          return NextResponse.json(
            { success: false, message: '金币不足且信用额度不够' },
            { status: 400 }
          );
        }
      } else {
        account.coins -= amount;
        await account.save();

        await TransactionModel.create({
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          currency,
          amount: -amount,
          balance: account.coins,
          description: description || '消费',
        });
      }

      return NextResponse.json({
        success: true,
        data: { coins: account.coins, stars: account.stars },
      });
    }

    // 奖励荣誉分
    if (action === 'rewardStars' && amount > 0) {
      account.stars += amount;
      await account.save();

      await TransactionModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'reward',
        currency: 'stars',
        amount,
        balance: account.stars,
        description: description || '获得荣誉分',
      });

      return NextResponse.json({
        success: true,
        data: { coins: account.coins, stars: account.stars },
      });
    }

    // 调整信用额度（仅限家长）
    if (action === 'adjustCredit' && payload.role === 'parent') {
      const { targetChildId, creditLimit } = body;
      if (!targetChildId) {
        return NextResponse.json({ success: false, message: '缺少孩子ID' }, { status: 400 });
      }

      const childAccount = await AccountModel.findOne({
        userId: new mongoose.Types.ObjectId(targetChildId),
      });

      if (childAccount) {
        childAccount.creditLimit = creditLimit;
        await childAccount.save();
        return NextResponse.json({ success: true, data: { creditLimit } });
      }
    }

    return NextResponse.json({ success: false, message: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('更新账户失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
