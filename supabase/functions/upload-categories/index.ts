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

    // 관리자 권한 체크 - june@nanumlab.com 추가
    const adminEmails = ['admin@example.com', 'junezzang@gmail.com', 'june@nanumlab.com'];
    if (!adminEmails.includes(user.email || '')) {
      throw new Error('Admin privileges required');
    }

    console.log('CSV 배치 업로드 시작:', { filename, rowCount: csvData.length, userEmail: user.email });

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

    // 기존 카테고리 ID 목록을 한 번에 조회하여 중복 체크 최적화
    const existingCategoryIds = new Set();
    const { data: existingCategories } = await supabase
      .from('naver_categories')
      .select('category_id');
    
    if (existingCategories) {
      existingCategories.forEach(cat => existingCategoryIds.add(cat.category_id));
    }

    // 배치 단위로 처리 (메모리 효율성 향상)
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      batches.push(csvData.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const categoriesToInsert = [];
      const categoriesToUpdate = [];

      console.log(`배치 ${batchIndex + 1}/${batches.length} 처리 중...`);

      for (const row of batch) {
        try {
          // 한글 헤더와 영문 헤더 모두 지원
          const categoryId = row['카테고리번호'] || row.category_id || row.categoryId || row['카테고리ID'];
          const largeCat = row['대분류'] || '';
          const mediumCat = row['중분류'] || '';
          const smallCat = row['소분류'] || '';
          const microCat = row['세분류'] || '';
          
          // 카테고리명 구성 (비어있지 않은 분류들을 > 로 연결)
          const categoryParts = [largeCat, mediumCat, smallCat, microCat].filter(part => part.trim() !== '');
          const categoryName = categoryParts[categoryParts.length - 1] || largeCat; // 마지막 분류를 카테고리명으로
          const categoryPath = categoryParts.join(' > ');
          const categoryLevel = categoryParts.length;
          
          // 상위 카테고리 ID 계산
          let parentCategoryId = null;
          if (categoryLevel > 1) {
            parentCategoryId = row['상위카테고리ID'] || row.parent_category_id || null;
          }

          const categoryData = {
            category_id: categoryId,
            category_name: categoryName,
            parent_category_id: parentCategoryId,
            category_level: categoryLevel,
            category_path: categoryPath,
            is_active: true,
            updated_at: new Date().toISOString()
          };

          if (!categoryData.category_id || !categoryData.category_name) {
            throw new Error('필수 필드가 누락되었습니다 (카테고리번호, 카테고리명)');
          }

          // 중복 체크 및 분류
          if (existingCategoryIds.has(categoryId)) {
            categoriesToUpdate.push(categoryData);
          } else {
            categoriesToInsert.push(categoryData);
            existingCategoryIds.add(categoryId); // 현재 배치에서 중복 방지
          }

        } catch (error) {
          failCount++;
          errors.push({
            row: row,
            error: error.message
          });
          console.error('행 처리 오류:', error);
        }
      }

      // 새로운 카테고리 일괄 삽입
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
          console.log(`배치 ${batchIndex + 1}: ${categoriesToInsert.length}개 새로 삽입됨`);
        }
      }

      // 기존 카테고리 일괄 업데이트
      if (categoriesToUpdate.length > 0) {
        for (const categoryData of categoriesToUpdate) {
          const { error: updateError } = await supabase
            .from('naver_categories')
            .update(categoryData)
            .eq('category_id', categoryData.category_id);

          if (updateError) {
            failCount++;
            errors.push({
              category_id: categoryData.category_id,
              operation: 'update',
              error: updateError.message
            });
          } else {
            successCount++;
          }
        }
        console.log(`배치 ${batchIndex + 1}: ${categoriesToUpdate.length}개 업데이트됨`);
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
        error_details: errors.length > 0 ? errors.slice(0, 50) : null // 최대 50개 오류 저장
      })
      .eq('id', uploadRecord.id);

    if (updateError) {
      console.error('업로드 기록 업데이트 오류:', updateError);
    }

    console.log('CSV 배치 업로드 완료:', { 
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
      errors: errors.slice(0, 10), // 응답에는 최대 10개 오류만 포함
      message: `${batches.length}개 배치로 나누어 처리되었습니다.`
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
