import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: {
        settings: { disableCSSFileLoading: true },
      },
    },
    exclude: ["bench/**", "node_modules/**", "build/**"],
    restoreMocks: true,
  },
});
