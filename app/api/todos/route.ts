import { NextRequest, NextResponse } from "next/server";
import { getAllTodos, toggleTodo } from "@/lib/storage";

export async function GET() {
  try {
    const todos = await getAllTodos();
    return NextResponse.json(todos);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get todos" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { noteId, todoId } = body;

    if (!noteId || !todoId) {
      return NextResponse.json(
        { error: "noteId and todoId are required" },
        { status: 400 }
      );
    }

    const success = await toggleTodo(noteId, todoId);
    if (!success) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}
