const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  if (window.location.hostname === "localhost") {
    return "http://localhost:3001";
  }

  return window.location.origin;
};

export const API_BASE_URL = getApiBaseUrl();

export const apiRequest = async <T,>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> => {
  const headers = new Headers(options.headers ?? {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error?: { message?: unknown } }).error?.message ===
        "string"
        ? ((parsed as { error: { message: string } }).error.message as string)
        : `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  return parsed as T;
};
