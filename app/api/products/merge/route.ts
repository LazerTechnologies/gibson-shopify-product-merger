import {NextResponse} from "next/server";

/** Types **/
import type {
  CombinedProduct, 
  Metafield, 
  MediaImage
} from "@/lib/types/ProductData";

/** Queries **/
import {
  mutationProductCreate, 
  mutationProductVariantsBulkCreate
} from "@/queries";

/** 
 * Data Missing
 * - Country Of Origin
 * - 
 */

export async function POST(request: Request) {
  try {
    const {products} = await request.json();

    const mergedProductsResponse = await Promise.all(products?.map(async (product: CombinedProduct) => {

      const productHandle = product?.baseTitle?.replace(/\s+/g, '-');

      const productCreateInput = {
        media: product?.media?.length > 0 ? product?.media?.map((media: MediaImage) => ({
          alt: media?.alt,
          mediaContentType: media?.mediaContentType,
          originalSource: media?.image?.url,
        })) : null,
        input: {
          title: product?.baseTitle,
          descriptionHtml: product?.description,
          handle: productHandle,
          productType: product?.productType,
          status: "DRAFT",
          vendor: product?.vendor,
          tags: product?.tags?.length > 0 ? product?.tags : null,
          metafields: product?.metafields?.length > 0 ? 
            product?.metafields?.map((metafield: Metafield) => ({
              namespace: metafield?.namespace,
              key: metafield?.key,
              value: metafield?.value,
              type: metafield?.type,
            }))
          : null,
          seo: {
            title: product?.seo?.title,
            description: product?.seo?.description,
          }
        }
      };

      /** 
       * We will need to await the response from the productCreate mutation
       * and then use the productId to bulk create the variants
       */

      const productVariantsInput = product?.variants?.length > 0 ? 
        product?.variants?.map((variant) => ({
          barcode: variant?.barcode,
          compareAtPrice: variant?.compareAtPrice ?? null,
          price: variant?.price,
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

      return {
        productCreateInput: productCreateInput,
        productVariantsInput: productVariantsInput,
      };
    }));

    return NextResponse.json(
      { 
        message: "Products Created Successfully",
        allProducts: products, 
        updatedProducts: mergedProductsResponse,
      },
      {status: 200}
    );
  } catch (error) {
    console.error("Error updating products: ", error);
    return new Response("Error updating products", { status: 500 });
  };
}