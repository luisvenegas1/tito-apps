import { defineConfig } from "vitest/config";

// Pruebas de RLS: necesitan Supabase local corriendo (pnpm db:start).
export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
