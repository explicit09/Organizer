# Life Organizer — Product Spec (v0)

## Goal
Build a personal “command center” that turns natural language into an organized system across **Tasks**, **Meetings**, and **School Work**, then tracks progress over time. The system should be able to **move items around**, **break work down**, and **propose schedules** (with user approval).

## Core Functionality

### 1) Natural language input → intelligent routing
**What you say**
- “I need to study for my finance exam next week”
- “Set up a call with Professor Smith about the project”
- “Remind me to submit my internship application by Friday”
- “I have 3 assignments due: math homework, essay, and coding project”

**What the tool does**
- Uses AI to categorize into: **Tasks**, **Meetings**, or **School Work**
- Breaks down complex requests into actionable items
- Assigns priorities and deadlines
- Routes to the right category
- Suggests scheduling / blocking time

### 2) Task management
- Create tasks from natural language
- Auto-breakdown into subtasks
- Priority assignment: `urgent | high | medium | low`
- Due dates and reminders
- Tags / categories: `Work`, `Personal`, `School`, `LEARN-X`, etc.
- Status: `Not Started | In Progress | Completed | Blocked`
- Progress tracking per task

### 3) Meeting & calendar management
- Create calendar events from input
- Find available slots (based on calendar + constraints)
- Generate meeting descriptions/agendas
- Send calendar invites (when integrated)
- Block buffer time before/after
- Reminders and notifications
- Two-way sync with Google Calendar (when enabled)

### 4) School work organization
- Assignments tracking (due dates, course, status)
- Study session scheduling
- Exam preparation planning
- Course materials organization
- Progress by course/class
- Syllabus integration (if available)
- Grade tracking (optional)

### 5) AI-powered organization
- Intelligent categorization: route to **Tasks**, **Meetings**, **School Work**
- Smart breakdown: split complex requests into subtasks
- Scheduling suggestions: propose times based on calendar and habits
- Priority detection: infer urgency from context (“by Friday”, “next week”, “ASAP”)
- Duplicate detection: flag similar existing items
- Pattern recognition: learn from workflow preferences over time

### 6) Progress tracking & analytics
Dashboard shows:
- Tasks completed this week/month
- Meeting attendance rate
- School work completion rate
- Time allocation across categories
- Progress trends over time

Additional tracking:
- Per-item progress (subtask completion, study time, etc.)
- Weekly/monthly reports
- Goal tracking (e.g., “Complete 90% of school assignments”)

### 7) Intelligent features
- Context awareness: references related items (e.g., “the finance exam” links to the exam entry)
- Proactive suggestions: “You have 3 tasks due tomorrow—reschedule any?”
- Conflict detection: flag scheduling conflicts
- Time estimation: suggest durations for tasks and blocks
- Workload balance: warn when the week is overloaded

## User Flows

### Flow 1: Adding a complex task
**You:** “I need to prepare for my CFA Level 1 exam in 3 months”

**Tool**
1. Categorizes → `School Work`
2. Breaks down → example tasks
   - Create study schedule (1 week)
   - Gather study materials (3 days)
   - Complete practice questions (ongoing)
   - Schedule practice exams (monthly)
3. Assigns deadlines based on exam date
4. Creates calendar blocks for study time
5. Sets up progress tracking for each subtask

### Flow 2: Setting up a meeting
**You:** “Meet with John next Tuesday afternoon to discuss LEARN-X roadmap”

**Tool**
1. Categorizes → `Meeting`
2. Checks calendar for Tuesday afternoon availability
3. Suggests specific time slots
4. Creates calendar event (draft until approved)
5. Generates agenda template: “LEARN-X Roadmap Discussion”
6. Adds prep task: “Prepare LEARN-X roadmap notes”
7. Sends invite (if integrated + approved)

### Flow 3: School work management
**You:** “I have assignments: math homework due Friday, essay due next Monday, coding project due in 2 weeks”

**Tool**
1. Categorizes → `School Work` (all 3)
2. Creates 3 assignment entries
3. Assigns priority based on due dates
4. Suggests time blocks for each
5. Breaks down complex items (essay → research, outline, draft, edit)
6. Tracks progress on each
7. Dashboard highlight: “3 assignments, 1 urgent”

### Flow 4: Progress review
**You:** “Show me my progress”

**Tool displays**
- Completed: `12/15 tasks` this week (`80%`)
- Meetings: `5 scheduled`, `3 completed`
- School: `8/10 assignments` on track
- Time spent: `40% tasks`, `30% meetings`, `30% school`
- Trends: `+15%` vs last week

## Unique Capabilities
1. Unified command center: one place for tasks, meetings, and school work
2. AI-first organization: interprets intent and organizes automatically
3. Automatic breakdown: splits complex items into actionable steps
4. Context-aware: understands relationships between items
5. Progress visibility: clear metrics and trends
6. Calendar integration: two-way sync with Google Calendar
7. Proactive intelligence: suggestions and conflict warnings

## What Makes It Different
- Natural language → organized system (no manual categorization)
- Break down complex items automatically
- Unified view across tasks/meetings/school
- Progress tracking at multiple levels
- Calendar-aware scheduling (with approval)
- Built for builders: fast input, clear output, measurable progress

## Initial Data Model (Draft)
Minimal entities (can be expanded):
- `Item`
  - `id`, `type` (`task|meeting|school`), `title`, `details`
  - `status`, `priority`, `tags[]`
  - `dueAt?`, `startAt?`, `endAt?`, `estimatedMinutes?`
  - `parentId?` (for subtasks), `courseId?`, `projectId?`
  - `createdAt`, `updatedAt`
- `Course` (optional early): `id`, `name`, `term`, `instructor?`
- `Project` (optional early): `id`, `name`, `area`, `goal?`
- `ActivityLog`: immutable events for history/undo and analytics

## Guardrails (Non-Negotiables)
- No external action (sending invites / editing calendar) without explicit approval.
- Every AI change must show a **why** (reasoning summary) and be **undoable**.
- Keep an audit trail of all moves/schedules/edits.

## Integrations (Planned)
- Google Calendar (two-way sync)
- Email (Gmail) for drafting/sending invites (optional)
- Notifications (desktop/mobile) (later)

