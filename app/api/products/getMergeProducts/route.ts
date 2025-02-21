import {NextResponse} from "next/server";
import * as fs from 'node:fs/promises';
import path from 'path';

/** Utils **/
import {getAllShopifyMergedProducts} from "@/lib/utils";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'products-cache.json');
const CACHE_DURATION = 1000 * 60 * 60; /** 1 hour in milliseconds **/

export async function GET() {
  try {
    /** Check if cache file exists and is not expired **/
    try {
      const stats = await fs.stat(CACHE_FILE_PATH);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      if (cacheAge < CACHE_DURATION) {
        console.log("Reading from cache...");
        const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
        const cachedData = JSON.parse(fileContent);
        return {
          mergedProducts: cachedData.data,
        };
      }
    } catch (error) {
      /** Cache file doesn't exist or other error, continue to fetch **/
      console.log(`Cache not available, fetching from Shopify... ${error}`);
    };

    const allProducts = await getAllShopifyMergedProducts(GRAPHQL_ENDPOINT, ACCESS_TOKEN);

    /** Save to cache **/
    await fs.mkdir(path.dirname(CACHE_FILE_PATH), {recursive: true});
    await fs.writeFile(
      CACHE_FILE_PATH,
      JSON.stringify({data: allProducts, timestamp: Date.now()})
    );

    return NextResponse.json({
      mergedProducts: allProducts,
    });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json(
      {error: "Failed to fetch products"},
      {status: 500}
    );
  }
}