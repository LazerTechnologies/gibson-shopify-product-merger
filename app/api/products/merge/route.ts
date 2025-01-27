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

/** 
 * Data Missing
 * - Country Of Origin
 * - Get The Inventory For Each Location Of The Product - Get The Location ID
 */
export async function POST(request: Request) {
  try {
    const {optionallyMergedProducts} = await request.json();

    const mergedProductsResponse = await Promise.all(optionallyMergedProducts?.map(async (product: CombinedProduct) => {

      /** Create The Product Handle - Remove White Space And Replace With A Dash **/
      const productHandle = product?.productData?.baseTitle?.replace(/\s+/g, '-');

      /** Create The Product Input For The Product Create Mutation **/
      const productCreateInput = {
        media: product?.productData?.media?.edges?.length > 0 ? product?.productData?.media?.edges?.map(media => ({
          alt: media?.node?.alt,
          mediaContentType: media?.node?.mediaContentType,
          originalSource: media?.node?.image?.url,
        })) : null,
        input: {
          title: product?.productData?.baseTitle,
          descriptionHtml: product?.productData?.description,
          handle: productHandle,
          productType: product?.productData?.productType,
          status: "DRAFT",
          vendor: product?.productData?.vendor,
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

      /** Create The Structure For The Bulk Variant Input **/
      const productVariantData = product?.productData?.variants?.length > 0 ? 
        product?.productData?.variants?.map((variant) => ({
          barcode: variant?.barcode ?? "",
          compareAtPrice: variant?.compareAtPrice ?? "",
          price: variant?.price ?? "",
          taxable: variant?.taxable ?? true,
          inventoryItem: {
            sku: variant?.sku,
            countryOfOrigin: null,
            measurement: {
              weight: {
                unit: variant?.weightUnit,
              },
            },
            requiresShipping: variant?.requiresShipping ?? false,
          },
          metafields: variant?.metafields?.length > 0 ? 
            variant?.metafields?.map((metafield: Metafield) => ({
              namespace: metafield?.namespace,
              key: metafield?.key,
              value: metafield?.value,
              type: metafield?.type,
            }))
          : null,
          optionValues: [{
            name: variant?.size,
            optionName: "Size"
          }],
        }))
      : null;

      /** Make A Request To Create The Product **/
      // To Do: Create The Product

      /** If The Request Fails, Return The Error And Don't Create The Product Variants **/
      // To Do: Return The Error

      /** Create The Product Variant Input For The Product Variants Bulk Create Mutation **/
      const productVariantInput = {
        productId: "",
        variants: productVariantData,
      };

      /** Run The Mutation To Create The Product Variants **/
      // To Do: Create The Product Variants

      return {
        productCreateInput: productCreateInput,
        productVariantsInput: productVariantInput,
      };
    }));

    return NextResponse.json(
      { 
        message: "Products Created Successfully",
        allProducts: optionallyMergedProducts,
        updatedProducts: mergedProductsResponse,
      },
      {status: 200}
    );
  } catch (error) {
    console.error("Error updating products: ", error);
    return new Response("Error updating products", { status: 500 });
  };
}