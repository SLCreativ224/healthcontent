import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/authToken";

// In dev: empty string (Vite proxies to localhost:5000)
// In production: set VITE_API_URL to the Railway backend URL, e.g. https://healthcontent.up.railway.app
// If not set, fall back to the Perplexity port proxy path (derived at runtime)
function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, ""); // Railway URL
  if ("__PORT_5000__".startsWith("__")) return ""; // dev mode
  // Fallback: derive port proxy path from current window location
  const base = window.location.pathname.replace(/\/[^/]*$/, "");
  return base + "/port/5000";
}
const API_BASE = getApiBase();

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let text = res.statusText;
    let raw = "";
    try { raw = await res.text(); const j = JSON.parse(raw); text = j.message ?? j.detail ?? text; } catch { text = raw || text; }
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown,
): Promise<T> {
  const headers = authHeaders(data !== undefined ? { "Content-Type": "application/json" } : {});
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  if (method === "DELETE") return {} as T;
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const parts = queryKey as string[];
    let url = `${API_BASE}${parts[0]}`;
    if (parts.length > 1) url = `${API_BASE}${parts[0]}/${parts[1]}`;

    const res = await fetch(url, {
      credentials: "include",
      headers: authHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
