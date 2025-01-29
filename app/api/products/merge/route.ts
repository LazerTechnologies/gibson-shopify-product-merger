import {NextResponse} from "next/server";

/** Types **/
import type {
  CombinedProduct,
  Metafield,
} from "@/lib/types/ShopifyData";

/** Queries **/
import {
  mutationProductCreate,
  mutationProductVariantsBulkCreate
} from "@/queries";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;

/** 
 * Data Missing
 * - Country Of Origin
 * - Get The Inventory For Each Location Of The Product - Get The Location ID
 */
export async function POST(request: Request) {
  try {
    const {products} = await request.json();

    const mergedProductsResponse = await Promise.all(products.map(async (product: CombinedProduct) => {
      /** Create The Product Handle - Remove White Space And Replace With A Dash **/
      const productHandle = product?.productData?.baseTitle?.replace(/\s+/g, '-');

      /** Get unique size and color options from variants **/
      const sizeOptions = [...new Set(product.productData.variants.map(v => v.size))].filter(Boolean);
      const colorOptions = [...new Set(product.productData.variants.map(v => v.color))].filter(Boolean);

      /** Set default values for size and color options if they exist **/
      if (sizeOptions.length > 0) {
        sizeOptions[0] = "Default";
      }
      if (colorOptions.length > 0) {
        colorOptions[0] = "Default";
      }

      /** Create The Product Input For The Product Create Mutation **/
      const productCreateInput = {
        // media: product?.productData?.media?.edges?.length > 0 ? product?.productData?.media?.edges?.map(media => ({
        //   alt: media?.node?.alt,
        //   mediaContentType: media?.node?.mediaContentType,
        //   originalSource: media?.node?.image?.url,
        // })) : null,
        input: {
          title: product?.productData?.baseTitle,
          descriptionHtml: product?.productData?.description,
          handle: productHandle,
          productType: product?.productData?.productType,
          status: "DRAFT",
          vendor: product?.productData?.vendor,
          productOptions: [
            {
              name: "Size",
              values: sizeOptions?.map((size) => ({
                name: size,
              })),
            },
            {
              name: "Color", 
              values: colorOptions?.map((color) => ({
                name: color,
              })),
            }
          ],
          tags: product?.productData?.tags?.length > 0 ? product?.productData?.tags : null,
          metafields: product?.productData?.metafields?.length > 0 ? 
            product?.productData?.metafields?.map((metafield: Metafield) => ({
              namespace: metafield?.namespace,
              key: metafield?.key,
              value: metafield?.value,
              type: metafield?.type,
            }))
          : null,
          seo: {
            title: product?.productData?.seo?.title,
            description: product?.productData?.seo?.description,
          }
        }
      };
      
      console.log("Creating Product");
      /** Make A Request To Create The Product **/
      const productCreateResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: mutationProductCreate(),
          variables: productCreateInput,
        })
      });
      console.log("Product Created");

      if (!productCreateResponse.ok) {
        throw new Error(`Failed to fetch products: ${productCreateResponse.statusText}`);
      };

      const productCreateData = await productCreateResponse.json();
      console.log("Product Create Response:", productCreateData);

      /** Check for user errors in product creation **/
      if (productCreateData?.data?.productCreate?.userErrors?.length > 0) {
        console.error("Product Creation Errors:", productCreateData.data.productCreate.userErrors);
        throw new Error("Product Creation Failed: " + JSON.stringify(productCreateData.data.productCreate.userErrors));
      };

      const productId = productCreateData?.data?.productCreate?.product?.id;

      /** Get the option IDs for Size and Color **/
      const sizeOptionId = productCreateData?.data?.productCreate?.product?.options?.find((option: any) => option.name === "Size")?.id;
      const colorOptionId = productCreateData?.data?.productCreate?.product?.options?.find((option: any) => option.name === "Color")?.id;

      /** Create The Structure For The Bulk Variant Input **/
      const productVariantData = product?.productData?.variants?.length > 0 ? 
        product?.productData?.variants?.map(variant => ({
          barcode: variant?.barcode ?? "",
          compareAtPrice: variant?.compareAtPrice ?? "",
          price: variant?.price ?? "",
          taxable: variant?.taxable ?? true,
          inventoryItem: {
            sku: variant?.sku,
            requiresShipping: variant?.requiresShipping ?? false,
          },
          // mediaSrc: variant?.featuredImage ? JSON.stringify([variant?.featuredImage]) : null,
          mediaId: variant?.featuredImage ? variant?.featuredImage : null,
          metafields: variant?.metafields?.length > 0 ? 
            variant?.metafields?.filter((metafield: Metafield) => 
              metafield.key !== "harmonized_system_code"
            ).map((metafield: Metafield) => ({
              namespace: metafield?.namespace,
              key: metafield?.key,
              value: metafield?.value,
              type: metafield?.type,
            }))
          : null,
          optionValues: [
            ...(variant?.size ? [{
              name: variant?.size,
              optionId: sizeOptionId
            }]: []),
            ...(variant?.color ? [{
              name: variant?.color,
              optionId: colorOptionId
            }]: []),
          ],
        }))
      : null;

      /** Create The Product Variant Input For The Product Variants Bulk Create Mutation **/
      const productVariantInput = {
        productId: productId,
        variants: productVariantData,
      };

      console.log("Creating Product Variants");
      /** Run The Mutation To Create The Product Variants **/
      const productVariantCreateResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: mutationProductVariantsBulkCreate(),
          variables: productVariantInput,
        })
      });
      console.log("Product Variants Created");

      const variantCreateData = await productVariantCreateResponse.json();
      console.log("Variant Create Response:", variantCreateData);

      /** Check for user errors in variant creation **/
      if (variantCreateData?.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        console.error("Variant Creation Errors:", variantCreateData.data.productVariantsBulkCreate.userErrors);
        return {
          product: productCreateData?.data?.productCreate?.product,
          variants: variantCreateData?.data?.productVariantsBulkCreate?.productVariants,
          error: variantCreateData.data.productVariantsBulkCreate.userErrors,
        }
      }

      return {
        product: productCreateData?.data?.productCreate?.product,
        variants: variantCreateData?.data?.productVariantsBulkCreate?.productVariants,
      };
    }));

    console.log("Final merged response:", mergedProductsResponse);

    return NextResponse.json(
      { 
        message: "Products Created Successfully",
        updatedProducts: mergedProductsResponse,
      },
      {status: 200}
    );
  } catch (error) {
    console.error("Error updating products: ", error);
    return NextResponse.json({ error: `Error updating products: ${error}` }, { status: 500 });
  };
}