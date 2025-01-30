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
  requiresShipping: boolean;
  inventoryItem: {
    countryCodeOfOrigin: string | null;
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

export interface LinkedProductGroup {
  metaobjectId: string;
  linkedProductIds: string[];
};

export interface CombinedProduct {
  productData: {
    baseTitle: string;
    title: string;
    vendor: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    productType: string;
    status: string;
    description: string;
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
      size: string;
      color: string;
      productTitle: string;
      title: string;
      price: string;
      compareAtPrice: string | null;
      featuredImage: string;
      sku: string;
      barcode: string | null;
      metafields: Metafield[];
      weight: number | null;
      weightUnit: string | null;
      countryOfOrigin: string | null;
      requiresShipping: boolean;
      taxable: boolean;
      inventoryQuantity: number;
    }[];
  };
}