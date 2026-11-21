import type { Product } from "../data/products";

export const LOCAL_PRODUCTS_KEY = "reown-local-products";

export function getLocalProducts(): Product[] {
  try {
    const stored = window.localStorage.getItem(LOCAL_PRODUCTS_KEY);
    return stored ? (JSON.parse(stored) as Product[]) : [];
  } catch {
    return [];
  }
}

export function addLocalProduct(product: Product): void {
  const products = getLocalProducts();
  window.localStorage.setItem(
    LOCAL_PRODUCTS_KEY,
    JSON.stringify([product, ...products]),
  );
}

export function getAllProducts(products: Product[]): Product[] {
  return [
    ...getLocalProducts().filter((product) => !product.deletedAt),
    ...products,
  ];
}

export function updateLocalProduct(
  productId: number,
  update: Partial<Pick<Product, "soldOut" | "deletedAt">>,
): void {
  const products = getLocalProducts();
  window.localStorage.setItem(
    LOCAL_PRODUCTS_KEY,
    JSON.stringify(
      products.map((product) =>
        product.id === productId ? { ...product, ...update } : product,
      ),
    ),
  );
}

export function deleteLocalProduct(productId: number): void {
  const products = getLocalProducts();
  window.localStorage.setItem(
    LOCAL_PRODUCTS_KEY,
    JSON.stringify(products.filter((product) => product.id !== productId)),
  );
}
