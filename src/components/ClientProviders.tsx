"use client";

import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { FloatingFocusTimer, FocusMode } from "./FocusMode";
import { useRealtime } from "../hooks/useRealtime";

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  // Connect to SSE for real-time updates
  useRealtime();
  return <>{children}</>;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [focusModeOpen, setFocusModeOpen] = useState(false);

  useEffect(() => {
    function handleOpenFocusMode() {
      setFocusModeOpen(true);
    }

    window.addEventListener("open-focus-mode", handleOpenFocusMode);
    return () => window.removeEventListener("open-focus-mode", handleOpenFocusMode);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        {children}
        <FloatingFocusTimer />
        <FocusMode isOpen={focusModeOpen} onClose={() => setFocusModeOpen(false)} />
      </RealtimeProvider>
    </QueryClientProvider>
  );
}
