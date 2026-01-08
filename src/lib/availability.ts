import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { listItems } from "./items";
import { findAvailableSlots, type TimeSlot } from "./schedule";

// ========== Types ==========

export type AvailabilityLink = {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description?: string;
  duration: number; // minutes
  bufferBefore: number;
  bufferAfter: number;
  availableHours: {
    start: number; // 0-23
    end: number;
  };
  availableDays: number[]; // 0-6 (Sun-Sat)
  maxDaysAhead: number;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
};

export type BookingSlot = {
  start: Date;
  end: Date;
  available: boolean;
};

type AvailabilityRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  duration: number;
  buffer_before: number;
  buffer_after: number;
  available_hours_json: string;
  available_days_json: string;
  max_days_ahead: number;
  is_active: number;
  created_at: string;
  expires_at: string | null;
};

// ========== Helpers ==========

function mapRow(row: AvailabilityRow): AvailabilityLink {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    duration: row.duration,
    bufferBefore: row.buffer_before,
    bufferAfter: row.buffer_after,
    availableHours: JSON.parse(row.available_hours_json),
    availableDays: JSON.parse(row.available_days_json),
    maxDaysAhead: row.max_days_ahead,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
  };
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  const suffix = randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

// ========== CRUD ==========

export function createAvailabilityLink(
  input: {
    title: string;
    description?: string;
    duration?: number;
    bufferBefore?: number;
    bufferAfter?: number;
    availableHours?: { start: number; end: number };
    availableDays?: number[];
    maxDaysAhead?: number;
    expiresAt?: string;
  },
  options?: { userId?: string }
): AvailabilityLink {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const id = randomUUID();
  const now = new Date().toISOString();
  const slug = generateSlug(input.title);

  db.prepare(
    `INSERT INTO availability_links (
      id, user_id, slug, title, description, duration,
      buffer_before, buffer_after, available_hours_json, available_days_json,
      max_days_ahead, is_active, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    slug,
    input.title,
    input.description ?? null,
    input.duration ?? 30,
    input.bufferBefore ?? 0,
    input.bufferAfter ?? 0,
    JSON.stringify(input.availableHours ?? { start: 9, end: 17 }),
    JSON.stringify(input.availableDays ?? [1, 2, 3, 4, 5]),
    input.maxDaysAhead ?? 14,
    1,
    now,
    input.expiresAt ?? null
  );

  return getAvailabilityLink(id, { userId })!;
}

export function getAvailabilityLink(
  id: string,
  options?: { userId?: string }
): AvailabilityLink | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(`SELECT * FROM availability_links WHERE id = ? AND user_id = ?`)
    .get(id, userId) as AvailabilityRow | undefined;

  return row ? mapRow(row) : null;
}

export function getAvailabilityLinkBySlug(slug: string): AvailabilityLink | null {
  const db = getDb();

  const row = db
    .prepare(`SELECT * FROM availability_links WHERE slug = ? AND is_active = 1`)
    .get(slug) as AvailabilityRow | undefined;

  if (!row) return null;

  // Check expiration
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null;
  }

  return mapRow(row);
}

export function listAvailabilityLinks(
  options?: { userId?: string }
): AvailabilityLink[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `SELECT * FROM availability_links
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId) as AvailabilityRow[];

  return rows.map(mapRow);
}

export function updateAvailabilityLink(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    duration: number;
    bufferBefore: number;
    bufferAfter: number;
    availableHours: { start: number; end: number };
    availableDays: number[];
    maxDaysAhead: number;
    isActive: boolean;
    expiresAt: string;
  }>,
  options?: { userId?: string }
): AvailabilityLink | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const existing = getAvailabilityLink(id, { userId });
  if (!existing) return null;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) {
    updates.push("title = ?");
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description);
  }
  if (input.duration !== undefined) {
    updates.push("duration = ?");
    values.push(input.duration);
  }
  if (input.bufferBefore !== undefined) {
    updates.push("buffer_before = ?");
    values.push(input.bufferBefore);
  }
  if (input.bufferAfter !== undefined) {
    updates.push("buffer_after = ?");
    values.push(input.bufferAfter);
  }
  if (input.availableHours !== undefined) {
    updates.push("available_hours_json = ?");
    values.push(JSON.stringify(input.availableHours));
  }
  if (input.availableDays !== undefined) {
    updates.push("available_days_json = ?");
    values.push(JSON.stringify(input.availableDays));
  }
  if (input.maxDaysAhead !== undefined) {
    updates.push("max_days_ahead = ?");
    values.push(input.maxDaysAhead);
  }
  if (input.isActive !== undefined) {
    updates.push("is_active = ?");
    values.push(input.isActive ? 1 : 0);
  }
  if (input.expiresAt !== undefined) {
    updates.push("expires_at = ?");
    values.push(input.expiresAt);
  }

  if (updates.length > 0) {
    values.push(id, userId);
    db.prepare(
      `UPDATE availability_links SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);
  }

  return getAvailabilityLink(id, { userId });
}

export function deleteAvailabilityLink(
  id: string,
  options?: { userId?: string }
): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare(`DELETE FROM availability_links WHERE id = ? AND user_id = ?`)
    .run(id, userId);

  return result.changes > 0;
}

// ========== Availability Calculation ==========

export function getAvailableSlots(
  link: AvailabilityLink,
  options?: { startDate?: Date; endDate?: Date }
): BookingSlot[] {
  const userId = link.userId;
  const startDate = options?.startDate ?? new Date();
  const endDate = options?.endDate ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() + link.maxDaysAhead);
    return d;
  })();

  // Get user's scheduled items
  const items = listItems(undefined, { userId });
  const scheduledItems = items.filter((item) => item.startAt && item.endAt);

  // Find available slots using the schedule library
  const availableTimeSlots = findAvailableSlots(scheduledItems, {
    startDate,
    endDate,
    workStartHour: link.availableHours.start,
    workEndHour: link.availableHours.end,
    minDurationMinutes: link.duration + link.bufferBefore + link.bufferAfter,
    excludeWeekends: !link.availableDays.includes(0) && !link.availableDays.includes(6),
  });

  // Convert to booking slots
  const slots: BookingSlot[] = [];

  for (const slot of availableTimeSlots) {
    // Check if day is available
    if (!link.availableDays.includes(slot.start.getDay())) {
      continue;
    }

    // Generate specific time slots within this available window
    let slotStart = new Date(slot.start);
    slotStart.setMinutes(slotStart.getMinutes() + link.bufferBefore);

    const slotEnd = new Date(slot.end);
    slotEnd.setMinutes(slotEnd.getMinutes() - link.bufferAfter);

    while (slotStart.getTime() + link.duration * 60000 <= slotEnd.getTime()) {
      const meetingEnd = new Date(slotStart.getTime() + link.duration * 60000);

      slots.push({
        start: new Date(slotStart),
        end: meetingEnd,
        available: true,
      });

      // Move to next slot (30-minute intervals)
      slotStart.setMinutes(slotStart.getMinutes() + 30);
    }
  }

  return slots;
}

// ========== Booking ==========

export type Booking = {
  id: string;
  linkId: string;
  name: string;
  email: string;
  startAt: string;
  endAt: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
};

export function createBooking(
  linkId: string,
  input: {
    name: string;
    email: string;
    startAt: Date;
    notes?: string;
  }
): Booking | null {
  const db = getDb();
  const link = getAvailabilityLinkBySlug(linkId) ?? 
    (db.prepare(`SELECT * FROM availability_links WHERE id = ?`).get(linkId) as AvailabilityRow | undefined ? 
      mapRow(db.prepare(`SELECT * FROM availability_links WHERE id = ?`).get(linkId) as AvailabilityRow) : null);

  if (!link) return null;

  const id = randomUUID();
  const now = new Date().toISOString();
  const endAt = new Date(input.startAt.getTime() + link.duration * 60000);

  db.prepare(
    `INSERT INTO bookings (id, link_id, name, email, start_at, end_at, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    link.id,
    input.name,
    input.email,
    input.startAt.toISOString(),
    endAt.toISOString(),
    input.notes ?? null,
    "pending",
    now
  );

  return {
    id,
    linkId: link.id,
    name: input.name,
    email: input.email,
    startAt: input.startAt.toISOString(),
    endAt: endAt.toISOString(),
    notes: input.notes,
    status: "pending",
    createdAt: now,
  };
}
