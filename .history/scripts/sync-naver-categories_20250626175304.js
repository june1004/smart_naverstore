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
  // 예시: 카테고리 트리 파싱 (실제 구조에 맞게 조정 필요)
  const categories = [];
  // 예시: 대분류 ul > li 구조라고 가정
  $('ul.cate_list > li').each((i, el) => {
    const large = $(el).find('> a').text().trim();
    const largeId = $(el).find('> a').attr('data-cateid');
    // 중분류
    $(el).find('ul > li').each((j, el2) => {
      const medium = $(el2).find('> a').text().trim();
      const mediumId = $(el2).find('> a').attr('data-cateid');
      // 소분류
      $(el2).find('ul > li').each((k, el3) => {
        const small = $(el3).find('> a').text().trim();
        const smallId = $(el3).find('> a').attr('data-cateid');
        // 세분류
        $(el3).find('ul > li').each((l, el4) => {
          const smallest = $(el4).find('> a').text().trim();
          const smallestId = $(el4).find('> a').attr('data-cateid');
          categories.push({
            category_id: smallestId,
            category_name: smallest,
            category_path: `${large} > ${medium} > ${small} > ${smallest}`,
            large_category: large,
            medium_category: medium,
            small_category: small,
            smallest_category: smallest,
            category_level: 4
          });
        });
        // 소분류만 있는 경우
        if ($(el3).find('ul > li').length === 0) {
          categories.push({
            category_id: smallId,
            category_name: small,
            category_path: `${large} > ${medium} > ${small}`,
            large_category: large,
            medium_category: medium,
            small_category: small,
            smallest_category: '',
            category_level: 3
          });
        }
      });
      // 중분류만 있는 경우
      if ($(el2).find('ul > li').length === 0) {
        categories.push({
          category_id: mediumId,
          category_name: medium,
          category_path: `${large} > ${medium}`,
          large_category: large,
          medium_category: medium,
          small_category: '',
          smallest_category: '',
          category_level: 2
        });
      }
    });
    // 대분류만 있는 경우
    if ($(el).find('ul > li').length === 0) {
      categories.push({
        category_id: largeId,
        category_name: large,
        category_path: `${large}`,
        large_category: large,
        medium_category: '',
        small_category: '',
        smallest_category: '',
        category_level: 1
      });
    }
  });
  return categories;
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