declare global {
  interface CloudflareEnv {
    PORTAL_KV?: {
      get(key: string): Promise<string | null>;
      put(key: string, value: string): Promise<void>;
      delete(key: string): Promise<void>;
    };
  }
}

export {};
