
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CategoryInfo {
  name: string;
  code: string;
  level1: string;
  level2: string;
  level3: string;
  count: number;
  percentage: string;
}

interface AnalysisResult {
  keyword: string;
  categoryAnalysis: {
    totalItems: number;
    recommendedCategories: CategoryInfo[];
  };
  insights: Array<{
    category: CategoryInfo;
    insight: {
      title: string;
      results: Array<{
        title: string;
        data: Array<{
          period: string;
          ratio: number;
        }>;
      }>;
    };
  }>;
  monthlySearchStats: {
    keyword: string;
    monthlyData: Array<{
      period: string;
      ratio: number;
    }>;
    competitiveness: string;
    validity: string;
  };
  priceAnalysis: Array<{
    range: string;
    count: number;
    percentage: string;
  }>;
  clickTrends: Array<{
    period: string;
    ratio: number;
  }>;
  demographicAnalysis: {
    age: Array<{ range: string; percentage: number }>;
    gender: Array<{ type: string; percentage: number }>;
    device: Array<{ type: string; percentage: number }>;
  };
  timestamp: number;
}

interface AnalysisContextType {
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  isAnalysisValid: () => boolean;
  clearAnalysisResult: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

interface AnalysisProviderProps {
  children: ReactNode;
}

export const AnalysisProvider: React.FC<AnalysisProviderProps> = ({ children }) => {
  const [analysisResult, setAnalysisResultState] = useState<AnalysisResult | null>(() => {
    // 페이지 새로고침 시에도 분석 결과 유지 (1시간 이내)
    const stored = localStorage.getItem('analysisResult');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1시간 (밀리초)
      
      if (now - parsed.timestamp < oneHour) {
        return parsed;
      } else {
        localStorage.removeItem('analysisResult');
      }
    }
    return null;
  });

  const setAnalysisResult = (result: AnalysisResult | null) => {
    if (result) {
      const resultWithTimestamp = {
        ...result,
        timestamp: Date.now()
      };
      setAnalysisResultState(resultWithTimestamp);
      localStorage.setItem('analysisResult', JSON.stringify(resultWithTimestamp));
    } else {
      setAnalysisResultState(null);
      localStorage.removeItem('analysisResult');
    }
  };

  const isAnalysisValid = () => {
    if (!analysisResult) return false;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1시간
    return now - analysisResult.timestamp < oneHour;
  };

  const clearAnalysisResult = () => {
    setAnalysisResultState(null);
    localStorage.removeItem('analysisResult');
  };

  // 1시간 후 자동 삭제를 위한 타이머
  useEffect(() => {
    if (analysisResult) {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const timeRemaining = oneHour - (now - analysisResult.timestamp);
      
      if (timeRemaining > 0) {
        const timer = setTimeout(() => {
          clearAnalysisResult();
        }, timeRemaining);
        
        return () => clearTimeout(timer);
      }
    }
  }, [analysisResult]);

  return (
    <AnalysisContext.Provider value={{
      analysisResult,
      setAnalysisResult,
      isAnalysisValid,
      clearAnalysisResult
    }}>
      {children}
    </AnalysisContext.Provider>
  );
};
