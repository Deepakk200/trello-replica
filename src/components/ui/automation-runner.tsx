"use client";

import { useEffect } from "react";
import { registerAutomationEngine } from "@/lib/automation/engine";

// Registers the Butler engine as the board-event handler once on the client, so
// store mutations (move/create/label/due/complete/checklist) run matching rules.
export function AutomationRunner() {
  useEffect(() => {
    registerAutomationEngine();
  }, []);
  return null;
}
