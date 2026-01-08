import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  createAvailabilityLink,
  listAvailabilityLinks,
  getAvailabilityLinkBySlug,
  getAvailableSlots,
  createBooking,
} from "../../../lib/availability";

// GET /api/availability - List availability links or get slots
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const action = url.searchParams.get("action");

  // Public: Get slots for a specific availability link
  if (slug && action === "slots") {
    const link = getAvailabilityLinkBySlug(slug);
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const startDate = url.searchParams.get("start")
      ? new Date(url.searchParams.get("start")!)
      : undefined;
    const endDate = url.searchParams.get("end")
      ? new Date(url.searchParams.get("end")!)
      : undefined;

    const slots = getAvailableSlots(link, { startDate, endDate });

    return NextResponse.json({
      link: {
        title: link.title,
        description: link.description,
        duration: link.duration,
      },
      slots,
    });
  }

  // Public: Get link info
  if (slug) {
    const link = getAvailabilityLinkBySlug(slug);
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({
      title: link.title,
      description: link.description,
      duration: link.duration,
      availableDays: link.availableDays,
      availableHours: link.availableHours,
    });
  }

  // Private: List user's availability links
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = listAvailabilityLinks({ userId });
  return NextResponse.json({ links });
}

// POST /api/availability - Create link or book slot
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Public: Book a slot
    if (action === "book") {
      const { slug, name, email, startAt, notes } = body;

      if (!slug || !name || !email || !startAt) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const link = getAvailabilityLinkBySlug(slug);
      if (!link) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      const booking = createBooking(link.id, {
        name,
        email,
        startAt: new Date(startAt),
        notes,
      });

      if (!booking) {
        return NextResponse.json(
          { error: "Failed to create booking" },
          { status: 500 }
        );
      }

      return NextResponse.json({ booking });
    }

    // Private: Create availability link
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, duration, bufferBefore, bufferAfter, availableHours, availableDays, maxDaysAhead } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const link = createAvailabilityLink(
      {
        title,
        description,
        duration,
        bufferBefore,
        bufferAfter,
        availableHours,
        availableDays,
        maxDaysAhead,
      },
      { userId }
    );

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Availability API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
