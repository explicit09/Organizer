// Pattern Observers Index

export { productivityObserver, ProductivityObserver } from "./productivity";
export { estimationObserver, EstimationObserver } from "./estimation";
export { behaviorObserver, BehaviorObserver } from "./behavior";

import { productivityObserver } from "./productivity";
import { estimationObserver } from "./estimation";
import { behaviorObserver } from "./behavior";
import type { PatternObserver } from "../types";

// All observers combined
export const allObservers: PatternObserver[] = [
  productivityObserver,
  estimationObserver,
  behaviorObserver,
];
