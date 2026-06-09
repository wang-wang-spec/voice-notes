import { NextRequest, NextResponse } from "next/server";
import { getFolders, createFolder } from "@/lib/storage";

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(folders);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get folders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color, icon } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const folder = await createFolder({
      name: name.trim(),
      color,
      icon,
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
