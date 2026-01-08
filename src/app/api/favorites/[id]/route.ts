import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import { removeFavorite, type FavoriteType } from "../../../../lib/favorites";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const itemType = url.searchParams.get("type") as FavoriteType;
    const { id: itemId } = await context.params;

    if (!itemType) {
      return NextResponse.json(
        { error: "type query parameter is required" },
        { status: 400 }
      );
    }

    const deleted = removeFavorite(itemType, itemId, { userId });

    if (!deleted) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove favorite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
