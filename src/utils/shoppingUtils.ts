
// 문자열을 해시 코드로 변환 (시드 생성용)
export const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer로 변환
  }
  return Math.abs(hash);
};

// 시드 기반 랜덤 숫자 생성
export const generateSeededRandom = (seed: number, min: number, max: number): number => {
  const x = Math.sin(seed) * 10000;
  const random = x - Math.floor(x);
  return Math.floor(random * (max - min + 1)) + min;
};

// 시드 기반 랜덤 날짜 생성
export const generateSeededDate = (seed: number): string => {
  const start = new Date(2024, 0, 1).getTime();
  const end = new Date().getTime();
  const randomTime = start + (generateSeededRandom(seed, 0, 1000000) / 1000000) * (end - start);
  const randomDate = new Date(randomTime);
  
  return `${randomDate.getFullYear()}-${String(randomDate.getMonth() + 1).padStart(2, '0')}-${String(randomDate.getDate()).padStart(2, '0')} ${String(randomDate.getHours()).padStart(2, '0')}:${String(randomDate.getMinutes()).padStart(2, '0')}:${String(randomDate.getSeconds()).padStart(2, '0')}`;
};

export const formatPrice = (price: string) => {
  return parseInt(price || '0').toLocaleString();
};

export const getCurrentDateTime = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};
