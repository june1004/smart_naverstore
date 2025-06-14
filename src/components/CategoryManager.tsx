
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, Search, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 카테고리 목록 조회
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['naver-categories', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('naver_categories')
        .select('*')
        .order('category_level', { ascending: true })
        .order('category_name', { ascending: true });

      if (searchTerm) {
        query = query.or(`category_name.ilike.%${searchTerm}%,category_id.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Category[];
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

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ csvData, filename }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'CSV 업로드에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "CSV 업로드 완료",
        description: `성공: ${result.successful}개, 실패: ${result.failed}개`,
      });
      queryClient.invalidateQueries({ queryKey: ['naver-categories'] });
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

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "파일 형식 오류",
        description: "CSV 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다.');
      }

      setUploadProgress(30);

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const csvData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setUploadProgress(50);

      await uploadMutation.mutateAsync({ csvData, filename: file.name });
      
      setUploadProgress(100);
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

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = "category_id,category_name,parent_category_id,category_level,category_path,is_active\n" +
                      "50000000,패션의류,,1,패션의류,true\n" +
                      "50000001,여성의류,50000000,2,패션의류>여성의류,true\n" +
                      "50000002,원피스,50000001,3,패션의류>여성의류>원피스,true";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naver_categories_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* CSV 업로드 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            카테고리 CSV 업로드
          </CardTitle>
          <CardDescription>
            네이버 카테고리 정보를 CSV 파일로 일괄 업로드합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
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
              <p className="text-sm text-gray-600">업로드 중... {uploadProgress}%</p>
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

      {/* 카테고리 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            카테고리 목록
          </CardTitle>
          <CardDescription>
            등록된 네이버 카테고리 정보를 확인합니다.
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
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>카테고리 ID</TableHead>
                    <TableHead>카테고리명</TableHead>
                    <TableHead>레벨</TableHead>
                    <TableHead>상위 카테고리</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>등록일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono">{category.category_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {'  '.repeat(category.category_level - 1)}
                          {category.category_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Level {category.category_level}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {category.parent_category_id || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? 'default' : 'secondary'}>
                          {category.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(category.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {categories && categories.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                {searchTerm ? '검색 결과가 없습니다.' : '등록된 카테고리가 없습니다.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryManager;
