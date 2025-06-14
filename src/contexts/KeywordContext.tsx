
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface KeywordContextType {
  sharedKeyword: string;
  setSharedKeyword: (keyword: string) => void;
  clearSharedKeyword: () => void;
}

const KeywordContext = createContext<KeywordContextType | undefined>(undefined);

export const useKeyword = () => {
  const context = useContext(KeywordContext);
  if (context === undefined) {
    throw new Error('useKeyword must be used within a KeywordProvider');
  }
  return context;
};

interface KeywordProviderProps {
  children: ReactNode;
}

export const KeywordProvider: React.FC<KeywordProviderProps> = ({ children }) => {
  const [sharedKeyword, setSharedKeywordState] = useState<string>(() => {
    // 페이지 새로고침 시에도 키워드 유지
    return localStorage.getItem('sharedKeyword') || '';
  });

  const setSharedKeyword = (keyword: string) => {
    setSharedKeywordState(keyword);
    localStorage.setItem('sharedKeyword', keyword);
  };

  const clearSharedKeyword = () => {
    setSharedKeywordState('');
    localStorage.removeItem('sharedKeyword');
  };

  return (
    <KeywordContext.Provider value={{
      sharedKeyword,
      setSharedKeyword,
      clearSharedKeyword
    }}>
      {children}
    </KeywordContext.Provider>
  );
};
