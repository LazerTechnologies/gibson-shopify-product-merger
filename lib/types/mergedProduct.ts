export interface MediaImage {
  id: string;
  mediaContentType: string;
  image: {
    id: string;
    url: string;
    width: number;
    height: number;
  };
  alt: string;
};

export interface MetafieldReference {
  id: string;
  type: string;
  fields: {
    key: string;
    value: string;
    type: string;
  }[];
};

export interface Metafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
  reference?: MetafieldReference;
};

export interface InventoryItem {
  countryCodeOfOrigin: string;
  harmonizedSystemCode: string;
  measurement: {
    weight: {
      value: number;
    };
  };
};

export interface Variant {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  barcode: string | null;
  taxable: boolean;
  inventoryItem: InventoryItem;
  metafields: {
    nodes: Metafield[];
  };
};

export interface MergedVariant extends Omit<Variant, 'metafields'> {
  metafields: Metafield[];
};

export interface ShopifyProduct {
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
  seo: {
    title: string;
    description: string;
  };
  featuredMedia: {
    id: string;
    alt: string;
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
  metafields: {
    nodes: Metafield[];
  };
  variants: {
    edges: {
      node: Variant;
    }[];
  };
};

export interface MergedShopifyProduct extends Omit<ShopifyProduct, 'metafields' | 'variants'> {
  metafields: Metafield[];
  variants: {
    edges: {
      node: MergedVariant;
    }[];
  };
};

export interface ProductBySkuResponse {
  data: {
    products: {
      edges: ProductBySkuProduct[];
    };
  };
};

export interface ProductBySkuProduct {
  node: {
    id: string;
    title: string;
    description: string;
    descriptionHtml: string;
    productType: string;
    vendor: string;
    seo: {
      title: string;
      description: string;
    };
    variants: {
      edges: ProductBySkuVariant[];
    };
  };
};

export interface ProductBySkuVariant {
  node: {
    id: string;
    metafields: {
      nodes: Array<{
        namespace: string;
        key: string;
        value: string;
        type: string;
      }>;
    };
  };
};