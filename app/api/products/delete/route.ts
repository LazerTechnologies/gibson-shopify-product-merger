/** Queries **/
import {mutationProductDelete} from "@/queries";
import {NextResponse} from "next/server";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2024-01/graphql.json`;

export async function POST(request: Request) {
  try {
    const {productIds} = await request.json();
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        {message: "Invalid product IDs provided"},
        {status: 400}
      );
    };

    /** Process products in batches of 5 **/
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      /** Process each batch in parallel **/
      const batchResults = await Promise.all(
        batch.map(async (productId: string) => {
          try {
            const response = await fetch(GRAPHQL_ENDPOINT, {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN!,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: mutationProductDelete(productId),
              }),
            });

            const result = await response.json();
            
            if (result.errors || result.data?.productDelete?.userErrors?.length > 0) {
              console.error(`Failed to delete product ${productId}:`, result);
              return {
                productId,
                success: false,
                errors: result.errors || result.data?.productDelete?.userErrors,
              };
            }
            
            return {
              productId,
              success: true,
              deletedProductId: result.data?.productDelete?.deletedProductId,
            };
          } catch (error) {
            console.error(`Error deleting product ${productId}:`, error);
            return {
              productId,
              success: false,
              error: (error as Error).message,
            };
          }
        })
      );
      
      results.push(...batchResults);
    };
    
    const allSuccessful = results.every(result => result.success);
    
    return NextResponse.json(
      { 
        message: allSuccessful ? "All products deleted successfully" : "Some products failed to delete",
        results
      },
      {status: allSuccessful ? 200 : 207}
    );
  } catch (error) {
    console.error("Error in product deletion:", error);
    return NextResponse.json(
      {message: "Failed to delete products", error: (error as Error).message},
      {status: 500}
    );
  }
}