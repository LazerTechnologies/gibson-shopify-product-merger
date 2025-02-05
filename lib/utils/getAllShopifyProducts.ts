/** Types **/
import type {ProductNode} from "../types/ShopifyData";

export const getAllShopifyProducts = async (
  GRAPHQL_ENDPOINT: string | undefined,
  ACCESS_TOKEN: string | undefined,
) => {

  if (!GRAPHQL_ENDPOINT || !ACCESS_TOKEN) {
    throw new Error("GRAPHQL_ENDPOINT or ACCESS_TOKEN is not defined");
  }

  const query = `
    query GetLifestyleProducts($cursor: String) {
      products(first: 250, query: "vendor:Lifestyle", after: $cursor) {
        edges {
          node {
            id
            title
            vendor
            handle
            createdAt
            updatedAt
            publishedAt
            productType
            status
            description
            descriptionHtml
            tags
            seo {
              title
              description
            }
            featuredMedia {
              id
              alt
              preview {
                image {
                  url
                  altText
                }
              }
            }
            media(first: 60) {
              edges {
                node {
                  ... on MediaImage {
                    id
                    mediaContentType
                    image {
                      id
                      url
                      width
                      height
                    }
                    alt
                  }
                }
              }
            }
            metafields(first: 65) {
              nodes {
                namespace
                key
                value
                type
                reference {
                  ...on Metaobject {
                    id
                    type
                    fields {
                      key
                      value
                      type
                    }
                  }
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  sku
                  price
                  compareAtPrice
                  inventoryQuantity
                  barcode
                  taxable
                  inventoryItem {
                    countryCodeOfOrigin
                    harmonizedSystemCode
                    measurement {
                      weight {
                        value
                      }
                    }
                  }
                  metafields(first: 30) {
                    nodes {
                      namespace
                      key
                      value
                      type
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let allProducts: ProductNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    console.log("Fetching With Shopify Cursor: ", cursor);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { cursor },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const {data} = await response.json();

      const products = data.products.edges.map((edge) => {
        const node = edge.node;
        const variantInfo = node.variants.edges[0]?.node || {};
        return {
          ...node,
          metafields: node.metafields.nodes,
          variants: {
            edges: [
              {
                node: {
                  ...variantInfo,
                  metafields: variantInfo.metafields?.nodes || [],
                },
              },
            ],
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