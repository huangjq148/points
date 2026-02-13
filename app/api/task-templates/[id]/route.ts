import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskTemplate } from "@/models";
import { getTokenPayload } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload || payload.role !== "parent") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { _id, id: bodyId, createdAt, updatedAt, ...updateData } = body;
    await connectDB();

    const template = await TaskTemplate.findOneAndUpdate({ _id: id, userId: payload.userId }, updateData, {
      new: true,
    });

    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload || payload.role !== "parent") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const template = await TaskTemplate.findOneAndDelete({ _id: id, userId: payload.userId });

    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
