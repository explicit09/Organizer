// SM-2 Spaced Repetition Algorithm Implementation
// Based on the SuperMemo 2 algorithm by Piotr Wozniak

// ========== Types ==========

export type ReviewCard = {
  itemId: string;
  topic: string;
  easeFactor: number;      // Difficulty factor (default 2.5)
  interval: number;        // Days until next review
  repetitions: number;     // Number of successful repetitions
  nextReview: string;      // ISO date string
  lastReview?: string;
};

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;
// 0 - Complete blackout
// 1 - Incorrect, but recognized upon seeing answer
// 2 - Incorrect, but easy to recall
// 3 - Correct with difficulty
// 4 - Correct with some hesitation
// 5 - Perfect recall

export type StudySession = {
  date: string;
  topic: string;
  durationMinutes: number;
  type: "learn" | "review" | "practice";
  recommended: boolean;
};

// ========== SM-2 Algorithm ==========

export function calculateNextReview(
  card: ReviewCard,
  quality: ReviewQuality
): ReviewCard {
  let { easeFactor, interval, repetitions } = card;

  // Update ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ease factor should not go below 1.3
  easeFactor = Math.max(1.3, easeFactor);

  if (quality < 3) {
    // Incorrect response - restart
    repetitions = 0;
    interval = 1;
  } else {
    // Correct response
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    ...card,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview: nextReviewDate.toISOString().slice(0, 10),
    lastReview: new Date().toISOString().slice(0, 10),
  };
}

// ========== Study Schedule Generation ==========

export type StudyPlanOptions = {
  examDate: Date;
  topics: string[];
  hoursPerDay?: number;
  preferredStartHour?: number;
  includeWeekends?: boolean;
  sessionDurationMinutes?: number;
};

export function generateStudySchedule(
  options: StudyPlanOptions
): StudySession[] {
  const {
    examDate,
    topics,
    hoursPerDay = 2,
    preferredStartHour = 9,
    includeWeekends = true,
    sessionDurationMinutes = 45,
  } = options;

  const sessions: StudySession[] = [];
  const now = new Date();
  const daysUntilExam = Math.ceil(
    (examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysUntilExam <= 0) {
    return [];
  }

  // Initialize cards for each topic
  const cards: ReviewCard[] = topics.map((topic) => ({
    itemId: `study-${topic.toLowerCase().replace(/\s+/g, "-")}`,
    topic,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: now.toISOString().slice(0, 10),
  }));

  // Sessions per day
  const sessionsPerDay = Math.floor((hoursPerDay * 60) / sessionDurationMinutes);

  // Generate study plan
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);

  // Phase 1: Initial learning (first 1/3 of time)
  const learningDays = Math.ceil(daysUntilExam / 3);
  const topicsPerDay = Math.ceil(topics.length / learningDays);

  let topicIndex = 0;

  for (let day = 0; day < daysUntilExam; day++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + day);

    // Skip weekends if not included
    if (!includeWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
      continue;
    }

    const dateStr = date.toISOString().slice(0, 10);

    // Phase 1: Learning new topics
    if (day < learningDays && topicIndex < topics.length) {
      for (let s = 0; s < Math.min(sessionsPerDay, topicsPerDay) && topicIndex < topics.length; s++) {
        sessions.push({
          date: dateStr,
          topic: topics[topicIndex],
          durationMinutes: sessionDurationMinutes,
          type: "learn",
          recommended: true,
        });
        topicIndex++;
      }
    }

    // Phase 2 & 3: Review based on spaced repetition
    // Find cards due for review
    const dueCards = cards.filter((card) => card.nextReview <= dateStr);

    for (const card of dueCards.slice(0, sessionsPerDay)) {
      // Simulate a quality of 4 for planning purposes
      const updatedCard = calculateNextReview(card, 4);
      Object.assign(card, updatedCard);

      sessions.push({
        date: dateStr,
        topic: card.topic,
        durationMinutes: sessionDurationMinutes,
        type: "review",
        recommended: true,
      });
    }

    // Fill remaining slots with practice
    const remainingSlots = sessionsPerDay - 
      sessions.filter((s) => s.date === dateStr).length;

    if (remainingSlots > 0 && day >= learningDays) {
      // Practice the most difficult topics
      const sortedByDifficulty = [...cards]
        .sort((a, b) => a.easeFactor - b.easeFactor)
        .slice(0, remainingSlots);

      for (const card of sortedByDifficulty) {
        sessions.push({
          date: dateStr,
          topic: card.topic,
          durationMinutes: Math.round(sessionDurationMinutes * 0.75),
          type: "practice",
          recommended: false,
        });
      }
    }

    // Intensive review in the last 3 days
    if (daysUntilExam - day <= 3) {
      // Add extra review sessions for all topics
      for (const topic of topics.slice(0, sessionsPerDay)) {
        sessions.push({
          date: dateStr,
          topic,
          durationMinutes: 30,
          type: "review",
          recommended: true,
        });
      }
    }
  }

  // Sort sessions by date
  sessions.sort((a, b) => a.date.localeCompare(b.date));

  return sessions;
}

// ========== Study Effectiveness ==========

export type StudyEffectiveness = {
  overallRetention: number;
  topicMastery: Array<{
    topic: string;
    mastery: number;
    nextReview: string;
  }>;
  suggestedFocus: string[];
  estimatedReadiness: number;
};

export function analyzeStudyEffectiveness(
  cards: ReviewCard[],
  examDate: Date
): StudyEffectiveness {
  const now = new Date();
  const daysUntilExam = Math.ceil(
    (examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  // Calculate topic mastery based on ease factor and repetitions
  const topicMastery = cards.map((card) => {
    // Mastery formula: combination of ease factor and repetitions
    const easeScore = ((card.easeFactor - 1.3) / (2.5 - 1.3)) * 50; // 0-50
    const repScore = Math.min(50, card.repetitions * 10); // 0-50
    const mastery = Math.round(easeScore + repScore);

    return {
      topic: card.topic,
      mastery,
      nextReview: card.nextReview,
    };
  });

  // Overall retention estimate
  const avgMastery = topicMastery.reduce((sum, t) => sum + t.mastery, 0) / topicMastery.length;
  const overallRetention = Math.round(avgMastery);

  // Topics that need focus (mastery < 50)
  const suggestedFocus = topicMastery
    .filter((t) => t.mastery < 50)
    .sort((a, b) => a.mastery - b.mastery)
    .map((t) => t.topic);

  // Estimate exam readiness
  // Factor in time remaining and current mastery
  const timeBonus = Math.min(20, daysUntilExam * 2); // Up to 20 points for time
  const estimatedReadiness = Math.min(100, Math.round(avgMastery * 0.8 + timeBonus));

  return {
    overallRetention,
    topicMastery,
    suggestedFocus,
    estimatedReadiness,
  };
}
