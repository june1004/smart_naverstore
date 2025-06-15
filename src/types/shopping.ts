
export interface ShoppingItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
  reviewCount: number;
  reviewUrl: string;
  registeredAt: string;
  // 고정된 추가 데이터
  integrationScore: number;
  clickCount: number;
  integrationRank: number;
  integrationClickRank: number;
  integrationSearchRatio: number;
  brandKeywordType: string;
  shoppingMallKeyword: string;
  originalIndex: number; // API에서 받은 원래 순서를 저장
}

export interface CategoryAnalysis {
  mainCategory: string[] | null;
  allCategories: Array<[string, number]>;
}

export interface SearchHistory {
  keyword: string;
  searchTime: string;
  results: ShoppingItem[];
  categoryAnalysis: CategoryAnalysis | null;
}

export type SortField = 'original' | 'title' | 'mallName' | 'lprice' | 'brand' | 'maker' | 'reviewCount' | 'registeredAt' | 'integrationScore' | 'clickCount' | 'integrationRank';
