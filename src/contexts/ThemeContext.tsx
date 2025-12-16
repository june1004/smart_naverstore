import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "blue" | "green" | "purple" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark" | "blue" | "green" | "purple";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // localStorage에서 테마 가져오기, 없으면 시스템 설정 사용
    const stored = localStorage.getItem("theme") as Theme | null;
    return stored || "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark" | "blue" | "green" | "purple">("light");

  useEffect(() => {
    const root = window.document.documentElement;
    
    // 시스템 테마 감지 함수
    const getSystemTheme = (): "light" | "dark" => {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };

    // 테마 적용 함수
    const applyTheme = () => {
      let effectiveTheme: "light" | "dark" | "blue" | "green" | "purple";
      
      if (theme === "system") {
        effectiveTheme = getSystemTheme();
      } else {
        effectiveTheme = theme;
      }
      
      setResolvedTheme(effectiveTheme);

      // 모든 테마 클래스 제거
      root.classList.remove("light", "dark", "theme-blue", "theme-green", "theme-purple");
      
      // 현재 테마 클래스 추가
      if (effectiveTheme === "blue" || effectiveTheme === "green" || effectiveTheme === "purple") {
        root.classList.add(`theme-${effectiveTheme}`);
      } else {
        root.classList.add(effectiveTheme);
      }
    };

    applyTheme();

    // 시스템 테마 변경 감지 (system 모드일 때만)
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

