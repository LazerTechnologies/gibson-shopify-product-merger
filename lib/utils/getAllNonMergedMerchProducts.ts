/** Types **/
import type {NonMergedMerchProductNode} from "@/lib/types/ShopifyData";

/** Queries **/
import {queryGetAllNonMergedMerchProducts} from "@/queries";

export const getAllNonMergedMerchProducts = async (
  accessToken: string,
  graphQLEndpoint: string,
) => {
  try {
    let hasNextPage = true;
    let endCursor = null;
    let products: NonMergedMerchProductNode[] = [];

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

      const fetchedProducts = data?.data?.products?.edges?.map((edge: {node: NonMergedMerchProductNode}) => edge.node) ?? [];
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