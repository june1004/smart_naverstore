import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface SEORecommendationRequest {
  keyword: string;
  currentProductName?: string;
  currentDetailContent?: string;
  currentTags?: string[];
  category?: string;
  competitorAnalysis?: any;
}

interface SEORecommendation {
  recommended_name: string;
  recommended_tags: string[];
  modified_html: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const body: SEORecommendationRequest = await req.json();
    const { keyword, currentProductName, currentDetailContent, currentTags, category, competitorAnalysis } = body;

    if (!keyword) {
      return new Response(JSON.stringify({ error: '키워드가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ 
        error: 'Gemini API 키가 설정되지 않았습니다. Supabase Secrets에 GEMINI_API_KEY를 설정해주세요.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gemini API 프롬프트 구성
    const prompt = `당신은 네이버 스마트스토어 SEO 최적화 전문가입니다. 다음 정보를 바탕으로 상품 정보를 최적화해주세요.

**타겟 키워드**: ${keyword}
${currentProductName ? `**현재 상품명**: ${currentProductName}` : ''}
${category ? `**카테고리**: ${category}` : ''}
${currentTags ? `**현재 태그**: ${currentTags.join(', ')}` : ''}
${competitorAnalysis ? `**경쟁사 분석 데이터**: ${JSON.stringify(competitorAnalysis)}` : ''}

다음 JSON 형식으로 응답해주세요. 반드시 유효한 JSON만 반환하고, 추가 설명은 포함하지 마세요:

{
  "recommended_name": "SEO 최적화된 상품명 (키워드를 자연스럽게 포함, 50자 이내)",
  "recommended_tags": ["태그1", "태그2", "태그3", "태그4", "태그5", "태그6", "태그7", "태그8", "태그9", "태그10"],
  "modified_html": "기존 상세페이지 HTML에 키워드를 자연스럽게 녹여낸 수정된 HTML (iframe, script 태그 제외, 최대 5000자)"
}

**요구사항**:
1. recommended_name: 타겟 키워드를 포함하되 자연스럽게, 검색 최적화에 유리한 형태
2. recommended_tags: 검색에 유리한 태그 최대 10개 (키워드 관련, 카테고리 관련, 특성 관련)
3. modified_html: 기존 HTML 구조를 유지하면서 키워드를 자연스럽게 삽입 (iframe, script 태그는 제거)
${currentDetailContent ? `\n**기존 상세페이지 내용**:\n${currentDetailContent.substring(0, 2000)}` : ''}

JSON만 반환하세요.`;

    console.log('Gemini API 요청 시작:', { keyword, hasCurrentContent: !!currentDetailContent });

    // Gemini API 호출 (gemini-pro 모델 사용)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API 오류:', geminiResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `Gemini API 오류: ${geminiResponse.status}`,
        details: errorText
      }), {
        status: geminiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini API 응답:', geminiData);

    // Gemini 응답에서 텍스트 추출
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!responseText) {
      return new Response(JSON.stringify({ 
        error: 'Gemini API에서 응답을 받지 못했습니다.',
        details: geminiData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // JSON 파싱 (마크다운 코드 블록 제거)
    let cleanedText = responseText.trim();
    // ```json 또는 ```로 감싸진 경우 제거
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    let recommendation: SEORecommendation;
    try {
      recommendation = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError, '원본 텍스트:', cleanedText);
      return new Response(JSON.stringify({ 
        error: 'Gemini 응답을 파싱할 수 없습니다.',
        details: cleanedText.substring(0, 500),
        rawResponse: responseText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 응답 검증
    if (!recommendation.recommended_name || !Array.isArray(recommendation.recommended_tags) || !recommendation.modified_html) {
      return new Response(JSON.stringify({ 
        error: 'Gemini 응답 형식이 올바르지 않습니다.',
        details: recommendation
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 태그 개수 제한 (최대 10개)
    recommendation.recommended_tags = recommendation.recommended_tags.slice(0, 10);

    return new Response(JSON.stringify(recommendation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SEO 추천 생성 오류:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'SEO 추천 생성 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

