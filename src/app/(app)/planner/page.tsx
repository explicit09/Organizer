import { redirect } from "next/navigation";

// AI Planner has been consolidated into AI Assistant
// Redirect to /ai for all planner routes
export default function PlannerPage() {
  redirect("/ai");
}
