"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";

type SSEEvent = {
  type: string;
  payload?: unknown;
  timestamp: string;
};

type EventHandler = (event: SSEEvent) => void;

export function useRealtime(handlers?: Record<string, EventHandler>) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    // Check if we're on the client side and EventSource is available
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      const eventSource = new EventSource("/api/events/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        console.log("[SSE] Connected");
      };

      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);

          // Call custom handler if provided
          if (handlers?.[data.type]) {
            handlers[data.type](data);
          }

          // Handle built-in events
          switch (data.type) {
            case "item:created":
            case "item:updated":
            case "item:deleted":
              queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
              break;
            case "notification:new":
              queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
              break;
            case "habit:logged":
              queryClient.invalidateQueries({ queryKey: queryKeys.habits.all });
              break;
            case "focus:started":
            case "focus:ended":
              queryClient.invalidateQueries({ queryKey: queryKeys.focus.all });
              break;
          }
        } catch (e) {
          // Ignore parse errors (e.g., ping messages)
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        setIsConnected(false);

        // Exponential backoff reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        console.log(`[SSE] Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    } catch (error) {
      console.error("[SSE] Failed to connect:", error);
    }
  }, [queryClient, handlers]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
  };
}
