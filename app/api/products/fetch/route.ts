import {NextResponse} from "next/server";
import * as fs from 'node:fs/promises';
import path from 'path';

/** Types **/
import type {ProductNode} from "@/lib/types/ShopifyData";

/** Size patterns to match in titles **/
const SIZE_PATTERNS = {
  "3XL": /\b(3XL|XXXL)\b/i,
  "2XL": /\b(2XL|XXL)\b/i,
  "Extra Large": /\b(Extra Large|XLarge|X-Large|XL)\b/i,
  Large: /\b(Large|L)\b/i,
  Medium: /\b(Medium|Med|M)\b/i,
  Small: /\b(Small|Sm|S)\b/i,
};

/** Color patterns to match in product titles **/
const TITLE_COLOR_PATTERNS = {
  White: /\b(White|Wht)\b/i,
  "Vintage White": /\b(Vintage White)\b/i,
  Black: /\b(Black|Blk)\b/i,
  "Vintage Black": /\b(Vintage Black)\b/i,
  "Faded Black": /\b(Faded Black)\b/i,
  "Black Heather": /\b(Black Heather)\b/i,
  Gray: /\b(Gray|Gry)\b/i,
  Grey: /\b(Grey)\b/i,
  "Carbon Grey": /\b(Carbon Grey)\b/i,
  "Heathered Gray": /\b(Heathered Gray)\b/i,
  Crimson: /\b(Crimson|Crim)\b/i,
  Red: /\b(Red|Rd)\b/i,
  Green: /\b(Green)\b/i,
  "Army Green": /\b(Army Green)\b/i,
  Olive: /\b(Olive)\b/i,
  Charcoal: /\b(Charcoal)\b/i,
  Blue: /\b(Blue)\b/i,
  "Sky Blue": /\b(Sky Blue)\b/i,
  "Dark Brown": /\b(Dark Brown)\b/i,
  Orange: /\b(Orange)\b/i,
  Cream: /\b(Cream)\b/i,
  Oatmeal: /\b(Oatmeal)\b/i,
};

/** Color patterns to match in SKUs **/
const SKU_COLOR_PATTERNS = {
  White: /WHT/i,
  Black: /BLK/i,
  Grey: /GRY/i,
  Red: /RED/i,
  Green: /GRN/i,
  Olive: /OLV/i,
  Blue: /(?:BLU|TL)/i,
  "Dark Brown": /BRN/i,
  Orange: /ORG/i,
  Cream: /CRM/i,
};

/** Clean title and extract size/color helper function **/
const processTitle = (title: string, sku: string): { 
  cleanedTitle: string;
  size: string;
  color: string;
} => {
  let workingTitle = title;
  let foundSize = '';
  let foundColor = '';

  /** Find size match - now ordered from largest to smallest to avoid partial matches **/
  for (const [size, pattern] of Object.entries(SIZE_PATTERNS)) {
    if (pattern.test(workingTitle)) {
      foundSize = size;
      workingTitle = workingTitle.replace(pattern, '');
      break;
    }
  }

  /** Find color match from title first **/
  for (const [color, pattern] of Object.entries(TITLE_COLOR_PATTERNS)) {
    if (pattern.test(workingTitle)) {
      foundColor = color;
      workingTitle = workingTitle.replace(pattern, '');
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

  /** Clean remaining title **/
  const cleanedTitle = workingTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanedTitle,
    size: foundSize,
    color: foundColor
  };
};

/** Combine similar products into product groups with variants **/
const combineProducts = (products: ProductNode[]) => {
  /** Group products by their cleaned title **/
  const productsByTitle = new Map<string, ProductNode[]>();

  /** Process each product and group by cleaned title **/
  products.forEach(product => {
    const {cleanedTitle} = processTitle(
      product.title, 
      product?.variants?.edges?.[0]?.node?.sku
    );

    if (!productsByTitle.has(cleanedTitle)) {
      productsByTitle.set(cleanedTitle, []);
    }
    productsByTitle.get(cleanedTitle)?.push(product);
  });

  /** Create combined products for groups with multiple variants **/
  const combinedProducts = Array.from(productsByTitle.entries()).map(([cleanedTitle, groupedProducts]) => {
    if (groupedProducts.length <= 1) {
      return null;
    };

    const firstProduct = groupedProducts[0];

    return {
      productData: {
        baseTitle: cleanedTitle,
        title: firstProduct.title,
        vendor: firstProduct.vendor,
        createdAt: firstProduct.createdAt,
        updatedAt: firstProduct.updatedAt,
        publishedAt: firstProduct.publishedAt,
        productType: firstProduct.productType,
        status: firstProduct.status,
        description: firstProduct.description,
        tags: firstProduct.tags,
        metafields: firstProduct.metafields,
        seo: {
          title: firstProduct.seo.title,
          description: firstProduct.seo.description,
        },
        media: firstProduct.media,
        variants: groupedProducts.map((product) => {
          const productVariant = product.variants.edges[0].node;

          const {size, color} = processTitle(product.title, productVariant?.sku);

          return {
            size,
            color,
            productTitle: cleanedTitle,
            title: product?.title || '',
            price: productVariant.price,
            compareAtPrice: productVariant.compareAtPrice,
            sku: productVariant.sku,
            barcode: productVariant.barcode,
            metafields: productVariant.metafields,
            weight: productVariant.weight,
            weightUnit: productVariant.weightUnit,
            requiresShipping: productVariant.requiresShipping,
            taxable: productVariant.taxable ?? true,
            inventoryQuantity: productVariant.inventoryQuantity,
          };
        }),
      }
    };
  }).filter((group): group is NonNullable<typeof group> => 
    group !== null && group.productData.variants.length > 1
  );

  return combinedProducts;
};

async function getAllProducts() {
  const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'products-cache.json');

  /** Read and parse the cached data **/
  const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
  const cachedData = JSON.parse(fileContent);
  const allProducts = cachedData.data;

  const combinedProducts = combineProducts(allProducts);
  
  const result = {
    originalProducts: allProducts,
    combinedProducts: combinedProducts,
  };

  return result;
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
