import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useSearchHistory } from "@/hooks/use-search-history";

interface CategoryDrilldownBarProps {
  all: any[];
  parseCategoryPathParts: (category_path: string) => any;
  matchCategory: (a: string, b: string) => boolean;
  selectedLargeCategory: string | null;
  setSelectedLargeCategory: (v: string | null) => void;
  selectedMediumCategory: string | null;
  setSelectedMediumCategory: (v: string | null) => void;
  selectedSmallCategory: string | null;
  setSelectedSmallCategory: (v: string | null) => void;
  selectedSmallestCategory: string | null;
  setSelectedSmallestCategory: (v: string | null) => void;
}

const CategoryDrilldownBar = ({
  all,
  parseCategoryPathParts,
  matchCategory,
  selectedLargeCategory,
  setSelectedLargeCategory,
  selectedMediumCategory,
  setSelectedMediumCategory,
  selectedSmallCategory,
  setSelectedSmallCategory,
  selectedSmallestCategory,
  setSelectedSmallestCategory,
}: CategoryDrilldownBarProps) => {
  const allCategoryParts = useMemo(() => all.map(c => parseCategoryPathParts(c.category_path)), [all]);
  const largeOptions = useMemo(() => Array.from(new Set(allCategoryParts.map(p => p.large))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')), [allCategoryParts]);
  const mediumOptions = useMemo(() => selectedLargeCategory ? Array.from(new Set(allCategoryParts.filter(p => matchCategory(p.large, selectedLargeCategory)).map(p => p.medium))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')) : [], [allCategoryParts, selectedLargeCategory]);
  const smallOptions = useMemo(() => selectedLargeCategory && selectedMediumCategory ? Array.from(new Set(allCategoryParts.filter(p => matchCategory(p.large, selectedLargeCategory) && matchCategory(p.medium, selectedMediumCategory)).map(p => p.small))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')) : [], [allCategoryParts, selectedLargeCategory, selectedMediumCategory]);
  const smallestOptions = useMemo(() => selectedLargeCategory && selectedMediumCategory && selectedSmallCategory ? Array.from(new Set(allCategoryParts.filter(p => matchCategory(p.large, selectedLargeCategory) && matchCategory(p.medium, selectedMediumCategory) && matchCategory(p.small, selectedSmallCategory)).map(p => p.smallest))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')) : [], [allCategoryParts, selectedLargeCategory, selectedMediumCategory, selectedSmallCategory]);

  const [largeSearch, setLargeSearch] = useState("");
  const [mediumSearch, setMediumSearch] = useState("");
  const [smallSearch, setSmallSearch] = useState("");
  const [smallestSearch, setSmallestSearch] = useState("");

  const largeHistory = useSearchHistory('category-large');
  const mediumHistory = useSearchHistory('category-medium');
  const smallHistory = useSearchHistory('category-small');
  const smallestHistory = useSearchHistory('category-smallest');

  return (
    <div className="flex flex-col gap-2 mt-4">
      <Breadcrumb>
        {selectedLargeCategory && <BreadcrumbItem>{selectedLargeCategory}</BreadcrumbItem>}
        {selectedMediumCategory && <><BreadcrumbSeparator /> <BreadcrumbItem>{selectedMediumCategory}</BreadcrumbItem></>}
        {selectedSmallCategory && <><BreadcrumbSeparator /> <BreadcrumbItem>{selectedSmallCategory}</BreadcrumbItem></>}
        {selectedSmallestCategory && <><BreadcrumbSeparator /> <BreadcrumbItem>{selectedSmallestCategory}</BreadcrumbItem></>}
      </Breadcrumb>
      <div className="flex gap-2">
        {/* 대분류 드롭다운+검색 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{selectedLargeCategory || "대분류 선택"}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <Input placeholder="대분류 검색" value={largeSearch} onChange={e => setLargeSearch(e.target.value)} className="mb-2" />
            {largeHistory.getHistory().length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 px-2">최근 검색</div>
                {largeHistory.getHistory().map((h, i) => (
                  <div key={i} className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-sm" onClick={() => { setLargeSearch(h); }}>
                    {h}
                  </div>
                ))}
              </div>
            )}
            {largeOptions.filter(opt => !largeSearch || opt.includes(largeSearch)).map(opt => (
              <DropdownMenuItem key={opt} onClick={() => { setSelectedLargeCategory(opt); setSelectedMediumCategory(null); setSelectedSmallCategory(null); setSelectedSmallestCategory(null); setLargeSearch(""); largeHistory.addHistory(opt); }}>
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* 중분류 드롭다운+검색 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={!selectedLargeCategory}>{selectedMediumCategory || "중분류 선택"}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <Input placeholder="중분류 검색" value={mediumSearch} onChange={e => setMediumSearch(e.target.value)} className="mb-2" />
            {mediumHistory.getHistory().length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 px-2">최근 검색</div>
                {mediumHistory.getHistory().map((h, i) => (
                  <div key={i} className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-sm" onClick={() => { setMediumSearch(h); }}>
                    {h}
                  </div>
                ))}
              </div>
            )}
            {mediumOptions.filter(opt => !mediumSearch || opt.includes(mediumSearch)).map(opt => (
              <DropdownMenuItem key={opt} onClick={() => { setSelectedMediumCategory(opt); setSelectedSmallCategory(null); setSelectedSmallestCategory(null); setMediumSearch(""); mediumHistory.addHistory(opt); }}>
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* 소분류 드롭다운+검색 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={!selectedMediumCategory}>{selectedSmallCategory || "소분류 선택"}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <Input placeholder="소분류 검색" value={smallSearch} onChange={e => setSmallSearch(e.target.value)} className="mb-2" />
            {smallHistory.getHistory().length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 px-2">최근 검색</div>
                {smallHistory.getHistory().map((h, i) => (
                  <div key={i} className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-sm" onClick={() => { setSmallSearch(h); }}>
                    {h}
                  </div>
                ))}
              </div>
            )}
            {smallOptions.filter(opt => !smallSearch || opt.includes(smallSearch)).map(opt => (
              <DropdownMenuItem key={opt} onClick={() => { setSelectedSmallCategory(opt); setSelectedSmallestCategory(null); setSmallSearch(""); smallHistory.addHistory(opt); }}>
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* 세분류 드롭다운+검색 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={!selectedSmallCategory}>{selectedSmallestCategory || "세분류 선택"}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <Input placeholder="세분류 검색" value={smallestSearch} onChange={e => setSmallestSearch(e.target.value)} className="mb-2" />
            {smallestHistory.getHistory().length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 px-2">최근 검색</div>
                {smallestHistory.getHistory().map((h, i) => (
                  <div key={i} className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-sm" onClick={() => { setSmallestSearch(h); }}>
                    {h}
                  </div>
                ))}
              </div>
            )}
            {smallestOptions.filter(opt => !smallestSearch || opt.includes(smallestSearch)).map(opt => (
              <DropdownMenuItem key={opt} onClick={() => { setSelectedSmallestCategory(opt); setSmallestSearch(""); smallestHistory.addHistory(opt); }}>
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default CategoryDrilldownBar; 