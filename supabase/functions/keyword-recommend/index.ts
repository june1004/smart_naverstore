import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface KeywordRecommendRequest {
  productName: string;
  category?: string;
  categoryPath?: string;
  currentTags?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const body: KeywordRecommendRequest = await req.json();
    const { productName, category, categoryPath, currentTags } = body;

    if (!productName || productName.trim() === '') {
      return new Response(JSON.stringify({ error: '상품명이 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      // Gemini API 키가 없으면 기본 키워드 추출 로직 사용
      const recommendedKeywords = extractKeywordsFromProductName(productName, category, currentTags);
      return new Response(JSON.stringify({ 
        keywords: recommendedKeywords,
        method: 'extraction'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gemini API를 사용한 키워드 추천
    const prompt = `당신은 네이버 쇼핑몰 SEO 전문가입니다. 다음 상품 정보를 바탕으로 검색 최적화에 유리한 타겟 키워드 5개를 추천해주세요.

**상품명**: ${productName}
${category ? `**카테고리**: ${category}` : ''}
${categoryPath ? `**카테고리 경로**: ${categoryPath}` : ''}
${currentTags && currentTags.length > 0 ? `**현재 태그**: ${currentTags.join(', ')}` : ''}

다음 JSON 형식으로 응답해주세요. 반드시 유효한 JSON만 반환하고, 추가 설명은 포함하지 마세요:

{
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"]
}

**요구사항**:
1. 상품명에서 핵심 키워드 추출
2. 카테고리 정보를 활용한 관련 키워드 추가
3. 검색량이 높을 것으로 예상되는 키워드 우선
4. 각 키워드는 2-10자 정도의 자연스러운 검색어
5. 중복되지 않는 다양한 키워드

JSON만 반환하세요.`;

    console.log('키워드 추천 요청:', { productName, category, hasTags: !!currentTags });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
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
          maxOutputTokens: 500,
        }
      }),
    });

    if (!geminiResponse.ok) {
      // Gemini API 실패 시 기본 추출 로직 사용
      console.warn('Gemini API 실패, 기본 추출 로직 사용');
      const recommendedKeywords = extractKeywordsFromProductName(productName, category, currentTags);
      return new Response(JSON.stringify({ 
        keywords: recommendedKeywords,
        method: 'extraction'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!responseText) {
      const recommendedKeywords = extractKeywordsFromProductName(productName, category, currentTags);
      return new Response(JSON.stringify({ 
        keywords: recommendedKeywords,
        method: 'extraction'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // JSON 파싱
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    try {
      const parsed = JSON.parse(cleanedText);
      if (parsed.keywords && Array.isArray(parsed.keywords)) {
        return new Response(JSON.stringify({ 
          keywords: parsed.keywords.slice(0, 5),
          method: 'ai'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
    }

    // 파싱 실패 시 기본 추출 로직 사용
    const recommendedKeywords = extractKeywordsFromProductName(productName, category, currentTags);
    return new Response(JSON.stringify({ 
      keywords: recommendedKeywords,
      method: 'extraction'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('키워드 추천 오류:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: '키워드 추천 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 기본 키워드 추출 함수 (Gemini API 없이 사용)
function extractKeywordsFromProductName(productName: string, category?: string, currentTags?: string[]): string[] {
  const keywords: string[] = [];
  
  // 상품명에서 핵심 단어 추출 (2-10자)
  const words = productName.split(/[\s\-_\/]+/).filter(w => w.length >= 2 && w.length <= 10);
  keywords.push(...words.slice(0, 3));
  
  // 카테고리에서 키워드 추출
  if (category) {
    const categoryWords = category.split(/[>\s]+/).filter(w => w.length >= 2);
    keywords.push(...categoryWords.slice(0, 2));
  }
  
  // 현재 태그에서 키워드 추출
  if (currentTags && currentTags.length > 0) {
    keywords.push(...currentTags.slice(0, 2));
  }
  
  // 중복 제거 및 최대 5개로 제한
  return Array.from(new Set(keywords)).slice(0, 5);
}

