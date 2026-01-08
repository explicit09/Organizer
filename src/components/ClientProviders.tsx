"use client";

import { useState, useEffect } from "react";
import { FloatingFocusTimer, FocusMode } from "./FocusMode";

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
    <>
      {children}
      <FloatingFocusTimer />
      <FocusMode isOpen={focusModeOpen} onClose={() => setFocusModeOpen(false)} />
    </>
  );
}
