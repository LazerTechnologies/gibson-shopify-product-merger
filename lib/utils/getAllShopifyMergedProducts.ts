/** Types **/
import type {ProductNode} from "../types/ShopifyData";

/** Queries **/
import {queryGetAllMergedProducts} from "@/queries";

export const getAllShopifyMergedProducts = async (
  GRAPHQL_ENDPOINT: string | undefined,
  ACCESS_TOKEN: string | undefined,
) => {

  if (!GRAPHQL_ENDPOINT || !ACCESS_TOKEN) {
    throw new Error("GRAPHQL_ENDPOINT or ACCESS_TOKEN is not defined");
  };

  let allProducts: ProductNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    console.log("Fetching With Shopify Cursor: ", cursor);
    try {
      const response: Response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryGetAllMergedProducts(),
          variables: {cursor},
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      };

      const {data} = await response.json();

      const products = data?.products?.edges.map((edge: any) => {
        const node = edge.node;
        const variantInfo = node.variants.edges || {};

        return {
          ...node,
          metafields: node.metafields.nodes,
          variants: {
            edges: variantInfo?.length > 0 ? variantInfo?.map((variant: any) => ({
              node: {
                ...variant?.node,
                metafields: variant?.node?.metafields?.nodes || [],
              }
            })) : [],
          },
        };
      });

      allProducts = [...allProducts, ...products];
      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;

    } catch (error) {
      console.error("Error fetching from Shopify:", error);
      throw error;
    }
  }

  return allProducts;
};