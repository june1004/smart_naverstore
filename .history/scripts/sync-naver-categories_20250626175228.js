// 네이버 카테고리 팝업에서 카테고리 트리 구조를 파싱하고 Supabase에 업서트하는 기본 스크립트
// (실제 파싱 로직은 네이버 페이지 구조에 맞게 추가 구현 필요)

const axios = require('axios');
const cheerio = require('cheerio');

// TODO: 아래 환경변수는 GitHub Actions에서 주입
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

async function fetchCategories() {
  const url = 'https://adcenter.shopping.naver.com/common/suggest/popup_category.nhn?cmcReadOnly=true&cmcCatTpCd=C01001&cmcNeedCatTpSelect=false&cmcCallBackFunction=setsrchCatNmFromPopupFoloder&cmcDoClose=true&cmcAvailCatLvl=&cmcAvailCatMinLvl=&cmcAvailCatMaxLvl=&cmcAvailLastLvlYn=&cmcExceptCatIdSet=&cmcShowOldCatYn=&cmcAvailCatLvlLastLvlY=';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  // TODO: 카테고리 트리 파싱 로직 구현 필요
  // 예시: [{category_id, category_name, category_path, ...}, ...] 형태로 반환
  return [];
}

async function syncToSupabase(categories) {
  if (!SUPABASE_URL || !SUPABASE_API_KEY) {
    throw new Error('Supabase 환경변수 누락');
  }
  // TODO: Supabase REST API로 upsert 구현
  // 예시: fetch(`${SUPABASE_URL}/rest/v1/naver_categories`, ...)
}

(async () => {
  const categories = await fetchCategories();
  await syncToSupabase(categories);
})(); 