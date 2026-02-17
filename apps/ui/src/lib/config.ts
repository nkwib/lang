const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;

export const apiBaseUrl = viteEnv?.PUBLIC_API_BASE_URL || "http://localhost:8080";
