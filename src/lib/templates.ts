import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { createItem, type ItemType } from "./items";

export type Template = {
  id: string;
  userId: string;
  name: string;
  type: ItemType;
  data: {
    title?: string;
    details?: string;
    priority?: string;
    tags?: string[];
    estimatedMinutes?: number;
    subtasks?: Array<{ title: string }>;
  };
  createdAt: string;
  updatedAt: string;
};

type TemplateRow = {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  data_json: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: TemplateRow): Template {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    type: row.type as ItemType,
    data: JSON.parse(row.data_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTemplate(
  input: {
    name: string;
    type: ItemType;
    data: Template["data"];
  },
  options?: { userId?: string }
): Template {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO templates (id, user_id, name, type, data_json, created_at, updated_at)
      VALUES (@id, @user_id, @name, @type, @data_json, @created_at, @updated_at)
    `
  ).run({
    id,
    user_id: userId,
    name: input.name,
    type: input.type,
    data_json: JSON.stringify(input.data),
    created_at: now,
    updated_at: now,
  });

  return {
    id,
    userId,
    name: input.name,
    type: input.type,
    data: input.data,
    createdAt: now,
    updatedAt: now,
  };
}

export function listTemplates(options?: { userId?: string; type?: ItemType }): Template[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  if (options?.type) {
    const rows = db
      .prepare("SELECT * FROM templates WHERE user_id = ? AND type = ? ORDER BY name ASC")
      .all(userId, options.type) as TemplateRow[];
    return rows.map(mapRow);
  }

  const rows = db
    .prepare("SELECT * FROM templates WHERE user_id = ? ORDER BY name ASC")
    .all(userId) as TemplateRow[];

  return rows.map(mapRow);
}

export function getTemplate(id: string, options?: { userId?: string }): Template | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare("SELECT * FROM templates WHERE id = ? AND user_id = ?")
    .get(id, userId) as TemplateRow | undefined;

  return row ? mapRow(row) : null;
}

export function updateTemplate(
  id: string,
  updates: Partial<{ name: string; data: Template["data"] }>,
  options?: { userId?: string }
): Template | null {
  const db = getDb();
  const now = new Date().toISOString();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      UPDATE templates SET
        name = COALESCE(@name, name),
        data_json = COALESCE(@data_json, data_json),
        updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `
  ).run({
    id,
    user_id: userId,
    name: updates.name ?? null,
    data_json: updates.data ? JSON.stringify(updates.data) : null,
    updated_at: now,
  });

  return getTemplate(id, options);
}

export function deleteTemplate(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare("DELETE FROM templates WHERE id = ? AND user_id = ?")
    .run(id, userId);

  return result.changes > 0;
}

export function createItemFromTemplate(
  templateId: string,
  overrides?: { title?: string },
  options?: { userId?: string }
) {
  const template = getTemplate(templateId, options);
  if (!template) {
    throw new Error("Template not found");
  }

  const item = createItem(
    {
      type: template.type,
      title: overrides?.title || template.data.title || template.name,
      details: template.data.details,
      priority: template.data.priority as "urgent" | "high" | "medium" | "low" | undefined,
      tags: template.data.tags,
      estimatedMinutes: template.data.estimatedMinutes,
    },
    options
  );

  // Create subtasks if any
  if (template.data.subtasks && template.data.subtasks.length > 0) {
    for (const subtask of template.data.subtasks) {
      createItem(
        {
          type: template.type,
          title: subtask.title,
          parentId: item.id,
        },
        options
      );
    }
  }

  return item;
}
