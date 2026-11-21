import fs from "node:fs/promises";
import { CONFIG } from "./constants.js";
import { QueueStatus, ScheduledPostItem, PostVisibility } from "./types.js";
import { createLinkedInPost, addLinkedInComment } from "./api.js";

interface QueueStorage {
  version: string;
  updatedAt: string;
  items: ScheduledPostItem[];
}

async function readQueue(): Promise<QueueStorage> {
  const filePath = CONFIG.queueFilePath;
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as QueueStorage;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const initial: QueueStorage = {
        version: "1.0.0",
        updatedAt: new Date().toISOString(),
        items: [],
      };
      await writeQueue(initial);
      return initial;
    }
    throw err;
  }
}

async function writeQueue(data: QueueStorage): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await fs.writeFile(CONFIG.queueFilePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function addScheduledPost(params: {
  scheduledTime: string; // ISO 8601 string
  authorUrn?: string;
  commentary: string;
  visibility?: PostVisibility;
  mediaUrn?: string;
  article?: {
    source: string;
    title?: string;
    description?: string;
    thumbnail?: string;
  };
  firstComment?: string;
}): Promise<ScheduledPostItem> {
  const date = new Date(params.scheduledTime);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid scheduledTime format: "${params.scheduledTime}". Please provide an ISO 8601 date string (e.g. 2026-11-20T09:00:00Z).`);
  }

  const queue = await readQueue();
  const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const item: ScheduledPostItem = {
    id,
    createdAt: new Date().toISOString(),
    scheduledTime: date.toISOString(),
    status: QueueStatus.SCHEDULED,
    authorUrn: params.authorUrn || CONFIG.defaultAuthorUrn || "",
    commentary: params.commentary,
    visibility: params.visibility || PostVisibility.PUBLIC,
    mediaUrn: params.mediaUrn,
    article: params.article,
    firstComment: params.firstComment,
  };

  queue.items.push(item);
  await writeQueue(queue);
  return item;
}

export async function listScheduledPosts(filter?: {
  status?: QueueStatus;
  limit?: number;
}): Promise<ScheduledPostItem[]> {
  const queue = await readQueue();
  let items = queue.items;

  if (filter?.status) {
    items = items.filter((item) => item.status === filter.status);
  }

  // Sort by scheduledTime ascending (chronological)
  items.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  if (filter?.limit && filter.limit > 0) {
    items = items.slice(0, filter.limit);
  }

  return items;
}

export async function cancelScheduledPost(id: string): Promise<boolean> {
  const queue = await readQueue();
  const item = queue.items.find((it) => it.id === id);
  if (!item) {
    return false;
  }
  item.status = QueueStatus.CANCELLED;
  await writeQueue(queue);
  return true;
}

export async function publishDuePosts(signal?: AbortSignal): Promise<{
  published: Array<{ id: string; postUrn: string }>;
  failed: Array<{ id: string; error: string }>;
  pendingCount: number;
}> {
  const queue = await readQueue();
  const now = new Date();

  const published: Array<{ id: string; postUrn: string }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const item of queue.items) {
    if (item.status !== QueueStatus.SCHEDULED) {
      continue;
    }

    const scheduledDate = new Date(item.scheduledTime);
    if (scheduledDate <= now) {
      try {
        const result = await createLinkedInPost({
          authorUrn: item.authorUrn || undefined,
          commentary: item.commentary,
          visibility: item.visibility,
          mediaUrn: item.mediaUrn,
          article: item.article,
          signal,
        });

        item.status = QueueStatus.PUBLISHED;
        item.publishedAt = new Date().toISOString();
        item.postUrn = result.postUrn;

        // Post first comment if defined
        if (item.firstComment && result.postUrn) {
          try {
            await addLinkedInComment(result.postUrn, item.firstComment, item.authorUrn || undefined, signal);
          } catch (commErr) {
            console.error(`Failed to publish first comment for post ${item.id}:`, commErr);
          }
        }

        published.push({ id: item.id, postUrn: result.postUrn });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        item.status = QueueStatus.FAILED;
        item.error = errMsg;
        failed.push({ id: item.id, error: errMsg });
      }
    }
  }

  await writeQueue(queue);

  const pendingCount = queue.items.filter((it) => it.status === QueueStatus.SCHEDULED).length;

  return { published, failed, pendingCount };
}
