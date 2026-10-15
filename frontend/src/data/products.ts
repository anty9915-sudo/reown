export type Product = {
  id: number;
  title: string;
  category: string;
  price: number;
  location: string;
  time: string;
  image: string;
  likes: number;
  badge?: string;
};

export const products: Product[] = [
  {
    id: 8,
    title: "에어팟 프로 2세대 거의 새것",
    category: "디지털기기",
    price: 185000,
    location: "역삼동",
    time: "12분 전",
    image: "photo-1603351154351-5e2d0600bb77",
    likes: 8,
    badge: "끌올",
  },
  {
    id: 7,
    title: "이케아 원목 협탁 나눔급 가격",
    category: "가구·인테리어",
    price: 25000,
    location: "논현동",
    time: "25분 전",
    image: "photo-1499933374294-4584851497cc",
    likes: 12,
  },
  {
    id: 6,
    title: "나이키 덩크 로우 270 정품",
    category: "패션의류",
    price: 79000,
    location: "삼성동",
    time: "1시간 전",
    image: "photo-1542291026-7eec264c27ff",
    likes: 21,
    badge: "인기",
  },
  {
    id: 5,
    title: "소니 WH-1000XM5 헤드폰",
    category: "디지털기기",
    price: 265000,
    location: "대치동",
    time: "2시간 전",
    image: "photo-1505740420928-5e560c06d30e",
    likes: 6,
  },
  {
    id: 4,
    title: "빈티지 무드 테이블 조명",
    category: "가구·인테리어",
    price: 32000,
    location: "청담동",
    time: "3시간 전",
    image: "photo-1507473885765-e6ed057f782c",
    likes: 17,
  },
  {
    id: 3,
    title: "다이슨 에어랩 컴플리트 롱",
    category: "생활가전",
    price: 390000,
    location: "도곡동",
    time: "4시간 전",
    image: "photo-1522335789203-aabd1fc54bc9",
    likes: 14,
    badge: "가격제안",
  },
  {
    id: 2,
    title: "필름 카메라 올림푸스 뮤",
    category: "취미·게임",
    price: 110000,
    location: "신사동",
    time: "5시간 전",
    image: "photo-1516035069371-29a1b244cc32",
    likes: 9,
  },
  {
    id: 1,
    title: "가죽 숄더백 데일리로 좋아요",
    category: "패션의류",
    price: 45000,
    location: "압구정동",
    time: "6시간 전",
    image: "photo-1548036328-c9fa89d128fa",
    likes: 4,
  },
];
