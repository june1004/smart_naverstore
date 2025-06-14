
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
    const { csvData, filename, replaceAll = false } = await req.json();
    
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

    // 관리자 권한 체크
    const adminEmails = ['admin@example.com', 'junezzang@gmail.com', 'june@nanumlab.com'];
    if (!adminEmails.includes(user.email || '')) {
      throw new Error('Admin privileges required');
    }

    console.log('CSV 업로드 시작:', { filename, rowCount: csvData.length, userEmail: user.email, replaceAll });

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

    // replaceAll이 true인 경우 기존 데이터 모두 삭제
    if (replaceAll) {
      console.log('기존 카테고리 데이터 삭제 중...');
      const { error: deleteError } = await supabase
        .from('naver_categories')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 데이터 삭제

      if (deleteError) {
        console.error('기존 데이터 삭제 오류:', deleteError);
        throw new Error('기존 데이터 삭제 실패: ' + deleteError.message);
      }
      console.log('기존 카테고리 데이터 삭제 완료');
    }

    // 배치 단위로 처리
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      batches.push(csvData.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const categoriesToInsert = [];

      console.log(`배치 ${batchIndex + 1}/${batches.length} 처리 중...`);

      for (const row of batch) {
        try {
          // 다양한 헤더 형태 지원
          const categoryId = row['카테고리번호'] || row['category_id'] || row['categoryId'] || row['카테고리ID'];
          const largeCat = (row['대분류'] || row['large_category'] || '').trim();
          const mediumCat = (row['중분류'] || row['medium_category'] || '').trim();
          const smallCat = (row['소분류'] || row['small_category'] || '').trim();
          const microCat = (row['세분류'] || row['micro_category'] || '').trim();
          
          // 필수 필드 검증
          if (!categoryId || !largeCat) {
            throw new Error('필수 필드가 누락되었습니다 (카테고리번호, 대분류)');
          }

          // 카테고리 계층 구조 분석
          const categoryParts = [largeCat, mediumCat, smallCat, microCat].filter(part => part !== '');
          const categoryLevel = categoryParts.length;
          const categoryName = categoryParts[categoryParts.length - 1]; // 마지막 분류를 카테고리명으로
          const categoryPath = categoryParts.join(' > ');
          
          // 상위 카테고리 ID 계산 (현재는 단순화)
          let parentCategoryId = null;
          if (categoryLevel > 1) {
            // 상위 카테고리 ID가 있다면 사용, 없다면 null
            parentCategoryId = row['상위카테고리ID'] || row['parent_category_id'] || null;
          }

          const categoryData = {
            category_id: categoryId.toString(),
            category_name: categoryName,
            parent_category_id: parentCategoryId,
            category_level: categoryLevel,
            category_path: categoryPath,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          categoriesToInsert.push(categoryData);

        } catch (error) {
          failCount++;
          errors.push({
            row: row,
            error: error.message,
            rowIndex: batchIndex * BATCH_SIZE + categoriesToInsert.length
          });
          console.error('행 처리 오류:', error);
        }
      }

      // 배치 일괄 삽입
      if (categoriesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('naver_categories')
          .insert(categoriesToInsert);

        if (insertError) {
          console.error('일괄 삽입 오류:', insertError);
          failCount += categoriesToInsert.length;
          errors.push({
            batch: batchIndex + 1,
            operation: 'insert',
            error: insertError.message,
            count: categoriesToInsert.length
          });
        } else {
          successCount += categoriesToInsert.length;
          console.log(`배치 ${batchIndex + 1}: ${categoriesToInsert.length}개 삽입 완료`);
        }
      }

      // 메모리 정리를 위한 작은 지연
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // 업로드 기록 업데이트
    const { error: updateError } = await supabase
      .from('category_uploads')
      .update({
        successful_records: successCount,
        failed_records: failCount,
        upload_status: failCount > 0 ? 'completed_with_errors' : 'completed',
        error_details: errors.length > 0 ? errors.slice(0, 50) : null
      })
      .eq('id', uploadRecord.id);

    if (updateError) {
      console.error('업로드 기록 업데이트 오류:', updateError);
    }

    console.log('CSV 업로드 완료:', { 
      successCount, 
      failCount, 
      totalBatches: batches.length,
      errorCount: errors.length 
    });

    return new Response(JSON.stringify({
      success: true,
      total: csvData.length,
      successful: successCount,
      failed: failCount,
      errors: errors.slice(0, 10),
      message: `${batches.length}개 배치로 처리 완료. ${replaceAll ? '기존 데이터 교체됨.' : ''}`
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
