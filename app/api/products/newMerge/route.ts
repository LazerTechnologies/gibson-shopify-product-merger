import {NextResponse} from "next/server";

/** Types **/
import type {Metafield} from "@/lib/types/ShopifyData";
import type {ProductVariantInfo, MediaImage} from "@/lib/types";

/** Queries **/
import {mutationProductSet, mutationFileUpdate} from "@/queries";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;

interface FileItem {
  id: string | null;
  alt?: string;
  color?: string;
  contentType: string;
}

interface ProductData {
  baseTitle?: string;
  title?: string;
  description?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  metafields?: Metafield[];
  variants: ProductVariantInfo[];
  media?: {
    edges: {
      node: MediaImage;
    }[];
  };
};

const updateImageAltText = async (
  mediaId: string | null, 
  color: string, 
  currentAltText: string
): Promise<Record<string, unknown> | null> => {
  
  if (!mediaId) return null;

  const newAltText = `${color} | ${currentAltText}`;
  
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": ACCESS_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: mutationFileUpdate(),
      variables: {
        input: {
          id: mediaId,
          alt: newAltText
        }
      }
    })
  });

  const data = await response.json();
  return data;
};

const createProductSet = async (productData: ProductData) => {
  /** Get product handle **/
  const productHandle = productData?.baseTitle?.replace(/\s+/g, '-');

  /** Get unique options and check if any variants have size or color **/
  const hasAnySize = productData.variants.some((v: ProductVariantInfo) => v.size);
  const hasAnyColor = productData.variants.some((v: ProductVariantInfo) => v.color);
  
  const sizeOptions = hasAnySize ? 
    [...new Set(productData.variants.map((v: ProductVariantInfo) => v.size))].filter(Boolean) : [];
  const colorOptions = hasAnyColor ? 
    [...new Set(productData.variants.map((v: ProductVariantInfo) => v.color))].filter(Boolean) : [];

  /** Get all unique images and update their alt text **/
  const mediaFromProduct = productData?.media?.edges?.map((media) => ({
    id: media?.node?.id,
    alt: media?.node?.alt,
    contentType: "IMAGE",
  })) || [];

  const variantImages = productData?.variants
    ?.filter((variant: ProductVariantInfo) => variant?.image)
    ?.map((variant: ProductVariantInfo) => ({
      id: variant?.image,
      alt: "",
      color: variant?.color,
      contentType: "IMAGE"
    })) || [];

  /** Combine and deduplicate images based on id **/
  const allFiles = [...mediaFromProduct, ...variantImages]
    .filter((file: FileItem, index: number, self: FileItem[]) => 
      index === self.findIndex((f: FileItem) => f.id === file.id)
    );

  /** Update alt text for all unique images **/
  await Promise.all(allFiles.map(async (file: FileItem) => {
    const matchingVariant = variantImages.find((v: FileItem) => v.id === file.id);
    if (matchingVariant?.color) {
      await updateImageAltText(file?.id, matchingVariant.color, file.alt || '');
    }
  }));

  /** Prepare tags array with new_merch_product tag **/
  const productTags = productData?.tags || [];
  const updatedTags = [...productTags, 'new_merch_product'];

  const productMetafields = productData?.metafields && productData?.metafields?.length > 0 ? 
    productData?.metafields?.filter((metafield: Metafield) => 
      metafield?.key !== "color" && metafield?.namespace !== "sku"
    )
  : [];

  const productSetInput = {
    synchronous: true,
    productSet: {
      title: productData?.baseTitle,
      descriptionHtml: productData?.description,
      handle: productHandle,
      productType: productData?.productType,
      status: "DRAFT",
      vendor: productData?.vendor,
      files: allFiles.length > 0 ? allFiles.map((file: FileItem) => ({
        id: file.id,
        alt: file.alt,
        contentType: "IMAGE"
      })) : null,
      productOptions: [
        ...(sizeOptions.length > 0 ? [{
          name: "Size",
          values: sizeOptions.map((size) => ({
            name: size,
          })),
        }] : []),
        ...(colorOptions.length > 0 ? [{
          name: "Color", 
          values: colorOptions.map((color) => ({
            name: color,
          })),
        }] : [])
      ],
      tags: updatedTags,
      metafields: productMetafields && productMetafields?.length > 0 ? 
        productMetafields?.map((metafield: Metafield) => ({
          namespace: metafield?.namespace,
          key: metafield?.key,
          value: metafield?.value,
          type: metafield?.type,
        }))
      : null,
      seo: {
        title: productData?.title,
        description: productData?.description,
      },
      variants: productData?.variants?.length > 0 ? 
        (() => {
          const processedCombos = new Set<string>();
          return productData.variants
            .map((variant: ProductVariantInfo) => {
              const updatedVariant = {...variant};
              
              if (hasAnySize && !updatedVariant?.size) {
                const variantsWithSameColor = productData.variants
                  .filter((v: ProductVariantInfo) => v.color === updatedVariant.color && v.size);
                if (variantsWithSameColor.length > 0) {
                  updatedVariant.size = variantsWithSameColor[0].size;
                } else {
                  return null;
                };
              };

              /** Create unique key for option combination **/
              const comboKey = `${updatedVariant.size || ''}-${updatedVariant.color || ''}`;
              if (processedCombos.has(comboKey)) {
                return null; /** Skip duplicate combinations **/
              }
              processedCombos.add(comboKey);
              
              return {
                file: updatedVariant?.image ? {
                  id: updatedVariant?.image,
                  alt: `${updatedVariant?.color || 'Default'} | `,
                  contentType: "IMAGE",
                } : null,
                barcode: updatedVariant?.barcode ?? null,
                compareAtPrice: updatedVariant?.compareAtPrice ?? null,
                price: updatedVariant?.price ?? null,
                taxable: updatedVariant?.taxable ?? true,
                inventoryItem: {
                  sku: updatedVariant?.sku,
                  requiresShipping: updatedVariant?.requiresShipping ?? false,
                  countryCodeOfOrigin: null,
                  harmonizedSystemCode: null,
                  measurement: {
                    weight: {
                      unit: updatedVariant.weightUnit || "POUNDS",
                      value: updatedVariant.weight || 0,
                    }
                  },
                },
                metafields: updatedVariant?.metafields && updatedVariant?.metafields?.length > 0 ? 
                  updatedVariant?.metafields?.filter((metafield: Metafield) => 
                    metafield.key !== "harmonized_system_code"
                  ).map((metafield: Metafield) => ({
                    namespace: metafield?.namespace,
                    key: metafield?.key,
                    value: metafield?.value,
                    type: metafield?.type,
                  }))
                : null,
                optionValues: [
                  ...(hasAnySize ? [{
                    optionName: "Size",
                    name: updatedVariant?.size,
                  }] : []),
                  ...(hasAnyColor ? [{
                    optionName: "Color",
                    name: updatedVariant?.color,
                  }] : []),
                ],
              }
            }).filter(Boolean)
        })() : [],
    }
  };

  const productSetRes = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": ACCESS_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: mutationProductSet(),
      variables: productSetInput,
    }),
  });

  if (!productSetRes.ok) {
    throw new Error(`Failed to fetch products: ${productSetRes.statusText}`);
  }

  const productCreateData = await productSetRes.json();

  if (productCreateData?.data?.productSet?.userErrors?.length > 0) {
    console.error("Product Creation Errors:", productCreateData.data.productSet.userErrors);
    throw new Error("Product Creation Failed: " + JSON.stringify(productCreateData.data.productSet.userErrors));
  };

  return {
    productSetInput,
    productSetData: productCreateData?.data?.productSet?.product,
    product: productData,
  };
};

export async function POST(request: Request) {
  try {
    const {productData} = await request.json();
    
    if (!productData) {
      return NextResponse.json({ error: "No product data provided" }, { status: 400 });
    }
    
    const result = await createProductSet(productData);
    
    return NextResponse.json({
      message: "Product successfully merged",
      productId: result?.productSetData?.id,
      title: productData?.baseTitle,
      result
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error merging product: ", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to merge product" 
    }, { status: 500 });
  }
}