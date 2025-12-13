import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const config: any = {
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };

  // server 설정은 개발 환경에서만 적용 (배포 환경과 충돌 방지)
  if (mode === 'development') {
    config.server = {
      host: "localhost",
      port: 9000,
      strictPort: true,
      hmr: {
        port: 9000,
        clientPort: 9000,
      },
      watch: {
        usePolling: false,
      },
    };
  }

  return config;
});
