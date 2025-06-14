import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, Search, Database, Shield, ChevronRight, ChevronDown } from "lucide-react";
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

interface CategorizedData {
  large: Category[];
  medium: Category[];
  small: Category[];
  micro: Category[];
}

const CategoryManager = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 관리자 권한 확인 (june@nanumlab.com만 허용)
  const isAdmin = user?.email === 'june@nanumlab.com';

  // 관리자 권한 확인
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      // 관리자 권한 체크 (예: 특정 이메일이나 role 필드로 체크)
      const adminEmails = ['admin@example.com', 'junezzang@gmail.com']; // 관리자 이메일 목록
      const isUserAdmin = adminEmails.includes(user.email || '');
      setIsAdmin(isUserAdmin);
      
      return data;
    },
  });

  // 카테고리 목록 조회 (계층구조로 정리)
  const { data: categorizedData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['naver-categories-categorized', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('naver_categories')
        .select('*')
        .order('category_level', { ascending: true })
        .order('category_name', { ascending: true });

      if (searchTerm) {
        query = query.or(`category_name.ilike.%${searchTerm}%,category_id.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      // 카테고리를 레벨별로 분류
      const categorized: CategorizedData = {
        large: data?.filter(cat => cat.category_level === 1) || [],
        medium: data?.filter(cat => cat.category_level === 2) || [],
        small: data?.filter(cat => cat.category_level === 3) || [],
        micro: data?.filter(cat => cat.category_level === 4) || [],
      };

      return categorized;
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

  // 개선된 CSV 업로드 mutation (배치 처리 및 관리자 권한 체크)
  const uploadMutation = useMutation({
    mutationFn: async ({ csvData, filename }: { csvData: any[], filename: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('로그인이 필요합니다.');
      }

      // 관리자 권한 체크
      if (!isAdmin) {
        throw new Error('관리자 권한이 필요합니다. (june@nanumlab.com 계정만 가능)');
      }

      // 대용량 파일을 작은 배치로 나누어 처리
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
        errors: allErrors.slice(0, 20) // 최대 20개 오류만 반환
      };
    },
    onSuccess: (result) => {
      toast({
        title: "CSV 업로드 완료",
        description: `성공: ${result.successful}개, 실패: ${result.failed}개`,
      });
      queryClient.invalidateQueries({ queryKey: ['naver-categories-categorized'] });
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

    // 파일 크기 체크 (10MB 제한)
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

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryTree = (categories: Category[], level: number = 0) => {
    return categories.map((category) => {
      const hasChildren = categorizedData && level < 3;
      const children = hasChildren ? 
        (level === 0 ? categorizedData.medium.filter(c => c.parent_category_id === category.category_id) :
         level === 1 ? categorizedData.small.filter(c => c.parent_category_id === category.category_id) :
         categorizedData.micro.filter(c => c.parent_category_id === category.category_id)) : [];
      
      const isExpanded = expandedCategories.has(category.category_id);

      return (
        <div key={category.id} className="border-l-2 border-gray-200 ml-4">
          <div className="flex items-center p-2 hover:bg-gray-50">
            {hasChildren && children.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-2"
                onClick={() => toggleCategory(category.category_id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-500">{category.category_id}</span>
                <span className="font-medium">{category.category_name}</span>
                <Badge variant="outline" className="text-xs">
                  {level === 0 ? '대분류' : level === 1 ? '중분류' : level === 2 ? '소분류' : '세분류'}
                </Badge>
                <Badge variant={category.is_active ? 'default' : 'secondary'} className="text-xs">
                  {category.is_active ? '활성' : '비활성'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                등록일: {new Date(category.created_at).toLocaleDateString('ko-KR')}
              </div>
            </div>
          </div>
          {isExpanded && children.length > 0 && (
            <div className="ml-4">
              {renderCategoryTree(children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

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

      {/* 카테고리 목록 (계층구조) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            카테고리 목록 (계층구조)
          </CardTitle>
          <CardDescription>
            등록된 네이버 카테고리 정보를 대/중/소/세분류 구조로 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="카테고리명 또는 ID로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            
            {categoriesLoading ? (
              <p>로딩 중...</p>
            ) : categorizedData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <Card className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{categorizedData.large.length}</div>
                      <div className="text-sm text-gray-600">대분류</div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{categorizedData.medium.length}</div>
                      <div className="text-sm text-gray-600">중분류</div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{categorizedData.small.length}</div>
                      <div className="text-sm text-gray-600">소분류</div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{categorizedData.micro.length}</div>
                      <div className="text-sm text-gray-600">세분류</div>
                    </div>
                  </Card>
                </div>

                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {categorizedData.large.length > 0 ? (
                    renderCategoryTree(categorizedData.large, 0)
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      {searchTerm ? '검색 결과가 없습니다.' : '등록된 카테고리가 없습니다.'}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">데이터를 불러오는 중...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryManager;
