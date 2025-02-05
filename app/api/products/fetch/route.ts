import {NextResponse} from "next/server";
import * as fs from 'node:fs/promises';
import path from 'path';

/** Types **/
import type {ProductNode} from "@/lib/types/ShopifyData";

/** Utils **/
import {getAllShopifyProducts} from "@/lib/utils";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'products-cache.json');
const CACHE_DURATION = 1000 * 60 * 60; /** 1 hour in milliseconds **/

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

/** Clean up remaining products and attempt additional merging **/
const cleanupRemainingProducts = (remainingProducts: ProductNode[]) => {

  /** Try to group remaining products by similar titles **/
  const remainingGroups = new Map<string, ProductNode[]>();
  
  remainingProducts.forEach(product => {
    /** Check linked products metafield first **/
    const linkedProductsMetafield = product.metafields.find(meta => 
      meta.key === "linked_products" && 
      meta.type === "metaobject_reference"
    );

    if (linkedProductsMetafield?.reference) {
      const linkedProductsField = linkedProductsMetafield.reference.fields.find(
        field => field.key === "linked_product_group"
      );

      if (linkedProductsField?.value) {
        try {
          const linkedIds = JSON.parse(linkedProductsField.value) as string[];

          /** Skip if less than 2 linked products **/
          if (linkedIds.length > 1) {
            return;
          }
        } catch (error) {
          console.error(`Error parsing linked products:`, error);
        }
      }
    }

    const {cleanedTitle} = processTitle(
      product.title,
      product.variants.edges[0].node.sku
    );

    /** Try to find existing groups with similar titles **/
    let foundMatch = false;
    for (const [existingTitle, group] of remainingGroups.entries()) {
      /** Check if titles are similar (you can adjust the similarity threshold) **/
      if (
        existingTitle.toLowerCase().includes(cleanedTitle.toLowerCase()) || 
        cleanedTitle.toLowerCase().includes(existingTitle.toLowerCase())
      ) {
        group.push(product);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      remainingGroups.set(cleanedTitle, [product]);
    }
  });

  /** Filter out groups with only single products before processing **/
  for (const [title, group] of remainingGroups.entries()) {
    if (group.length <= 1) {
      remainingGroups.delete(title);
    };
  };

  /** Create new combined products from remaining groups **/
  const newCombinedProducts = Array.from(remainingGroups.entries())
    .map(([cleanedTitle, groupedProducts]) => {
      const firstProduct = groupedProducts[0];
      
      /** Track unique featured images by their base filename and alt text **/
      const uniqueImages = new Map<string, {
        id: string,
        url: string,
        alt?: string
      }>();

      /** Process featured images to build unique image map **/
      groupedProducts.forEach(product => {
        if (product.featuredMedia?.preview?.image?.url) {
          const imageUrl = product.featuredMedia.preview.image.url;
          const alt = product.featuredMedia?.preview?.image?.altText;

          /** Also store by alt text if it exists **/
          if (alt && !uniqueImages.has(alt)) {
            uniqueImages.set(alt, {
              id: product.featuredMedia.id,
              url: imageUrl,
              alt: alt,
            });
          }
        }
      });

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
          featuredMedia: firstProduct.featuredMedia,
          variants: groupedProducts.map((product) => {
            const productVariant = product.variants.edges[0].node;
            const {size, color} = processTitle(product.title, productVariant?.sku);

            /** Try to find matching featured image for this variant **/
            let variantImage = {
              id: product.featuredMedia?.id,
              altText: product.featuredMedia?.preview?.image?.altText
            };

            if (product.featuredMedia?.preview?.image?.url) {
              /** If no match by filename, try matching by alt text **/
              const existingImage = uniqueImages.get(product?.featuredMedia?.preview?.image?.altText);
              
              if (existingImage) {
                variantImage = {
                  id: existingImage?.id,
                  altText: existingImage?.alt || ''
                };
              };
            };

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
              requiresShipping: productVariant.requiresShipping,
              taxable: productVariant.taxable ?? true,
              inventoryQuantity: productVariant.inventoryQuantity,
              weight: productVariant.measurement?.weight?.value,
              weightUnit: productVariant.measurement?.weight?.unit,
              countryOfOrigin: productVariant.inventoryItem?.countryCodeOfOrigin,
              harmonizedSystemCode: productVariant.inventoryItem?.harmonizedSystemCode,
              featuredImage: variantImage
            };
          }),
        }
      };
    });

  /** Get final unmatched products - only those that weren't grouped **/
  const finalUnmatched = remainingProducts.filter(product => {
    const sku = product.variants.edges[0].node.sku;
    const {cleanedTitle} = processTitle(product.title, sku);
    const group = remainingGroups.get(cleanedTitle);
    return !group || group.length <= 1;
  });

  console.log(`\nSuccessfully created ${newCombinedProducts.length} new groups`);
  console.log(`${finalUnmatched.length} products remain unmatched:`);

  return {
    newCombinedProducts,
    finalUnmatched
  };
};

/** Combine similar products into product groups with variants **/
const combineProducts = (products: ProductNode[]) => {
  /** Keep track of remaining products to process **/
  let remainingProducts = [...products];
  
  /** Group products by their cleaned title **/
  const productsByTitle = new Map<string, ProductNode[]>();

  /** First round - group by cleaned title **/
  remainingProducts.forEach(product => {
    const {cleanedTitle} = processTitle(
      product.title, 
      product?.variants?.edges?.[0]?.node?.sku
    );

    if (!productsByTitle.has(cleanedTitle)) {
      productsByTitle.set(cleanedTitle, []);
    }
    productsByTitle.get(cleanedTitle)?.push(product);
  });

  /** Create combined products and track linked products to add **/
  const combinedProducts = Array.from(productsByTitle.entries()).map(([cleanedTitle, groupedProducts]) => {
    if (groupedProducts.length <= 1) {
      return null;
    }

    const firstProduct = groupedProducts[0];
    const linkedProductIds = new Set<string>();

    /** Get all linked product IDs **/
    groupedProducts.forEach(product => {
      const linkedProductsMetafield = product.metafields.find(meta => 
        meta.key === "linked_products" && 
        meta.type === "metaobject_reference"
      );

      if (linkedProductsMetafield?.reference) {
        const linkedProductsField = linkedProductsMetafield.reference.fields.find(
          field => field.key === "linked_product_group"
        );

        if (linkedProductsField?.value) {
          try {
            const ids = JSON.parse(linkedProductsField.value) as string[];
            ids.forEach(id => linkedProductIds.add(id));
          } catch (error) {
            console.error(
              `Error parsing linked products for ${cleanedTitle}:`,
              error
            );
          }
        }
      }
    });

    /** Add any linked products that weren't in the original group **/
    const linkedProducts = remainingProducts.filter(product => 
      linkedProductIds.has(product.id) && 
      !groupedProducts.some(p => p.id === product.id)
    );

    /** Remove found linked products from remaining products **/
    remainingProducts = remainingProducts.filter(product => 
      !linkedProductIds.has(product.id)
    );

    /** Combine original group with linked products **/
    const allGroupProducts = [...groupedProducts, ...linkedProducts];

    /** Track unique featured images by their base filename and alt text **/
    const uniqueImages = new Map<string, {
      id: string,
      url: string,
      alt?: string
    }>();

    /** Process featured images to build unique image map **/
    allGroupProducts.forEach(product => {
      if (product.featuredMedia?.preview?.image?.url) {
        const imageUrl = product.featuredMedia.preview.image.url;
        const alt = product.featuredMedia?.preview?.image?.altText;

        /** Also store by alt text if it exists **/
        if (alt && !uniqueImages.has(alt)) {
          uniqueImages.set(alt, {
            id: product.featuredMedia.id,
            url: imageUrl,
            alt: alt,
          });
        }
      }
    });

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
        featuredMedia: firstProduct.featuredMedia,
        variants: allGroupProducts.map((product) => {
          const productVariant = product.variants.edges[0].node;
          const {size, color} = processTitle(product.title, productVariant?.sku);

          /** Try to find matching featured image for this variant **/
          let variantImage = {
            id: product.featuredMedia?.id,
            altText: product.featuredMedia?.preview?.image?.altText
          };

          if (product.featuredMedia?.preview?.image?.url) {
            /** First try matching by filename **/
            const existingImage = uniqueImages.get(product?.featuredMedia?.preview?.image?.altText);

            if (existingImage) {
              variantImage = {
                id: existingImage?.id,
                altText: existingImage?.alt || '',
              };
            };
          };

          return {
            productTitle: cleanedTitle,
            title: product?.title || '',
            price: productVariant?.price,
            size: size,
            color: color,
            compareAtPrice: productVariant?.compareAtPrice,
            featuredImage: variantImage,
            sku: productVariant?.sku,
            barcode: productVariant?.barcode,
            metafields: productVariant?.metafields,
            requiresShipping: productVariant?.requiresShipping,
            taxable: productVariant?.taxable ?? true,
            inventoryQuantity: productVariant?.inventoryQuantity,
            weight: productVariant.measurement?.weight?.value,
            weightUnit: productVariant.measurement?.weight?.unit,
            countryOfOrigin: productVariant.inventoryItem?.countryCodeOfOrigin,
            harmonizedSystemCode: productVariant.inventoryItem?.harmonizedSystemCode,
          };
        }),
      }
    };
  }).filter((group): group is NonNullable<typeof group> => 
    group !== null && group.productData.variants.length > 1
  );

  return {
    combinedProducts,
    remainingProducts
  };
};

async function getAllProducts() {
  try {
    /** Check if cache file exists and is not expired **/
    try {
      const stats = await fs.stat(CACHE_FILE_PATH);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      if (cacheAge < CACHE_DURATION) {
        console.log("Reading from cache...");
        const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
        const cachedData = JSON.parse(fileContent);
        const {combinedProducts, remainingProducts} = combineProducts(cachedData.data);
        const {newCombinedProducts, finalUnmatched} = cleanupRemainingProducts(remainingProducts);
        return {
          originalProducts: cachedData.data,
          combinedProducts: [...combinedProducts, ...newCombinedProducts],
          unmatchedProducts: finalUnmatched
        };
      }
    } catch (error) {
      /** Cache file doesn't exist or other error, continue to fetch **/
      console.log(`Cache not available, fetching from Shopify... ${error}`);
    };

    /** Fetch fresh data from Shopify **/
    console.log("Fetching All Shopify Products");
    const allProducts = await getAllShopifyProducts(GRAPHQL_ENDPOINT, ACCESS_TOKEN);
    console.log("Fetched All Shopify Products");
    const {combinedProducts, remainingProducts} = combineProducts(allProducts);
    const {newCombinedProducts, finalUnmatched} = cleanupRemainingProducts(remainingProducts);

    /** Save to cache **/
    await fs.mkdir(path.dirname(CACHE_FILE_PATH), {recursive: true});
    await fs.writeFile(
      CACHE_FILE_PATH,
      JSON.stringify({data: allProducts, timestamp: Date.now()})
    );

    return {
      originalProducts: allProducts,
      combinedProducts: [...combinedProducts, ...newCombinedProducts],
      unmatchedProducts: finalUnmatched
    };
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    throw error;
  }
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
      {error: "Failed to fetch products"},
      {status: 500}
    );
  }
}
