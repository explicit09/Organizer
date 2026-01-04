import type { ItemType } from "./items";

const meetingKeywords = [
  "meet",
  "meeting",
  "call",
  "zoom",
  "sync",
  "check-in",
  "1:1",
];
const schoolKeywords = [
  "exam",
  "assignment",
  "homework",
  "study",
  "class",
  "course",
  "syllabus",
  "quiz",
  "project",
];

type RoutedItem = {
  type: ItemType;
  title: string;
};

function detectType(text: string, fallback: ItemType = "task"): ItemType {
  const normalized = text.toLowerCase();

  if (meetingKeywords.some((keyword) => normalized.includes(keyword))) {
    return "meeting";
  }
  if (schoolKeywords.some((keyword) => normalized.includes(keyword))) {
    return "school";
  }

  return fallback;
}

function splitItems(text: string) {
  const trimmed = text.trim();
  const colonParts = trimmed.split(":");
  const base = colonParts.length > 1 ? colonParts.slice(1).join(":") : trimmed;

  const commaSplit = base
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (commaSplit.length > 1) {
    return commaSplit;
  }

  const andSplit = base
    .split(" and ")
    .map((part) => part.trim())
    .filter(Boolean);

  return andSplit.length > 1 ? andSplit : [base.trim()];
}

function cleanTitle(text: string) {
  return text.replace(/^[\s-]+/, "").replace(/[.]+$/, "").trim();
}

export function routeInput(text: string): RoutedItem[] {
  const baseType = detectType(text);
  const parts = splitItems(text);

  return parts.map((part) => ({
    type: detectType(part, baseType),
    title: cleanTitle(part),
  }));
}
