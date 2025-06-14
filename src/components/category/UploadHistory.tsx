
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UploadRecord {
  id: string;
  filename: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  upload_status: string;
  created_at: string;
}

const UploadHistory = () => {
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

  if (!uploadHistory || uploadHistory.length === 0) {
    return null;
  }

  return (
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
  );
};

export default UploadHistory;
