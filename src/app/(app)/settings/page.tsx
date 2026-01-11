"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Settings,
  Brain,
  Bell,
  Clock,
  Bot,
  User,
  Shield,
} from "lucide-react";
import { ProactiveSettings } from "@/components/settings/ProactiveSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { WorkHoursSettings } from "@/components/settings/WorkHoursSettings";
import { AIPreferences } from "@/components/settings/AIPreferences";

type TabId = "proactive" | "notifications" | "work-hours" | "ai";

const tabs: Array<{ id: TabId; label: string; icon: typeof Settings }> = [
  { id: "proactive", label: "Proactive AI", icon: Brain },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "work-hours", label: "Work Hours", icon: Clock },
  { id: "ai", label: "AI Preferences", icon: Bot },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("proactive");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Settings className="text-muted-foreground" size={24} />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your experience and preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="md:w-56 shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Additional Links */}
          <div className="mt-6 pt-6 border-t border-border space-y-1">
            <a
              href="/integrations"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <Shield size={18} />
              Integrations
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <User size={18} />
              Account
            </a>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1">
          <div className="rounded-xl border border-border p-6 glass-card">
            {/* Tab Header */}
            <div className="mb-6 pb-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "proactive" &&
                  "Configure how AI proactively helps you stay productive"}
                {activeTab === "notifications" &&
                  "Manage when and how you receive notifications"}
                {activeTab === "work-hours" &&
                  "Set your work schedule and focus time preferences"}
                {activeTab === "ai" &&
                  "Customize how the AI assistant communicates with you"}
              </p>
            </div>

            {/* Tab Content */}
            {activeTab === "proactive" && <ProactiveSettings />}
            {activeTab === "notifications" && <NotificationSettings />}
            {activeTab === "work-hours" && <WorkHoursSettings />}
            {activeTab === "ai" && <AIPreferences />}
          </div>
        </div>
      </div>
    </div>
  );
}
