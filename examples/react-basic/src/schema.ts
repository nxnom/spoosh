export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export type Activity = {
  id: string;
  message: string;
  at: string;
};

export type ApiError = {
  message: string;
};

export type ApiSchema = {
  tasks: {
    GET: { data: Task[]; error: ApiError };
    POST: { data: Task; body: { title: string }; error: ApiError };
  };
  "tasks/:id/toggle": {
    POST: { data: Task; params: { id: string }; error: ApiError };
  };
  activities: {
    GET: {
      data: {
        items: Activity[];
        nextCursor: number | null;
      };
      query: { cursor?: number; limit?: number };
      error: ApiError;
    };
  };
};
