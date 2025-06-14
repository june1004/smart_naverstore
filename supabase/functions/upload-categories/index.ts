
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvData, filename } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // JWT에서 사용자 ID 가져오기
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('CSV 업로드 시작:', { filename, rowCount: csvData.length });

    // 업로드 기록 생성
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('category_uploads')
      .insert({
        filename,
        total_records: csvData.length,
        upload_status: 'processing',
        uploaded_by: user.id
      })
      .select()
      .single();

    if (uploadError) {
      console.error('업로드 기록 생성 오류:', uploadError);
      throw uploadError;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    // CSV 데이터 처리
    for (const row of csvData) {
      try {
        const categoryData = {
          category_id: row.category_id || row.categoryId || row['카테고리ID'],
          category_name: row.category_name || row.categoryName || row['카테고리명'],
          parent_category_id: row.parent_category_id || row.parentCategoryId || row['상위카테고리ID'] || null,
          category_level: parseInt(row.category_level || row.categoryLevel || row['카테고리레벨'] || '1'),
          category_path: row.category_path || row.categoryPath || row['카테고리경로'] || null,
          is_active: row.is_active !== false && row.isActive !== false && row['활성여부'] !== false
        };

        if (!categoryData.category_id || !categoryData.category_name) {
          throw new Error('필수 필드가 누락되었습니다 (category_id, category_name)');
        }

        // upsert 방식으로 카테고리 저장
        const { error: insertError } = await supabase
          .from('naver_categories')
          .upsert(categoryData, { 
            onConflict: 'category_id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          throw insertError;
        }

        successCount++;
      } catch (error) {
        failCount++;
        errors.push({
          row: row,
          error: error.message
        });
        console.error('행 처리 오류:', error);
      }
    }

    // 업로드 기록 업데이트
    const { error: updateError } = await supabase
      .from('category_uploads')
      .update({
        successful_records: successCount,
        failed_records: failCount,
        upload_status: failCount > 0 ? 'completed_with_errors' : 'completed',
        error_details: errors.length > 0 ? errors : null
      })
      .eq('id', uploadRecord.id);

    if (updateError) {
      console.error('업로드 기록 업데이트 오류:', updateError);
    }

    console.log('CSV 업로드 완료:', { successCount, failCount });

    return new Response(JSON.stringify({
      success: true,
      total: csvData.length,
      successful: successCount,
      failed: failCount,
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CSV 업로드 오류:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'CSV 업로드 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
