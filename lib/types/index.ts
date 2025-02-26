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
  requiresShipping: boolean;
  inventoryItem: {
    countryCodeOfOrigin: string | null;
    harmonizedSystemCode: string | null;
  } | null;
  measurement: {
    weight: {
      value: number;
      unit: string;
    }
  } | null;
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
  featuredMedia: {
    id: string;
    preview: {
      image: {
        url: string;
        altText: string;
      };
    };
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

export interface ProductVariantInfo {
  id: string;
  title: string;
  size: string;
  color: string;
  sku: string | null;
  price: string | null;
  compareAtPrice: string | null;
  inventoryQuantity: number | null;
  barcode: string | null;
  requiresShipping: boolean | null;
  taxable: boolean | null;
  weight: number | null;
  weightUnit: string | null;
  image: string | null;
  metafields: Metafield[];
};

export interface ProductOption {
  name: string;
  values: string[];
};

export interface MergeProduct {
  id: string;
  title: string;
  originalTitle: string;
  vendor: string;
  productType: string;
  description: string;
  options: ProductOption[];
  variants: ProductVariantInfo[];
  metafields: Metafield[];
  media: {
    edges: {
      node: MediaImage;
    }[];
  };
  featuredMedia: {
    id: string;
    alt?: string;
    preview: {
      image: {
        url: string;
        altText?: string;
      };
    };
  } | null;
};

export interface GetMergeProductsResponse {
  products: MergeProduct[];
  originalProducts: ProductNode[];
  count: number;
};