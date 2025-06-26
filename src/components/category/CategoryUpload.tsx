import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CategoryUploadProps {
  isAdmin: boolean;
}

const CategoryUpload = ({ isAdmin }: CategoryUploadProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFormat, setUploadFormat] = useState<'csv' | 'json'>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CSV/JSON 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ data, filename, format }: { data: any[], filename: string, format: 'csv' | 'json' }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('로그인이 필요합니다.');
      }

      if (!isAdmin) {
        throw new Error('관리자 권한이 필요합니다. (june@nanumlab.com 계정만 가능)');
      }

      const response = await fetch(`https://votlredkpkiafedzkham.supabase.co/functions/v1/upload-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          csvData: data, 
          filename,
          replaceAll: true,
          format
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '업로드 실패');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "업로드 완료",
        description: `성공: ${result.successful}개, 실패: ${result.failed}개`,
      });
      // 모든 카테고리 관련 쿼리 무효화
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

    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isJSON = file.name.toLowerCase().endsWith('.json');
    
    if (!isCSV && !isJSON) {
      toast({
        title: "파일 형식 오류",
        description: "CSV 또는 JSON 파일만 업로드 가능합니다.",
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
    setUploadProgress(10);

    try {
      const text = await file.text();
      let data: any[] = [];

      if (isJSON) {
        try {
          const jsonData = JSON.parse(text);
          data = Array.isArray(jsonData) ? jsonData : [jsonData];
        } catch (jsonError) {
          throw new Error('JSON 파일 형식이 올바르지 않습니다.');
        }
      } else {
        // CSV 처리
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다.');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      }

      setUploadProgress(50);

      if (data.length === 0) {
        throw new Error('파일에 유효한 데이터가 없습니다.');
      }

      // --- 카테고리번호 매핑 검증 추가 ---
      // 업로드 파일에서 모든 카테고리번호 추출
      const categoryNumbers = data.map(row => row['카테고리번호']).filter(Boolean);
      // DB에서 모든 category_id 조회
      const { data: dbCategories, error: dbError } = await supabase
        .from('naver_categories')
        .select('category_id');
      if (dbError) {
        throw new Error('DB에서 카테고리 정보를 불러오지 못했습니다.');
      }
      const dbCategoryIds = dbCategories?.map(cat => cat.category_id) || [];
      // 매핑 안 되는 카테고리번호 찾기
      const notMatched = categoryNumbers.filter(num => !dbCategoryIds.includes(num));
      if (notMatched.length > 0) {
        throw new Error(`DB에 없는 카테고리번호가 있습니다: ${notMatched.slice(0, 5).join(', ')}${notMatched.length > 5 ? ' 외 ' + (notMatched.length - 5) + '건' : ''}`);
      }
      // --- 매핑 검증 끝 ---

      console.log(`파일 처리 완료: ${data.length}개 행`);

      await uploadMutation.mutateAsync({ 
        data, 
        filename: file.name, 
        format: isJSON ? 'json' : 'csv' 
      });
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
    if (uploadFormat === 'json') {
      const jsonTemplate = [
        {
          "카테고리번호": "50000000",
          "대분류": "패션의류",
          "중분류": "",
          "소분류": "",
          "세분류": ""
        },
        {
          "카테고리번호": "50000001",
          "대분류": "패션의류",
          "중분류": "여성의류",
          "소분류": "",
          "세분류": ""
        },
        {
          "카테고리번호": "50000002",
          "대분류": "패션의류",
          "중분류": "여성의류",
          "소분류": "원피스",
          "세분류": ""
        },
        {
          "카테고리번호": "50000003",
          "대분류": "패션의류",
          "중분류": "여성의류",
          "소분류": "원피스",
          "세분류": "미니원피스"
        }
      ];
      
      const blob = new Blob([JSON.stringify(jsonTemplate, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '네이버_카테고리_템플릿.json';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
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
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          카테고리 업로드 ({uploadFormat.toUpperCase()})
          {isAdmin && <Badge variant="secondary" className="ml-2">관리자 전용</Badge>}
        </CardTitle>
        <CardDescription>
          네이버 카테고리 정보를 CSV 또는 JSON 파일로 일괄 업로드합니다. (최대 10MB, 기존 데이터 교체됨)
          {!isAdmin && " - june@nanumlab.com 계정만 업로드 가능"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={uploadFormat} onValueChange={(value: 'csv' | 'json') => setUploadFormat(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Input
            ref={fileInputRef}
            type="file"
            accept={uploadFormat === 'csv' ? '.csv' : '.json'}
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
            {uploadFormat.toUpperCase()} 템플릿
          </Button>
        </div>
        
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-gray-600">
              업로드 중... {uploadProgress.toFixed(0)}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryUpload;
