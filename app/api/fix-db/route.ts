import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getUserIdFromToken } from '@/lib/auth';

interface IndexInfo {
  name: string;
  key: Record<string, number>;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const collection = mongoose.connection.collection('users');

    // Check indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop phone_1 index if it exists
    const phoneIndex = (indexes as IndexInfo[]).find((idx) => idx.name === 'phone_1' || idx.key.phone);

    if (phoneIndex && typeof phoneIndex.name === 'string') {
      await collection.dropIndex(phoneIndex.name);
      return NextResponse.json({ success: true, message: 'Dropped phone_1 index', indexes_before: indexes });
    }

    return NextResponse.json({ success: true, message: 'No phone_1 index found', indexes });
  } catch (error) {
    console.error('Fix DB error:', error);
    return NextResponse.json({ success: false, message: (error as Error).message });
  }
}
