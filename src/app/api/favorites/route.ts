import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  addFavorite,
  listFavorites,
  toggleFavorite,
  type FavoriteType,
} from "../../../lib/favorites";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const itemType = url.searchParams.get("type") as FavoriteType | null;

    const favorites = listFavorites({
      userId,
      itemType: itemType ?? undefined,
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list favorites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemType, itemId, toggle } = body as {
      itemType: FavoriteType;
      itemId: string;
      toggle?: boolean;
    };

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: "itemType and itemId are required" },
        { status: 400 }
      );
    }

    if (toggle) {
      const result = toggleFavorite(itemType, itemId, { userId });
      return NextResponse.json(result);
    }

    const favorite = addFavorite({ itemType, itemId }, { userId });
    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add favorite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
