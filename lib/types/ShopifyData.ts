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
    featuredMedia?: {
      id: string;
      preview: {
        image: {
          url: string;
          altText: string;
        };
      };
    };
    variants: {
      size: string;
      color: string;
      productTitle: string;
      title: string;
      price: string;
      compareAtPrice: string | null;
      featuredImage: string | null;
      sku: string;
      barcode: string | null;
      metafields: Metafield[];
      weight: number | null;
      weightUnit: string | null;
      countryOfOrigin: string | null;
      harmonizedSystemCode: string | null;
      requiresShipping: boolean;
      taxable: boolean;
      inventoryQuantity: number;
    }[];
  };
};

export interface ProductOption {
  name: string;
  values: string[];
  id: string;
  optionValues: Array<{
    name: string;
  }>;
};

export interface ProductCreateResponse {
  data: {
    productCreate: {
      product: {
        id: string;
        options: ProductOption[];
        media: {
          edges: {
            node: {
              id: string;
              preview: {
                image: {
                  url: string;
                }
              }
            }
          }[]
        };
        metafields: {
          edges: {
            node: {
              id: string;
              namespace: string;
              key: string;
              value: string;
            }
          }[]
        };
        variants: {
          nodes: {
            id: string;
            position: number;
            title: string;
          }[]
        };
      };
      userErrors: {
        message: string;
        field: string[];
      }[];
    };
  };
};

export interface VariantCreateResponse {
  data: {
    productVariantsBulkCreate: {
      productVariants: {
        id: string;
        title: string;
      }[];
      userErrors: {
        message: string;
        field: string[];
      }[];
    };
  };
};