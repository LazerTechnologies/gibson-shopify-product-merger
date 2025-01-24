export interface MediaImage {
  id: string;
  alt?: string;
  mediaContentType: string;
  image: {
    id: string;
    url: string;
    width: number;
    height: number;
  };
};

export interface Metafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
};

export interface ProductVariant {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  barcode: string | null;
  weight: number;
  weightUnit: string;
  requiresShipping: boolean;
  taxable: boolean;
  metafields: Metafield[];
};

export interface ProductNode {
  id: string;
  title: string;
  vendor: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  productType: string;
  status: string;
  description: string;
  descriptionHtml: string;
  tags: string[];
  metafields: Metafield[];
  seo: {
    title: string;
    description: string;
  };
  media: {
    edges: {
      node: MediaImage;
    }[];
  };
  variants: {
    edges: {
      node: ProductVariant;
    }[];
  };
};

export interface CombinedProduct {
  baseTitle: string;
  variants: {
    size: string;
    originalProduct: ProductNode;
    price: string;
    compareAtPrice: string | null;
    sku: string;
    barcode: string | null;
    vendor: string;
    productType: string;
    tags: string[];
    metafields: Metafield[];
    weight: number;
    weightUnit: string;
    requiresShipping: boolean;
    taxable: boolean;
    inventoryQuantity: number;
  }[];
  vendor: string;
  productType: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  sku: string;
  barcode: string | null;
  tags: string[] | [];
  metafields: Metafield[];
  media: MediaImage[];
  seo: {
    title: string;
    description: string;
  };
};

export interface ShopifyVariant {
  title: string;
  sku?: string;
  price: string;
  compareAtPrice?: string;
  position: number;
  taxable: boolean;
  requiresShipping: boolean;
  barcode?: string;
  weight?: number;
  weightUnit?: "KILOGRAMS" | "GRAMS" | "POUNDS" | "OUNCES";
  inventoryPolicy: "DENY" | "CONTINUE";
  inventoryManagement: "SHOPIFY";
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  metafields?: Metafield[];
};

export interface ShopifyProductInput {
  title: string;
  vendor: string;
  productType: string;
  status: "ACTIVE" | "DRAFT";
  description: string;
  price: string;
  compareAtPrice?: string;
  sku: string;
  barcode?: string;
  metafields?: Metafield[];
  media?: MediaImage[];
  seo?: {
    title: string;
    description: string;
  };
};

export interface ShopifyVariantInput {
  productId: string;
  variants: Array<{
    options: [string]; // Size value
    price: string;
    sku?: string;
    compareAtPrice?: string;
    barcode?: string;
    weight?: number;
    weightUnit?: "KILOGRAMS" | "GRAMS" | "POUNDS" | "OUNCES";
    requiresShipping: boolean;
    taxable: boolean;
    inventoryPolicy: "DENY" | "CONTINUE";
    inventoryManagement: "SHOPIFY";
    metafields?: Metafield[];
  }>;
}

export interface ProductsResponse {
  originalProducts: ProductNode[];
  combinedProducts: CombinedProduct[];
  shopifyProducts: ShopifyProductInput[];
};