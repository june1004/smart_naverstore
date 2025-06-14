
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Upload, Download, Search, Database, Shield, ChevronRight, ChevronDown, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Category {
  id: string;
  category_id: string;
  category_name: string;
  parent_category_id?: string;
  category_level: number;
  category_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UploadRecord {
  id: string;
  filename: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  upload_status: string;
  created_at: string;
}

const CategoryManager = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 관리자 권한 확인 (june@nanumlab.com만 허용)
  const isAdmin = user?.email === 'june@nanumlab.com';

  // 카테고리 총 개수 조회
  const { data: categoryStats } = useQuery({
    queryKey: ['category-stats'],
    queryFn: async () => {
      console.log('카테고리 통계 조회 시작');
      
      const stats = {
        total: 0,
        level1: 0,
        level2: 0,
        level3: 0,
        level4: 0
      };

      // 전체 개수
      const { count: totalCount, error: totalError } = await supabase
        .from('naver_categories')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) {
        console.error('전체 카테고리 개수 조회 오류:', totalError);
        throw totalError;
      }
      
      stats.total = totalCount || 0;

      // 레벨별 개수
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('naver_categories')
          .select('*', { count: 'exact', head: true })
          .eq('category_level', level);
        
        if (error) {
          console.error(`레벨 ${level} 카테고리 개수 조회 오류:`, error);
        } else {
          if (level === 1) stats.level1 = count || 0;
          if (level === 2) stats.level2 = count || 0;
          if (level === 3) stats.level3 = count || 0;
          if (level === 4) stats.level4 = count || 0;
        }
      }

      console.log('카테고리 통계:', stats);
      return stats;
    },
  });

  // 카테고리 목록 조회 (페이지네이션 포함)
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['naver-categories-paginated', searchTerm, selectedLevel, currentPage, itemsPerPage],
    queryFn: async () => {
      console.log('카테고리 목록 조회 시작:', { searchTerm, selectedLevel, currentPage });
      
      let query = supabase
        .from('naver_categories')
        .select('*', { count: 'exact' })
        .order('category_level', { ascending: true })
        .order('category_name', { ascending: true });

      // 검색 조건 추가
      if (searchTerm) {
        query = query.or(`category_name.ilike.%${searchTerm}%,category_id.ilike.%${searchTerm}%,category_path.ilike.%${searchTerm}%`);
      }

      // 레벨 필터 추가
      if (selectedLevel !== null) {
        query = query.eq('category_level', selectedLevel);
      }

      // 페이지네이션 적용
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) {
        console.error('카테고리 목록 조회 오류:', error);
        throw error;
      }

      console.log('카테고리 목록 조회 완료:', { count, dataLength: data?.length });
      
      return {
        categories: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      };
    },
  });

  // 업로드 기록 조회
  const { data: uploadHistory } = useQuery({
    queryKey: ['category-uploads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as UploadRecord[];
    },
  });

  // CSV 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ csvData, filename }: { csvData: any[], filename: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('로그인이 필요합니다.');
      }

      if (!isAdmin) {
        throw new Error('관리자 권한이 필요합니다. (june@nanumlab.com 계정만 가능)');
      }

      const BATCH_SIZE = 100;
      const batches = [];
      for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
        batches.push(csvData.slice(i, i + BATCH_SIZE));
      }

      let totalSuccess = 0;
      let totalFailed = 0;
      const allErrors: any[] = [];

      setUploadProgress(10);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const progress = 10 + (i / batches.length) * 80;
        setUploadProgress(progress);

        try {
          const response = await fetch(`https://votlredkpkiafedzkham.supabase.co/functions/v1/upload-categories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ 
              csvData: batch, 
              filename: `${filename}_batch_${i + 1}` 
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `배치 ${i + 1} 업로드 실패`);
          }

          const result = await response.json();
          totalSuccess += result.successful;
          totalFailed += result.failed;
          if (result.errors) {
            allErrors.push(...result.errors);
          }
        } catch (error) {
          console.error(`배치 ${i + 1} 처리 오류:`, error);
          totalFailed += batch.length;
        }
      }

      setUploadProgress(100);

      return {
        successful: totalSuccess,
        failed: totalFailed,
        errors: allErrors.slice(0, 20)
      };
    },
    onSuccess: (result) => {
      toast({
        title: "CSV 업로드 완료",
        description: `성공: ${result.successful}개, 실패: ${result.failed}개`,
      });
      queryClient.invalidateQueries({ queryKey: ['naver-categories-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['category-uploads'] });
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error) => {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      toast({
        title: "권한 없음",
        description: "관리자만 카테고리를 업로드할 수 있습니다. (june@nanumlab.com 계정 필요)",
        variant: "destructive",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "파일 형식 오류",
        description: "CSV 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "파일 크기는 10MB 이하여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다.');
      }

      setUploadProgress(10);

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const csvData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      console.log(`CSV 파일 처리 완료: ${csvData.length}개 행`);

      await uploadMutation.mutateAsync({ csvData, filename: file.name });
    } catch (error) {
      console.error('파일 처리 오류:', error);
      toast({
        title: "파일 처리 오류",
        description: error instanceof Error ? error.message : "파일을 처리할 수 없습니다.",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = "카테고리번호,대분류,중분류,소분류,세분류\n" +
                      "50000000,패션의류,,,\n" +
                      "50000001,패션의류,여성의류,,\n" +
                      "50000002,패션의류,여성의류,원피스,\n" +
                      "50000003,패션의류,여성의류,원피스,미니원피스\n" +
                      "50100000,디지털/가전,,,\n" +
                      "50100001,디지털/가전,모바일/태블릿,,\n" +
                      "50100002,디지털/가전,모바일/태블릿,스마트폰,";
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '네이버_카테고리_템플릿.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleLevelFilter = (level: number | null) => {
    setSelectedLevel(level);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getLevelName = (level: number) => {
    switch (level) {
      case 1: return '대분류';
      case 2: return '중분류';
      case 3: return '소분류';
      case 4: return '세분류';
      default: return `${level}분류`;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-green-100 text-green-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (categoriesError) {
    console.error('카테고리 로딩 오류:', categoriesError);
  }

  return (
    <div className="space-y-6">
      {/* 관리자 권한 알림 */}
      {user && !isAdmin && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            카테고리 업로드는 관리자 권한이 필요합니다. (june@nanumlab.com 계정만 가능) 현재 읽기 전용 모드입니다.
          </AlertDescription>
        </Alert>
      )}

      {!user && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            카테고리 관리 기능을 사용하려면 로그인이 필요합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* CSV 업로드 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            카테고리 CSV 업로드
            {isAdmin && <Badge variant="secondary" className="ml-2">관리자 전용</Badge>}
          </CardTitle>
          <CardDescription>
            네이버 카테고리 정보를 CSV 파일로 일괄 업로드합니다. (최대 10MB, 중복 자동 처리)
            {!isAdmin && " - june@nanumlab.com 계정만 업로드 가능"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading || !isAdmin}
              className="flex-1"
            />
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              템플릿 다운로드
            </Button>
          </div>
          
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-600">
                업로드 중... {uploadProgress.toFixed(0)}% (배치 처리 진행 중)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 업로드 기록 */}
      {uploadHistory && uploadHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              최근 업로드 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadHistory.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{record.filename}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(record.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={record.upload_status === 'completed' ? 'default' : 
                                  record.upload_status === 'completed_with_errors' ? 'secondary' : 'destructive'}>
                      {record.upload_status}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      성공: {record.successful_records} / 실패: {record.failed_records}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 카테고리 통계 */}
      {categoryStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              카테고리 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleLevelFilter(null)}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{categoryStats.total}</div>
                  <div className="text-sm text-gray-600">전체</div>
                </div>
              </Card>
              <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleLevelFilter(1)}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{categoryStats.level1}</div>
                  <div className="text-sm text-gray-600">대분류</div>
                </div>
              </Card>
              <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleLevelFilter(2)}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{categoryStats.level2}</div>
                  <div className="text-sm text-gray-600">중분류</div>
                </div>
              </Card>
              <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleLevelFilter(3)}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{categoryStats.level3}</div>
                  <div className="text-sm text-gray-600">소분류</div>
                </div>
              </Card>
              <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleLevelFilter(4)}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{categoryStats.level4}</div>
                  <div className="text-sm text-gray-600">세분류</div>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 카테고리 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            카테고리 목록
            {selectedLevel && (
              <Badge variant="outline" className="ml-2">
                <Filter className="h-3 w-3 mr-1" />
                {getLevelName(selectedLevel)}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            등록된 네이버 카테고리 정보를 확인합니다.
            {categoriesData && ` (총 ${categoriesData.totalCount}개)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="카테고리명, ID, 경로로 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1"
              />
              {selectedLevel && (
                <Button
                  variant="outline"
                  onClick={() => handleLevelFilter(null)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  필터 해제
                </Button>
              )}
            </div>
            
            {categoriesLoading ? (
              <div className="text-center py-8">
                <p>로딩 중...</p>
              </div>
            ) : categoriesError ? (
              <div className="text-center py-8">
                <Alert variant="destructive">
                  <AlertDescription>
                    카테고리 목록을 불러오는데 실패했습니다. 새로고침 후 다시 시도해주세요.
                  </AlertDescription>
                </Alert>
              </div>
            ) : categoriesData && categoriesData.categories.length > 0 ? (
              <>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>카테고리 ID</TableHead>
                        <TableHead>카테고리명</TableHead>
                        <TableHead>분류</TableHead>
                        <TableHead>경로</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>등록일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesData.categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-mono text-sm">
                            {category.category_id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {category.category_name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getLevelColor(category.category_level)}>
                              {getLevelName(category.category_level)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-gray-600">
                            {category.category_path || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={category.is_active ? 'default' : 'secondary'}>
                              {category.is_active ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(category.created_at).toLocaleDateString('ko-KR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                {categoriesData.totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, categoriesData.totalPages) }, (_, i) => {
                          let pageNum;
                          if (categoriesData.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= categoriesData.totalPages - 2) {
                            pageNum = categoriesData.totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(Math.min(categoriesData.totalPages, currentPage + 1))}
                            className={currentPage === categoriesData.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                <div className="text-sm text-gray-500 text-center">
                  페이지 {currentPage} / {categoriesData.totalPages} 
                  (총 {categoriesData.totalCount}개 카테고리)
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm || selectedLevel ? '검색 결과가 없습니다.' : '등록된 카테고리가 없습니다.'}
                </p>
                {!searchTerm && !selectedLevel && isAdmin && (
                  <p className="text-sm text-gray-400 mt-2">
                    CSV 파일을 업로드하여 카테고리를 등록해보세요.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryManager;
