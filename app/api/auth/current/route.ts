import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getUserIdFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify JWT Token
    const authHeader = request.headers.get('Authorization');
    const userId = getUserIdFromToken(authHeader);

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    let childrenData: any[] = [];
    if (user.role === 'parent' && user.familyId) {
      // Find children in the same family
      const children = await User.find({ familyId: user.familyId, role: "child" });
      childrenData = children.map(c => ({
        id: c._id.toString(),
        username: c.username, // User.username is the nickname/username
        nickname: c.username, // For backward compatibility
        avatar: c.avatar,
        totalPoints: c.totalPoints,
        availablePoints: c.availablePoints
      }));
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        familyId: user.familyId,
        inviteCode: user.inviteCode,
        children: childrenData
      }
    });

  } catch (error) {
    console.error('Current user error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
