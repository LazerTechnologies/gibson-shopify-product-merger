import {NextResponse} from "next/server";
import * as fs from 'node:fs/promises';
import path from 'path';
import csv from 'csv-parser';
import {Readable} from 'stream';

/** Types **/
import type {MergedShopifyProduct} from "@/lib/types/mergedProduct";

/** Utils **/
import {sanitizeHandle} from "@/lib/utils";

/** Queries **/
import {mutationProductUpdate} from "@/queries";

interface ProductUpdateInput {
  input: {
    id: string;
    title: string | null;
    seo: {
      title: string | null;
      description: string | null;
    };
    handle: string | null;
    vendor: string | null;
    tags: string[] | null;
  };
};

interface CsvRow {
  sku: string;
  shopifyId: string;
  newBrand: string;
  newTitle: string;
};

interface UpdateResult {
  success: boolean;
  productId: string;
  input?: ProductUpdateInput;
  errors?: Array<{field: string; message: string}>;
  message?: string;
  matchingCsvRow?: CsvRow;
  error?: string;
}

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;
const CSV_FILE_PATH = path.join(process.cwd(), 'data', 'displayDivisionProductsToUpdate.csv');
const SUCCESS_LOG_PATH = path.join(process.cwd(), 'data', 'updated-merged-products.json');

const readCsvFile = async (): Promise<CsvRow[]> => {
  const fileContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
  const results: CsvRow[] = [];

  return new Promise((resolve, reject) => {
    Readable.from(fileContent)
      .pipe(csv())
      .on('data', (row: CsvRow) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

const processMergedProduct = async (
  product: MergedShopifyProduct,
  csvData: CsvRow[],
) => {
  const productVariants = product?.variants?.edges;

  /** Find matching CSV row for any variant SKU **/
  const matchingCsvRow = csvData.find(row => 
    productVariants?.some(variant => variant?.node?.sku === row.sku)
  );

  const productTags = product?.tags || [];
  const updatedTags = productTags
    ?.filter(tag => tag !== 'no_body_image_shot')
    ?.concat(['updated_merged_merch_product']);

  if (!matchingCsvRow) {
    return {
      success: false,
      productId: product?.id,
      message: "No matching SKU found in CSV Data",
    };
  };

  const sanitizedHandle = sanitizeHandle(matchingCsvRow?.newTitle);

  const productUpdateInput: ProductUpdateInput = {
    input: {
      id: product?.id,
      title: matchingCsvRow?.newTitle || null,
      vendor: matchingCsvRow?.newBrand || null,
      seo: {
        title: matchingCsvRow?.newTitle || null,
        description: null,
      },
      handle: sanitizedHandle || null,
      tags: updatedTags
    }
  };

  const productUpdateResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": ACCESS_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: mutationProductUpdate(),
      variables: productUpdateInput,
    }),
  });

  const responseData = await productUpdateResponse.json();

  if (responseData.data?.productUpdate?.userErrors?.length > 0 ) {
    return {
      success: false,
      productId: product?.id,
      input: productUpdateInput,
      errors: responseData.data?.productUpdate?.userErrors?.map((error: {message: string}) => 
        error?.message
      )?.join(', ') || [],
      message: `Failed to update product: ${productUpdateResponse.status}`,
    };
  };

  if (responseData?.errors?.length > 0) {
    return {
      success: false,
      productId: product?.id,
      errors: responseData?.errors?.map((error: {message: string}) => 
        error?.message
      )?.join(', '),
      message: "Failed to update product",
    };
  };

  return {
    success: true,
    productId: product?.id,
    input: productUpdateInput,
    matchingCsvRow,
    updatedProduct: responseData.data?.productUpdate?.product,
  };
};

export async function POST(request: Request) {
  try {
    const {mergedProducts} = await request.json();
    const successfulUpdates: UpdateResult[] = [];
    const failedUpdates: UpdateResult[] = [];

    /** Process products in batches of 2 **/
    const batchSize = 2;
    const batches = [];
    
    for (let i = 0; i < mergedProducts.length; i += batchSize) {
      const batch = mergedProducts.slice(i, i + batchSize);
      batches.push(batch);
    };

    const csvData = await readCsvFile();

    const results = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (product: MergedShopifyProduct) => {
          try {
            /** Process each product in the batch **/
            const result = await processMergedProduct(
              product,
              csvData,
            );
            
            if (result.success) {
              successfulUpdates.push(result);
              return {
                success: true,
                productId: product?.id,
                input: result?.input,
                message: "Product updated successfully"
              };
            } else {
              failedUpdates.push(result);
              return {
                success: false,
                productId: product?.id,
                input: result?.input,
                errors: result?.errors,
                message: result?.message
              };
            };
          } catch (err) {
            const failedResult = {
              success: false, 
              productId: product.id,
              error: err instanceof Error ? err.message : "Unknown error"
            };
            failedUpdates.push(failedResult);
            return failedResult;
          }
        })
      );
      results.push(...batchResults);
    };

    const updatedData = {
      successfulUpdates: successfulUpdates,
      failedUpdates: failedUpdates,
    };

    /** Write results to files **/
    await fs.writeFile(
      SUCCESS_LOG_PATH,
      JSON.stringify(updatedData, null, 2)
    );
  
    return NextResponse.json({
      success: true,
      results: results,
      successCount: successfulUpdates.length,
      failureCount: failedUpdates.length
    });
  } catch (error) {
    console.error("Error Updating Merged Product: ", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, {status: 500});
  }
};