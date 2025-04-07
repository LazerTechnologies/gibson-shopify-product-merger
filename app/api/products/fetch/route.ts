import {NextResponse} from "next/server";
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import path from 'path';

/** Types **/
import type {ProductNode} from "@/lib/types/ShopifyData";

/** Utils **/
import {getAllNonMergedMerchProducts, processMergeProductTitle} from "@/lib/utils";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'all-non-merged-merch-products.json');
const CACHE_DURATION = 1000 * 60 * 60 * 24; /** 1 day in milliseconds **/

const combineProducts = (products: ProductNode[]) => {

  /** Keep track of remaining products to process **/
  let remainingProducts = [...products];
  
  /** Group products by their cleaned title **/
  const productsByTitle = new Map<string, ProductNode[]>();

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

  const productsByTitleObject = Object.fromEntries(productsByTitle);

  return {
    productsByTitle: productsByTitleObject,
    remainingProducts: remainingProducts,
  };
};

async function getAllProducts() {
  try {
    let allProducts: ProductNode[] = [];
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

    const {productsByTitle, remainingProducts} = combineProducts(allProducts);

    return {
      products: allProducts,
      productsByTitle: productsByTitle,
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
