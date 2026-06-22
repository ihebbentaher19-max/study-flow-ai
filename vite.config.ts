// @lovable.dev/vite-tanstack-config already includes base plugins and defaults
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
const config: any = {
  tanstackStart: {
    // SSR entry point
    server: {
      entry: "server",
    },
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 2000,
    },
  },
};
if (process.env.RENDER) {
  config.nitro = {
    preset: "node-server",
  };
}
export default defineConfig(config);