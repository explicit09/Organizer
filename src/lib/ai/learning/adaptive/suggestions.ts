// Adaptive Suggestions
// Personalizes suggestions based on learned user preferences

import type { AdaptiveSuggestion, UserModel, CommunicationPreference } from "../types";

// Adapt suggestions for a specific user
export function adaptSuggestionsForUser(
  suggestions: AdaptiveSuggestion[],
  model: UserModel
): AdaptiveSuggestion[] {
  return suggestions
    .map((suggestion) => adaptSingleSuggestion(suggestion, model))
    .filter((s): s is AdaptiveSuggestion => s !== null)
    .sort((a, b) => b.predictedAcceptance - a.predictedAcceptance);
}

// Adapt a single suggestion
function adaptSingleSuggestion(
  suggestion: AdaptiveSuggestion,
  model: UserModel
): AdaptiveSuggestion | null {
  const prefs = model.preferences.suggestionPreferences;

  // Check if user typically dismisses this type
  const historicalAcceptance = prefs.acceptanceRateByType[suggestion.type];
  if (historicalAcceptance !== undefined && historicalAcceptance < 0.15) {
    // User almost always dismisses this - skip it
    return null;
  }

  // Adjust timing based on when user typically accepts
  const preferredTime = prefs.preferredTimingByType[suggestion.type];
  if (preferredTime && !isNearTime(preferredTime)) {
    suggestion.delayUntil = parseTimeToDate(preferredTime);
  }

  // Adjust priority based on user's work style
  const adjustedPriority = adjustPriorityForUser(
    suggestion.priority,
    model.preferences.workStyle
  );

  // Adapt message style
  const adaptedMessage = adaptMessage(
    suggestion.message,
    model.preferences.communicationStyle
  );

  // Calculate predicted acceptance
  const predictedAcceptance = calculatePredictedAcceptance(suggestion, model);

  return {
    ...suggestion,
    priority: adjustedPriority,
    message: adaptedMessage,
    predictedAcceptance,
    personalizationApplied: true,
  };
}

// Check if current time is near a given time string
function isNearTime(timeStr: string): boolean {
  const [hours] = timeStr.split(":").map(Number);
  const currentHour = new Date().getHours();
  return Math.abs(currentHour - hours) <= 2;
}

// Parse time string to next occurrence Date
function parseTimeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(hours, minutes || 0, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}

// Adjust priority based on user's work style
function adjustPriorityForUser(
  priority: string,
  workStyle: UserModel["preferences"]["workStyle"]
): string {
  // If user is a planner, they handle things systematically - don't over-prioritize
  if (workStyle.planningStyle === "detailed" && priority === "urgent") {
    return "high";
  }

  // If user is spontaneous, urgent things might get buried - keep priority
  if (workStyle.planningStyle === "spontaneous") {
    return priority;
  }

  return priority;
}

// Adapt message to user's communication style
export function adaptMessage(
  message: string,
  style: CommunicationPreference
): string {
  let adapted = message;

  // Adjust length
  if (style.preferredLength === "brief") {
    adapted = truncateToEssentials(adapted);
  }

  // Adjust emoji usage
  if (style.emojiUsage === "never") {
    adapted = removeEmojis(adapted);
  } else if (style.emojiUsage === "often") {
    adapted = addContextualEmoji(adapted);
  }

  // Adjust tone (simplified - would need more sophisticated NLP)
  if (style.tonePreference === "casual") {
    adapted = casualizeTone(adapted);
  }

  return adapted;
}

// Truncate message to essential parts
function truncateToEssentials(message: string): string {
  // Split into sentences
  const sentences = message.split(/[.!?]+/).filter((s) => s.trim());

  if (sentences.length <= 1) return message;

  // Keep first sentence (usually the key point)
  const firstSentence = sentences[0].trim();

  // If there's an action or number, include that sentence too
  const actionSentence = sentences.find(
    (s) =>
      s.includes("would") ||
      s.includes("could") ||
      s.includes("should") ||
      /\d+/.test(s)
  );

  if (actionSentence && actionSentence !== sentences[0]) {
    return `${firstSentence}. ${actionSentence.trim()}.`;
  }

  return `${firstSentence}.`;
}

// Remove emojis from message
function removeEmojis(message: string): string {
  return message
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

// Add contextual emoji
function addContextualEmoji(message: string): string {
  const lower = message.toLowerCase();

  // Don't add if already has emoji
  if (/[\u{1F600}-\u{1F64F}]/u.test(message)) return message;

  // Add relevant emoji based on content
  if (lower.includes("great") || lower.includes("good job") || lower.includes("complete")) {
    return `${message} ✨`;
  }
  if (lower.includes("deadline") || lower.includes("overdue") || lower.includes("urgent")) {
    return `⚠️ ${message}`;
  }
  if (lower.includes("focus") || lower.includes("productive")) {
    return `🎯 ${message}`;
  }
  if (lower.includes("break") || lower.includes("rest")) {
    return `☕ ${message}`;
  }

  return message;
}

// Make tone more casual
function casualizeTone(message: string): string {
  let casual = message;

  // Replace formal phrases with casual alternatives
  const replacements: [RegExp, string][] = [
    [/I would recommend/gi, "I'd suggest"],
    [/It appears that/gi, "Looks like"],
    [/You might want to consider/gi, "How about"],
    [/Would you like to/gi, "Want to"],
    [/It is recommended/gi, "You might want to"],
    [/This will help you/gi, "This'll help"],
    [/In order to/gi, "To"],
  ];

  for (const [pattern, replacement] of replacements) {
    casual = casual.replace(pattern, replacement);
  }

  return casual;
}

// Calculate predicted acceptance probability
function calculatePredictedAcceptance(
  suggestion: AdaptiveSuggestion,
  model: UserModel
): number {
  const prefs = model.preferences.suggestionPreferences;

  // Base acceptance from historical data
  let acceptance = prefs.acceptanceRateByType[suggestion.type] ?? 0.5;

  // Adjust based on confidence
  if (suggestion.confidence > 0.8) {
    acceptance *= 1.1;
  } else if (suggestion.confidence < 0.5) {
    acceptance *= 0.9;
  }

  // Adjust based on time of day
  const currentHour = new Date().getHours();
  const peakHour = model.preferences.notificationPreferences.peakEngagementHour;
  if (peakHour !== null) {
    const hourDiff = Math.abs(currentHour - peakHour);
    if (hourDiff <= 1) {
      acceptance *= 1.15; // More likely to accept during peak engagement
    } else if (hourDiff >= 4) {
      acceptance *= 0.85;
    }
  }

  // Check if this type is in low-value list
  if (prefs.leastValuableSuggestions.includes(suggestion.type)) {
    acceptance *= 0.7;
  }

  // Check if this type is in high-value list
  if (prefs.mostValuableSuggestions.includes(suggestion.type)) {
    acceptance *= 1.2;
  }

  // Clamp to valid range
  return Math.max(0, Math.min(1, acceptance));
}

// Generate personalized suggestion message
export function generatePersonalizedSuggestion(
  template: string,
  model: UserModel,
  context: Record<string, unknown>
): string {
  let message = template;

  // Replace placeholders with context values
  for (const [key, value] of Object.entries(context)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }

  // Adapt to user's style
  return adaptMessage(message, model.preferences.communicationStyle);
}
