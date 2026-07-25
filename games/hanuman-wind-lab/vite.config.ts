import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // relative paths so itch.io HTML5 builds work in a subfolder
  resolve: {
    alias: {
      "@sim": "/src/sim",
      "@view": "/src/view",
      "@content": "/src/content",
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
  },
});
