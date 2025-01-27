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
 * - Get The Inventory For Each Location Of The Product - Get The Location ID
 */

export async function POST(request: Request) {
  try {
    const {products} = await request.json();

    const mergedProductsResponse = await Promise.all(products?.map(async (product: CombinedProduct) => {

      /** Create The Product Handle - Remove White Space And Replace With A Dash **/
      const productHandle = product?.baseTitle?.replace(/\s+/g, '-');

      /** Create The Product Input For The Product Create Mutation **/
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

      /** Create The Structure For The Bulk Variant Input **/
      const productVariantData = product?.variants?.length > 0 ? 
        product?.variants?.map((variant) => ({
          barcode: variant?.barcode ?? "",
          compareAtPrice: variant?.compareAtPrice ?? "",
          price: variant?.price ?? "",
          taxable: variant?.taxable ?? true, // If The Value Is Not Populated, Should This Be Set To True Or False?
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