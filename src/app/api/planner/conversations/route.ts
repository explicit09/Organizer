import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import {
  createConversation,
  listConversations,
  type PlanMode,
} from "../../../../lib/plans";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = listConversations(undefined, { userId });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        messages: c.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error listing conversations:", error);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mode, title, planId, context } = body as {
      mode?: PlanMode;
      title?: string;
      planId?: string;
      context?: Record<string, unknown>;
    };

    const conversation = createConversation(
      {
        mode: mode || "general",
        title,
        planId,
        context,
      },
      { userId }
    );

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
