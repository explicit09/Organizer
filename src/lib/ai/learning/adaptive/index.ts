// Adaptive Learning Index
// Exports all adaptive personalization functions

export {
  adaptSuggestionsForUser,
  adaptMessage,
  generatePersonalizedSuggestion,
} from "./suggestions";

export {
  adaptNotificationDelivery,
  createNotificationDigest,
  calculateOptimalFrequency,
  hasReachedLimit,
} from "./notifications";

export {
  getCalibratedEstimate,
  getCalibratedEstimates,
  calculateTotalTime,
  suggestBetterEstimate,
  getEstimationTips,
  recordActualCompletion,
} from "./estimates";
