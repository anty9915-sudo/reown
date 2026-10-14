export type Id = string;

export type ProductStatus = 'ON_SALE' | 'RESERVED' | 'SOLD';
export type ProductSort =
  | 'latest'
  | 'oldest'
  | 'priceAsc'
  | 'priceDesc'
  | 'views';
export type TransactionStatus = 'RESERVED' | 'COMPLETED' | 'CANCELED';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupInput extends AuthCredentials {
  nickname: string;
}

export interface ProductListQuery {
  keyword?: string;
  categoryId?: string;
  regionId?: string;
  status?: ProductStatus;
  minPrice?: string;
  maxPrice?: string;
  sort?: ProductSort;
  limit?: string;
  cursor?: string;
}

export interface UpdateProductInput {
  categoryId?: string;
  title?: string;
  description?: string;
  price?: number;
}

export interface FavoriteListQuery {
  limit?: string;
  cursor?: string;
}

export interface RegionListQuery {
  keyword: string;
  limit?: string;
}

export interface CreateTransactionInput {
  chatRoomId: string;
  status: 'RESERVED' | 'COMPLETED';
}

export interface UpdateTransactionInput {
  status: 'COMPLETED' | 'CANCELED';
}

// PostgreSQL 드라이버에서 돌아오는 행은 SQL마다 모양이 다르므로 DB 경계에서만 사용한다.
export type DatabaseRow = Record<string, any>;

export interface FavoriteCursor {
  favoritedAt: string;
  productId: string;
}

export interface ProductCursor {
  sort: ProductSort;
  value: string | number;
  id: string;
}
