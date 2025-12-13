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
      host: true, // 모든 네트워크 인터페이스에서 접근 가능
      port: 9000,
      strictPort: false, // 포트가 사용 중이면 자동으로 다른 포트 사용
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 9000,
      },
    };
  }

  return config;
});
