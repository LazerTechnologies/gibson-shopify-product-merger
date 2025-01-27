import {NextResponse} from "next/server";

/** Types **/
import type {ProductNode, LinkedProductGroup, CombinedProduct} from "@/lib/types/ShopifyData";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2024-10/graphql.json`;

/** Size patterns to match in titles **/
// const SIZE_PATTERNS = {
//   Small: /\b(Small|Sm|S)\b/i,
//   Medium: /\b(Medium|Med|M)\b/i,
//   Large: /\b(Large|L)\b/i,
//   "Extra Large": /\b(Extra Large|XLarge|XL)\b/i,
//   "2XL": /\b(2XL|XXL)\b/i,
//   "3XL": /\b(3XL|XXXL)\b/i,
// };

/** Get the linked product groups from the products metafields **/
const getLinkedProductGroups = (products: ProductNode[]): LinkedProductGroup[] => {
  const linkedGroupsMap = new Map<string, Set<string>>();

  /** Loop through all products **/
  products.forEach(product => {

    const linkedProductsMetafield = product.metafields.find(meta => 
      meta.key === "linked_products" && 
      meta.type === "metaobject_reference"
    );

    if (linkedProductsMetafield?.reference) {
      try {
        const metaobjectId = linkedProductsMetafield.reference.id;
        
        /** Find the linked_product_groups field in the reference fields **/
        const linkedProductsField = linkedProductsMetafield.reference.fields.find(
          field => field.key === "linked_product_group"
        );

        if (metaobjectId && linkedProductsField?.value) {
          /** Parse the linked product IDs from the field value **/
          const linkedIds = JSON.parse(linkedProductsField.value) as string[];

          /** If this metaobject ID isn't in our map yet, initialize it **/
          if (!linkedGroupsMap.has(metaobjectId)) {
            linkedGroupsMap.set(metaobjectId, new Set<string>());
          }
          
          /** Add all linked product IDs to the Set for this metaobject **/
          linkedIds.forEach(id => {
            linkedGroupsMap.get(metaobjectId)?.add(id);
          });
        }
      } catch (error) {
        console.error("Error processing linked products metaobject:", error);
      }
    }
  });

  /** Convert the Map to the desired array format **/
  return Array.from(linkedGroupsMap.entries()).map(([metaobjectId, productIds]) => ({
    metaobjectId,
    linkedProductIds: Array.from(productIds)
  }));
};

interface TitleParts {
  titleParts: string[];
  cleanTitle: string;
  baseProduct: string;
  color?: string;
  size?: string;
  optionallyMergedProducts?: CombinedProduct[];
}

const optionallyMergeCombinedProducts = (products: CombinedProduct[]): (CombinedProduct & {productData: TitleParts})[] => {
  /** First pass - extract base names and organize by core product name **/
  const baseNames = new Map<string, CombinedProduct[]>();
  
  products.forEach(product => {
    const baseTitle = product.productData.baseTitle;
    const normalizedBaseTitle = baseTitle.toLowerCase();
    
    if (!baseNames.has(normalizedBaseTitle)) {
      baseNames.set(normalizedBaseTitle, []);
    }
    baseNames.get(normalizedBaseTitle)?.push(product);
  });

  /** Second pass - process each group **/
  const mergedProducts: (CombinedProduct & {productData: TitleParts})[] = [];
  
  baseNames.forEach((groupProducts) => {
    const mainProduct = groupProducts[0];
    const title = mainProduct.productData.baseTitle;
    const cleanTitle = title.replace(/^Lifestyle\s*/, '').trim();
    
    const titleParts: string[] = [];
    let baseProduct = cleanTitle;
    let color = '';
    let size = '';
    
    // Extract base product name and color from parentheses
    const baseAndColorMatch = cleanTitle.match(/^(.*?)\s*\((.*?)\)/);
    if (baseAndColorMatch) {
      baseProduct = baseAndColorMatch[1].trim();
      color = baseAndColorMatch[2].trim();
      titleParts.push(baseProduct);
      titleParts.push(color);
    } else {
      titleParts.push(baseProduct);
    }
    
    // Extract size if present
    const sizeMatch = cleanTitle.match(/,\s*(.*?)\s*$/);
    if (sizeMatch) {
      size = sizeMatch[1].trim();
      if (size) titleParts.push(size);
    }

    // Filter out the main product from optionally merged products
    const optionallyMergedProducts = groupProducts.slice(1);

    mergedProducts.push({
      ...mainProduct,
      productData: {
        ...mainProduct.productData,
        titleParts,
        cleanTitle: titleParts.join(' - '),
        baseProduct,
        color,
        size,
        optionallyMergedProducts
      }
    });
  });

  return mergedProducts;
};

const combineProducts = (products: ProductNode[], linkedGroups: LinkedProductGroup[]) => {

  if (!linkedGroups.length) {
    return [];
  }

  if (!products.length) {
    return [];
  }

  const combinedProducts = linkedGroups.map((group) => {
    const linkedProducts = products.filter(product => 
      group.linkedProductIds.includes(product.id)
    );

    if (!linkedProducts.length) {
      return null;
    }

    const firstProduct = linkedProducts[0];

    return {
      productData: {
        baseTitle: firstProduct.title,
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
        variants: linkedProducts.map((product) => {
          const productVariant = product.variants.edges[0].node;

          return {
            size: '',
            productTitle: product?.title,
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
  })
  .filter((group): group is NonNullable<typeof group> => 
    group !== null && group.productData.variants.length > 1
  );

  return combinedProducts;
};

async function getAllProducts() {
  console.log("Starting getAllProducts with GraphQL");

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
            metafields(first: 40) {
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
                  metafields(first: 28) {
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
    try {
      console.log("Fetching products with cursor:", cursor);

      const response: Response = await fetch(GRAPHQL_ENDPOINT, {
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
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const { data } = await response.json();

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
      console.error("Error in GraphQL fetch:", error);
      throw error;
    }
  }

  console.log("Total Lifestyle products found: ", allProducts.length);

  const linkedGroups = getLinkedProductGroups(allProducts);
  const combinedProducts = combineProducts(allProducts, linkedGroups);
  const optionallyMergedProducts = optionallyMergeCombinedProducts(combinedProducts);

  return {
    originalProducts: allProducts,
    optionallyMergedProducts: optionallyMergedProducts,
    combinedProducts: combinedProducts,
    linkedGroups: linkedGroups
  };
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
