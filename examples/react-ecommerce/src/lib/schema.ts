import type { SpooshSchema } from "@spoosh/core";

export type ApiError = {
  message: string;
  code?: string;
};

export type ProductRaw = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  price_cents: number;
  rating_avg: number;
  likes_count: number;
  in_stock: boolean;
};

export type CommentRaw = {
  id: string;
  product_id: string;
  author_name: string;
  body: string;
  created_at: string;
  status?: "pending";
};

export type CartItemRaw = {
  id: string;
  product_id: string;
  title: string;
  image_url: string;
  quantity: number;
  price_cents: number;
};

export type OrderStatusRaw = {
  order_id: string;
  status: "processing" | "paid";
  updated_at: string;
};

export type ApiSchema = SpooshSchema<{
  products: {
    GET: {
      data: {
        items: ProductRaw[];
        next_page: number | null;
      };
      query: {
        page?: number;
        q?: string;
      };
      error: ApiError;
    };
  };
  "products/:id": {
    GET: {
      data: ProductRaw;
      params: { id: string };
      error: ApiError;
    };
  };
  "products/:id/comments": {
    GET: {
      data: CommentRaw[];
      params: { id: string };
      error: ApiError;
    };
    POST: {
      data: CommentRaw;
      params: { id: string };
      body: {
        body: string;
      };
      error: ApiError;
    };
  };
  "products/:id/like": {
    POST: {
      data: {
        likes_count: number;
      };
      params: { id: string };
      error: ApiError;
    };
  };
  cart: {
    GET: {
      data: CartItemRaw[];
      error: ApiError;
    };
    POST: {
      data: CartItemRaw;
      body: {
        product_id: string;
        quantity: number;
      };
      error: ApiError;
    };
  };
  "cart/:id": {
    DELETE: {
      data: { ok: true };
      params: { id: string };
      error: ApiError;
    };
  };
  checkout: {
    POST: {
      data: {
        order_id: string;
      };
      body: {
        email: string;
        address: string;
      };
      error: ApiError;
    };
  };
  "orders/:id/status": {
    GET: {
      data: OrderStatusRaw;
      params: { id: string };
      error: ApiError;
    };
  };
}>;
