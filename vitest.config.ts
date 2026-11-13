import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same as tsconfig's "paths".
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
