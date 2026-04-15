import { getApiBase } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

function base() {
  return getApiBase().replace(/\/+$/, "");
}

export async function panelFetch<T = any>(
  orderId: string,
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    query?: Record<string, string>;
    rawBody?: string;
  } = {},
): Promise<T> {
  const { method = "GET", body, query, rawBody } = options;
  const token = getAccessToken();
  let url = `${base()}/api/panel/${orderId}/${endpoint}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const init: RequestInit = { method, headers };

  if (rawBody !== undefined && method !== "GET") {
    headers["Content-Type"] = "text/plain";
    init.body = rawBody;
  } else if (body && method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    let msg = `Panel returned ${res.status}`;
    try {
      msg = JSON.parse(text)?.error || JSON.parse(text)?.errors?.[0]?.detail || msg;
    } catch {
      /* use default msg */
    }
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

export async function panelDelete(
  orderId: string,
  endpoint: string,
): Promise<void> {
  const token = getAccessToken();
  const url = `${base()}/api/panel/${orderId}/${endpoint}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `Panel returned ${res.status}`;
    try {
      msg = JSON.parse(text)?.error || msg;
    } catch {
      /* use default */
    }
    throw new Error(msg);
  }
}
