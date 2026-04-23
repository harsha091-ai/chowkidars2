import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";

export default defineConfig({
  tanstackStart: {
    // Explicitly tell TanStack Start where to find your app and router
    appDirectory: 'src',
    routerFile: 'src/router.tsx',
  },
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // This ensures your project builds into a single dist folder
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  }
});
