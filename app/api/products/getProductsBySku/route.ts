import {NextResponse} from "next/server";

/** Types **/
import type {ProductNode} from "@/lib/types/ShopifyData";

/** Queries **/
import {queryShopifyProductBySku} from "@/queries";

/** Constants **/
import {SIZE_PATTERNS, TITLE_COLOR_PATTERNS, SKU_COLOR_PATTERNS} from "@/app/constants";

/** Extended ProductNode with processed information */
interface ProcessedProductNode extends ProductNode {
  processedInfo: {
    cleanedTitle: string;
    size: string;
    color: string;
    variantInfo: {
      price: string | null;
      compareAtPrice: string | null;
      sku: string | null;
      barcode: string | null;
      inventoryQuantity: number | null;
      weight: number | null;
      weightUnit: string | null;
      requiresShipping: boolean | null;
      taxable: boolean | null;
    }
  }
}

/** Process title and extract size/color helper function **/
const processProductInfo = (product: ProductNode): {
  cleanedTitle: string;
  size: string;
  color: string;
  variant: ProductNode["variants"]["edges"][0]["node"];
} => {
  const variant = product.variants.edges[0]?.node;
  const sku = variant?.sku || '';
  const title = product.title;
  
  let foundSize = '';
  let foundColor = '';

  /** Find size match **/
  for (const [size, pattern] of Object.entries(SIZE_PATTERNS)) {
    if (pattern.test(title)) {
      foundSize = size;
      break;
    }
  }

  /** Find color match from title first **/
  for (const [color, pattern] of Object.entries(TITLE_COLOR_PATTERNS)) {
    if (pattern.test(title)) {
      foundColor = color;
      break;
    }
  }

  /** If no color found in title, check SKU **/
  if (!foundColor && sku) {
    for (const [color, pattern] of Object.entries(SKU_COLOR_PATTERNS)) {
      if (pattern.test(sku)) {
        foundColor = color;
        break;
      }
    }
  }

  /** Clean title (remove size and color mentions) **/
  let cleanedTitle = title;
  if (foundSize) {
    cleanedTitle = cleanedTitle.replace(SIZE_PATTERNS[foundSize as keyof typeof SIZE_PATTERNS], '');
  }
  if (foundColor) {
    const colorPattern = TITLE_COLOR_PATTERNS[foundColor as keyof typeof TITLE_COLOR_PATTERNS];
    if (colorPattern) {
      cleanedTitle = cleanedTitle.replace(colorPattern, '');
    }
  }

  /** Final cleanup **/
  cleanedTitle = cleanedTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanedTitle,
    size: foundSize,
    color: foundColor,
    variant
  };
};

export async function POST(request: Request) {
  const {skus} = await request.json();

  if (!skus || !Array.isArray(skus) || skus.length === 0) {
    return NextResponse.json({
      error: "Invalid or empty skus array",
    }, {status: 400});
  };

  const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;

  try {
    const productsData = await Promise.all(skus.map(async (sku: string) => {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryShopifyProductBySku(sku),
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product with SKU ${sku}: ${response.statusText}`);
      }

      const data = await response.json();
      
      /** Find the exact product that matches the SKU **/
      const matchingProducts = data.data.products.edges
        .map((edge: { node: ProductNode }) => edge.node)
        .filter((product: ProductNode) => {
          /** Check if any variant has the exact matching SKU **/
          return product.variants.edges.some(
            (variantEdge) => variantEdge.node.sku === sku
          );
        });

      return matchingProducts.length > 0 ? matchingProducts[0] : null;
    }));

    /** Filter out any null values (SKUs that weren't found) **/
    const validProducts = productsData.filter(product => product !== null);
    
    /** Process products to extract variant information **/
    const processedProducts = validProducts.map(product => {
      const {cleanedTitle, size, color, variant} = processProductInfo(product as ProductNode);
      
      return {
        ...product as ProductNode,
        processedInfo: {
          cleanedTitle,
          size,
          color,
          variantInfo: {
            price: variant?.price,
            compareAtPrice: variant?.compareAtPrice,
            sku: variant?.sku,
            barcode: variant?.barcode,
            inventoryQuantity: variant?.inventoryQuantity,
            weight: variant?.measurement?.weight?.value,
            weightUnit: variant?.measurement?.weight?.unit,
            requiresShipping: variant?.requiresShipping,
            taxable: variant?.taxable
          }
        }
      };
    });
    
    /** Group products by cleaned title to identify potential variants of the same product **/
    const productGroups: Record<string, ProcessedProductNode[]> = {};
    
    processedProducts.forEach(product => {
      const {cleanedTitle} = product.processedInfo;
      const productData = product as unknown as ProcessedProductNode;
      if (!productGroups[cleanedTitle]) {
        productGroups[cleanedTitle] = [];
      }
      productGroups[cleanedTitle].push(productData);
    });
    
    /** Create structured response with variant options **/
    const structuredProducts = Object.entries(productGroups).map(([title, products]) => {
      /** Extract unique sizes and colors **/
      const sizes = [...new Set(products.map(p => p.processedInfo.size).filter(Boolean))];
      const colors = [...new Set(products.map(p => p.processedInfo.color).filter(Boolean))];
      
      /** Get base product info from first product **/
      const baseProduct = products[0];
      
      return {
        id: baseProduct.id,
        title,
        originalTitle: baseProduct.title,
        vendor: baseProduct.vendor,
        productType: baseProduct.productType,
        description: baseProduct.description,
        options: [
          { name: 'Size', values: sizes.length > 0 ? sizes : ['Default'] },
          { name: 'Color', values: colors.length > 0 ? colors : ['Default'] }
        ],
        variants: products.map(p => ({
          id: p.id,
          title: p.title,
          size: p.processedInfo.size || 'Default',
          color: p.processedInfo.color || 'Default',
          sku: p.processedInfo.variantInfo.sku,
          price: p.processedInfo.variantInfo.price,
          compareAtPrice: p.processedInfo.variantInfo.compareAtPrice,
          inventoryQuantity: p.processedInfo.variantInfo.inventoryQuantity,
          barcode: p.processedInfo.variantInfo.barcode,
          requiresShipping: p.processedInfo.variantInfo.requiresShipping,
          taxable: p.processedInfo.variantInfo.taxable,
          weight: p.processedInfo.variantInfo.weight,
          weightUnit: p.processedInfo.variantInfo.weightUnit,
          image: p.featuredMedia?.preview?.image?.url || null
        })),
        media: baseProduct.media,
        featuredMedia: baseProduct.featuredMedia
      };
    });

    return NextResponse.json({
      products: structuredProducts,
      originalProducts: validProducts,
      count: validProducts.length
    });
  } catch (error) {
    console.error("Error fetching products by SKU:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to fetch products",
    }, {status: 500});
  }
};