import { delay, http, HttpResponse } from "msw";
import type { Activity, Task } from "../schema";

const tasks: Task[] = [
  {
    id: "t-1",
    title: "Write first API hook",
    done: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "t-2",
    title: "Connect invalidation",
    done: true,
    createdAt: new Date().toISOString(),
  },
];

const activities: Activity[] = Array.from({ length: 24 }, (_, index) => ({
  id: `a-${index + 1}`,
  message: `Activity #${index + 1}`,
  at: new Date(Date.now() - index * 60_000).toISOString(),
}));

export const handlers = [
  http.get("/api/tasks", async () => {
    await delay(200);
    return HttpResponse.json(tasks);
  }),

  http.post("/api/tasks", async ({ request }) => {
    await delay(250);
    const body = (await request.json()) as { title?: string };

    if (!body.title || body.title.trim().length < 3) {
      return HttpResponse.json(
        { message: "Title must be at least 3 characters" },
        { status: 422 }
      );
    }

    const newTask: Task = {
      id: `t-${crypto.randomUUID()}`,
      title: body.title.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };

    tasks.unshift(newTask);
    activities.unshift({
      id: `a-${crypto.randomUUID()}`,
      message: `Created \"${newTask.title}\"`,
      at: new Date().toISOString(),
    });

    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.post("/api/tasks/:id/toggle", async ({ params }) => {
    await delay(180);

    if (Math.random() < 0.3) {
      return HttpResponse.json(
        { message: "Random failure, retry in action" },
        { status: 500 }
      );
    }

    const task = tasks.find((item) => item.id === params.id);
    if (!task) {
      return HttpResponse.json({ message: "Task not found" }, { status: 404 });
    }

    task.done = !task.done;
    activities.unshift({
      id: `a-${crypto.randomUUID()}`,
      message: `${task.done ? "Completed" : "Reopened"} \"${task.title}\"`,
      at: new Date().toISOString(),
    });

    return HttpResponse.json(task);
  }),

  http.get("/api/activities", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const cursor = Number(url.searchParams.get("cursor") ?? "0") || 0;
    const limit = Number(url.searchParams.get("limit") ?? "6") || 6;

    const items = activities.slice(cursor, cursor + limit);
    const nextCursor =
      cursor + limit < activities.length ? cursor + limit : null;

    return HttpResponse.json({ items, nextCursor });
  }),
];
