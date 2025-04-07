import {NextResponse} from "next/server";
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import path from 'path';

/** Types **/
import type {NonMergedMerchProductNode} from "@/lib/types/ShopifyData";

/** Utils **/
import {getAllNonMergedMerchProducts, processMergeProductTitle} from "@/lib/utils";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'all-non-merged-merch-products.json');
const CACHE_DURATION = 1000 * 60 * 60 * 24; /** 1 day in milliseconds **/

const combineProducts = (products: NonMergedMerchProductNode[]) => {

  /** Group products by their cleaned title **/
  const productsByTitle = new Map<string, NonMergedMerchProductNode[]>();

  /** First round - group by cleaned title **/
  products.forEach(product => {
    const {cleanedTitle} = processMergeProductTitle(
      product?.title || '', 
      product?.variants?.edges?.[0]?.node?.sku || ''
    );

    if (!productsByTitle.has(cleanedTitle)) {
      productsByTitle.set(cleanedTitle, []);
    }
    productsByTitle.get(cleanedTitle)?.push(product);
  });

  /** Filter out products that should remain ungrouped (singles) **/
  let remainingProducts: NonMergedMerchProductNode[] = [];
  
  /** Identify products that are singles (only one product with that title) **/
  productsByTitle?.forEach((groupedProducts) => {
    if (groupedProducts.length === 1) {
      remainingProducts.push(groupedProducts[0]);
    }
  });

  /** Only keep groups with multiple products **/
  const validGroups = Array.from(productsByTitle?.entries())
    .filter(([, groupProducts]) => groupProducts?.length > 1);
  
  const combinedProducts = validGroups.map(([baseTitle, groupedProducts]) => {
    const uniqueLinkedProductIds = new Set<string>();

    /** Get all linked product IDs **/
    groupedProducts.forEach(product => {
      const linkedProductsMetafield = product?.metafields?.nodes?.find(meta => 
        meta?.key === "linked_products" && 
        meta?.type === "metaobject_reference"
      );

      if (linkedProductsMetafield?.reference) {
        const linkedProductsField = linkedProductsMetafield?.reference?.fields?.find(
          field => field?.key === "linked_product_group"
        );

        if (linkedProductsField?.value) {
          try {
            const ids = JSON.parse(linkedProductsField?.value || '') as string[];
            /** Add each ID to the Set to ensure uniqueness **/
            ids.forEach(id => uniqueLinkedProductIds.add(id));
          } catch (error) {
            console.error(
              `Error parsing linked products for ${baseTitle}:`,
              error
            );
          }
        }
      }
    });

    const linkedProductIds = Array.from(uniqueLinkedProductIds);

    /** Find linked products that weren't in the original group **/
    const additionalLinkedProducts = remainingProducts.filter(product => 
      linkedProductIds?.includes(product?.id) && 
      !groupedProducts.some(p => p?.id === product?.id)
    );

    /** Remove found linked products from remaining products **/
    remainingProducts = remainingProducts.filter(product => 
      !linkedProductIds.some(id => id === product?.id)
    );

    /** Combine original group with linked products **/
    const allGroupProducts = [...groupedProducts, ...additionalLinkedProducts];

    /** Track unique featured images by their base filename and alt text **/
    const uniqueImages = new Map<string, {
      id: string,
      url: string,
      alt?: string
    }>();

    /** Process featured images to build unique image map **/
    allGroupProducts.forEach(product => {
      if (product?.featuredMedia?.preview?.image?.url) {
        const imageUrl = product?.featuredMedia?.preview?.image?.url;
        const alt = product?.featuredMedia?.preview?.image?.altText;

        /** Also store by alt text if it exists **/
        if (alt && !uniqueImages.has(alt)) {
          uniqueImages.set(alt, {
            id: product?.featuredMedia?.id,
            url: imageUrl,
            alt: alt,
          });
        }
      }
    });

    const firstProduct = allGroupProducts[0];

    return {
      productData: {
        baseTitle: baseTitle,
        title: firstProduct?.title || '',
        vendor: firstProduct?.vendor || '',
        createdAt: firstProduct?.createdAt || '',
        updatedAt: firstProduct?.updatedAt || '',
        publishedAt: firstProduct?.publishedAt || '',
        productType: firstProduct?.productType || '',
        status: firstProduct?.status || '',
        description: firstProduct?.description || '',
        tags: firstProduct?.tags || [],
        metafields: firstProduct?.metafields || [],
        seo: {
          title: firstProduct?.seo?.title || '',
          description: firstProduct?.seo?.description || '',
        },
        media: firstProduct?.media || [],
        featuredMedia: firstProduct?.featuredMedia || null,
        variants: allGroupProducts.map((product) => {
          const productVariant = product?.variants?.edges?.[0]?.node;
          const {size, color} = processMergeProductTitle(product?.title, productVariant?.sku);

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
            productTitle: baseTitle,
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
  })?.filter((group): group is NonNullable<typeof group> => 
    group !== null && group?.productData?.variants?.length > 0
  );

  return {
    combinedProducts: combinedProducts,
    remainingProducts: remainingProducts,
  };
};

async function getAllProducts() {
  try {
    let allProducts: NonMergedMerchProductNode[] = [];
    let useCache = false;
    
    /** Check if cache file exists and is not expired **/
    try {
      const stats = await stat(CACHE_FILE_PATH);
      const cacheAge = Date.now() - stats?.mtimeMs;
      
      if (cacheAge < CACHE_DURATION) {
        console.log("Reading from cache...");
        const fileContent = await readFile(CACHE_FILE_PATH, 'utf-8');
        const cachedData = JSON.parse(fileContent);
        allProducts = cachedData?.data;
        useCache = true;
      }
    } catch (error) {
      /** Cache file doesn't exist or other error, continue to fetch **/
      console.log(`Cache not available, fetching from Shopify... ${error}`);
    }

    /** Fetch fresh data from Shopify only if cache is not used **/
    if (!useCache) {
      console.log("Fetching All Shopify Products");
      allProducts = await getAllNonMergedMerchProducts(
        ACCESS_TOKEN || '',
        GRAPHQL_ENDPOINT,
      );

      /** Save to cache **/
      await mkdir(path.dirname(CACHE_FILE_PATH), {recursive: true});
      await writeFile(
        CACHE_FILE_PATH,
        JSON.stringify({
          data: allProducts, 
          timestamp: Date.now()
        })
      );
    }

    const {combinedProducts, remainingProducts} = combineProducts(allProducts);

    return {
      products: allProducts,
      combinedProducts: combinedProducts,
      remainingProducts: remainingProducts,
      fromCache: useCache
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
