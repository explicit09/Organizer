import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";

// Simple in-memory event store for broadcasting
// In production, use Redis or similar for multi-instance support
type EventData = {
  type: string;
  payload: unknown;
  timestamp: string;
};

const clientConnections = new Map<string, Set<ReadableStreamController<Uint8Array>>>();

// Helper to broadcast events to all connected clients for a user
export function broadcastToUser(userId: string, event: EventData) {
  const controllers = clientConnections.get(userId);
  if (!controllers) return;

  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(event)}\n\n`;
  const data = encoder.encode(message);

  controllers.forEach((controller) => {
    try {
      controller.enqueue(data);
    } catch {
      // Controller might be closed
    }
  });
}

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Add this controller to the user's set
      if (!clientConnections.has(userId)) {
        clientConnections.set(userId, new Set());
      }
      clientConnections.get(userId)!.add(controller);

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`));

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on close
      return () => {
        clearInterval(pingInterval);
        const controllers = clientConnections.get(userId);
        if (controllers) {
          controllers.delete(controller);
          if (controllers.size === 0) {
            clientConnections.delete(userId);
          }
        }
      };
    },
    cancel() {
      // Handle client disconnect
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// Event types for the frontend
export type SSEEventType =
  | "connected"
  | "item:created"
  | "item:updated"
  | "item:deleted"
  | "notification:new"
  | "focus:started"
  | "focus:ended"
  | "habit:logged";
