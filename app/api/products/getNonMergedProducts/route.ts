import {NextResponse} from "next/server";

/** Types **/
import type {ProductNode, NewCombinedProduct} from "@/lib/types/ShopifyData";

/** Queries **/
import {queryGetAllNonMergedMerchProducts} from "@/queries";

/** Constants **/
import {SIZE_PATTERNS} from "@/app/constants";

const getAllNonMergedMerchProducts = async (
  accessToken: string,
  graphQLEndpoint: string,
) => {
  try {
    let hasNextPage = true;
    let endCursor = null;
    let products: ProductNode[] = [];

    while (hasNextPage) {
      const query = queryGetAllNonMergedMerchProducts(endCursor);
      
      const response = await fetch(graphQLEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken ?? '',
        },
        body: JSON.stringify({query})
      });

      if (!response?.ok) {
        throw new Error(`Shopify API responded with status: ${response?.status}`);
      }

      const data = await response.json();
      
      if (data?.errors) {
        const errorMessages = data?.errors?.map((error: {message: string}) => error.message).join(", ");
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }

      const fetchedProducts = data?.data?.products?.edges?.map((edge: {node: ProductNode}) => edge.node) ?? [];
      products = [...products, ...fetchedProducts];

      hasNextPage = data?.data?.products?.pageInfo?.hasNextPage ?? false;
      endCursor = data?.data?.products?.pageInfo?.endCursor ?? null;
    }

    return products;
  } catch (error) {
    console.error("Error fetching non-merged products:", error);
    return [];
  }
};

/** Extract base title from product title **/
const extractBaseTitle = (title: string): string => {
  /** Remove size patterns from title **/
  let baseTitle = title;
  Object.entries(SIZE_PATTERNS).forEach(([, pattern]) => {
    baseTitle = baseTitle.replace(pattern, "");
  });
  /** Clean up any remaining artifacts **/
  return baseTitle.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
};

/** Find size from product title **/
const findSize = (title: string): string | null => {
  for (const [sizeName, pattern] of Object.entries(SIZE_PATTERNS)) {
    if (pattern?.test(title)) {
      return sizeName;
    }
  }
  return null;
};

/** Combine products into product groups **/
const combineProducts = (products: ProductNode[]): {
  productGroups: NewCombinedProduct[];
  productsNotInGroups: ProductNode[];
} => {
  const productGroups = new Map<string, NewCombinedProduct>();
  const productsInGroups = new Set<string>();

  products?.forEach((product) => {
    const size = findSize(product?.title ?? "");
    if (!size) {
      console.log(`No size found for product: ${product?.title}`);
      return;
    }

    const baseTitle = extractBaseTitle(product?.title ?? "");

    if (!productGroups.has(baseTitle)) {
      productGroups.set(baseTitle, {
        baseTitle,
        variants: [],
        vendor: product?.vendor ?? "",
        productType: product?.productType ?? "",
      });
    }

    const group = productGroups.get(baseTitle);
    group?.variants.push({
      size,
      originalProduct: product,
    });
    
    productsInGroups.add(product.id);
  });

  /** Get products not in any group */
  const productsNotInGroups = products.filter(product => !productsInGroups.has(product.id));

  /** Convert map to array and filter out products with only one variant **/
  const validProductGroups = Array.from(productGroups.values())
    .filter((group) => (group?.variants?.length ?? 0) > 1)
    .sort((a, b) => a?.baseTitle?.localeCompare(b?.baseTitle));

  return {
    productGroups: validProductGroups,
    productsNotInGroups: productsNotInGroups,
  };
};

export async function GET() {
  const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;

  try {
    /** Fetch all non-merged products **/
    const allProducts = await getAllNonMergedMerchProducts(
      ACCESS_TOKEN || '',
      GRAPHQL_ENDPOINT,
    );

    /** Combine products into product groups **/
    const {productGroups, productsNotInGroups} = combineProducts(allProducts);

    /** Calculate total variants across all combined products */
    const totalVariantsInGroups = productGroups.reduce((total, group) => (
      total + group.variants.length
    ), 0);

    return NextResponse.json({
      products: allProducts,
      count: allProducts?.length ?? 0,
      productGroups: productGroups,
      groupCount: productGroups?.length ?? 0,
      productsNotInGroups: productsNotInGroups,
      missingProductsCount: productsNotInGroups?.length ?? 0,
      stats: {
        totalProducts: allProducts?.length ?? 0,
        totalProductsInGroups: totalVariantsInGroups,
        totalProductGroups: productGroups?.length ?? 0,
        totalProductsNotInGroups: productsNotInGroups?.length ?? 0
      }
    });
  } catch (error) {
    console.error("Error processing non-merged products:", error);
    return NextResponse.json({
      error: "Failed to process non-merged products"
    }, {status: 500});
  }
}