import {NextResponse} from "next/server";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2024-01/graphql.json`;

// Size patterns to match in titles
const SIZE_PATTERNS = {
  Small: /\b(Small|Sm|S)\b/i,
  Medium: /\b(Medium|Med|M)\b/i,
  Large: /\b(Large|L)\b/i,
  "Extra Large": /\b(Extra Large|XLarge|XL)\b/i,
  "2XL": /\b(2XL|XXL)\b/i,
  "3XL": /\b(3XL|XXXL)\b/i,
};

interface ProductVariant {
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
}

interface ProductNode {
  id: string;
  title: string;
  vendor: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  productType: string;
  status: string;
  variants: {
    edges: {
      node: ProductVariant;
    }[];
  };
}

interface CombinedProduct {
  baseTitle: string;
  variants: {
    size: string;
    originalProduct: ProductNode;
  }[];
  vendor: string;
  productType: string;
}

interface ShopifyProductInput {
  title: string;
  vendor: string;
  productType: string;
  status: "ACTIVE" | "DRAFT";
}

function extractBaseTitle(title: string): string {
  /** Remove size patterns from title **/
  let baseTitle = title;
  Object.entries(SIZE_PATTERNS).forEach(([_, pattern]) => {
    baseTitle = baseTitle.replace(pattern, "");
  });
  /** Clean up any remaining artifacts **/
  return baseTitle.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

function findSize(title: string): string | null {
  for (const [sizeName, pattern] of Object.entries(SIZE_PATTERNS)) {
    if (pattern.test(title)) {
      return sizeName;
    }
  }
  return null;
}

function combineProducts(products: ProductNode[]): {
  combinedProducts: CombinedProduct[];
  shopifyProducts: ShopifyProductInput[];
} {
  const productGroups = new Map<string, CombinedProduct>();

  products.forEach((product) => {
    const size = findSize(product.title);
    if (!size) {
      console.log(`No size found for product: ${product.title}`);
      return;
    }

    const baseTitle = extractBaseTitle(product.title);

    if (!productGroups.has(baseTitle)) {
      productGroups.set(baseTitle, {
        baseTitle,
        variants: [],
        vendor: product.vendor,
        productType: product.productType,
      });
    }

    const group = productGroups.get(baseTitle)!;
    group.variants.push({
      size,
      originalProduct: product,
    });
  });

  // Convert map to array and filter out products with only one variant
  const combinedProducts = Array.from(productGroups.values())
    .filter((group) => group.variants.length > 1)
    .sort((a, b) => a.baseTitle.localeCompare(b.baseTitle));

  // Prepare Shopify-formatted products
  const shopifyProducts = combinedProducts.map(prepareProductForShopify);

  return {
    combinedProducts,
    shopifyProducts,
  };
};

function prepareProductForShopify(
  combined: CombinedProduct
): ShopifyProductInput {
  return {
    title: combined.baseTitle,
    vendor: combined.vendor,
    productType: combined.productType,
    status: "DRAFT",
  };
};

async function getAllProducts() {
  console.log("Starting getAllProducts with GraphQL");

  const query = `
    query GetLifestyleProducts($cursor: String) {
      products(first: 250, query: "vendor:Lifestyle", after: $cursor) {
        edges {
          node {
            id
            title
            vendor
            handle
            createdAt
            updatedAt
            publishedAt
            productType
            status
            variants(first: 1) {
              edges {
                node {
                  id
                  sku
                  price
                  compareAtPrice
                  inventoryQuantity
                  barcode
                  weight
                  weightUnit
                  requiresShipping
                  taxable
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let allProducts: ProductNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      console.log("Fetching products with cursor:", cursor);

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { cursor },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const { data } = await response.json();

      const products = data.products.edges.map((edge: any) => {
        const node = edge.node;
        const variantInfo = node.variants.edges[0]?.node || {};
        return {
          ...node,
          variants: {
            edges: [
              {
                node: {
                  ...variantInfo,
                },
              },
            ],
          },
        };
      });
      allProducts = [...allProducts, ...products];

      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
    } catch (error) {
      console.error("Error in GraphQL fetch:", error);
      throw error;
    }
  }

  console.log("Total Lifestyle products found:", allProducts.length);

  // Combine products with variants
  const { combinedProducts, shopifyProducts } = combineProducts(allProducts);
  console.log("Combined products:", combinedProducts[0]);

  return {
    originalProducts: allProducts,
    combinedProducts: combinedProducts,
    shopifyProducts: shopifyProducts,
  };
}

export async function GET() {
  try {
    console.log("GET request received");
    const products = await getAllProducts();
    console.log("Sending response with products");
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
