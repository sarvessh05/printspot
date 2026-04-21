// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
// import path from "path";

// // https://vitejs.dev/config/
// export default defineConfig(({ mode }) => ({
//   server: {
//     host: "::",
//     port: 8080,
//     proxy: {
//       '/api': {
//         target: 'http://localhost:8083',
//         changeOrigin: true,
//       },
//       '/admin': {
//         target: 'http://localhost:8083',
//         changeOrigin: true,
//       },
//       '/kiosk-api': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/kiosk-api/, ''),
//       }
//     },
//     hmr: {
//       overlay: false,
//     },
//   },
//   plugins: [react()],
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//     dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
//   },
//   build: {
//     rollupOptions: {
//       output: {
//         manualChunks: {
//           'pdf-utils': ['pdfjs-dist', 'pdf-lib'],
//           'ui-vendor': ['framer-motion', 'lucide-react', '@radix-ui/react-tooltip', '@radix-ui/react-dialog'],
//           'react-vendor': ['react', 'react-dom', 'react-router-dom'],
//         },
//       },
//     },
//     chunkSizeWarningLimit: 1000,
//     minify: 'esbuild',
//   },
// }));



import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",  // Allow network access for iOS Simulator
    port: 5173,        // Use port 5173 (not 8080)
    proxy: {
      '/api': {
        target: 'http://localhost:8083',  // Cloud Admin API
        changeOrigin: true,
        secure: false,
      },
      '/admin': {
        target: 'http://localhost:8083',  // Cloud Admin API
        changeOrigin: true,
        secure: false,
      },
      '/kiosk-api': {
        target: 'http://localhost:5001',  // Kiosk Server (using port 5001)
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/kiosk-api/, ''),
      }
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'react-pdf'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-utils': ['pdfjs-dist', 'pdf-lib'],
          'ui-vendor': ['framer-motion', 'lucide-react', '@radix-ui/react-tooltip', '@radix-ui/react-dialog'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
  },
}));
