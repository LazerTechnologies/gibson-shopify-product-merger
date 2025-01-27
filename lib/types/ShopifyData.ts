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
}

export interface Metafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
  reference?: {
    id: string;
    type: string;
    fields: {
      key: string;
      value: string;
      type: string;
    }[];
  };
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

export interface LinkedProductGroup {
  metaobjectId: string;
  linkedProductIds: string[];
};

export interface CombinedProduct {
  productData: {
    baseTitle: string;
    vendor: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    productType: string;
    status: string;
    description: string;
    tags: string[];
    metafields: any[];
    seo: {
      title: string;
      description: string;
    };
    media: any;
    variants: {
      size: string;
      price: string;
      compareAtPrice: string | null;
      sku: string;
      barcode: string | null;
      metafields: any[];
      weight: number;
      weightUnit: string;
      requiresShipping: boolean;
      taxable: boolean;
      inventoryQuantity: number;
    }[];
  };
}