/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url))



// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
  }, build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReactSwipeableList',
      // the proper extensions will be added
      fileName: 'react-swipeable-list',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['react', 'react-dom'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: 'React',
        },
      },
    },
  },
});
