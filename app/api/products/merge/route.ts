import {NextResponse} from "next/server";
import fs from "fs/promises";
import path from "path";

/** Types **/
import type {CombinedProduct, Metafield} from "@/lib/types/ShopifyData";

/** Queries **/
import {mutationProductSet, mutationFileUpdate} from "@/queries";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;
const UPDATES_FILE_PATH = path.join(process.cwd(), "data", "product-updates.json");

const updateImageAltText = async (
  mediaId: string | null, 
  color: string, 
  currentAltText: string
) => {
  
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

const createProductSet = async (product: CombinedProduct) => {
  /** Get product handle **/
  const productHandle = product?.productData?.baseTitle?.replace(/\s+/g, '-');

  /** Get unique options and check if any variants have size or color **/
  const hasAnySize = product.productData.variants.some(v => v.size);
  const hasAnyColor = product.productData.variants.some(v => v.color);
  
  const sizeOptions = hasAnySize ? 
    [...new Set(product.productData.variants.map(v => v.size))].filter(Boolean) : [];
  const colorOptions = hasAnyColor ? 
    [...new Set(product.productData.variants.map(v => v.color))].filter(Boolean) : [];

  /** Analyze variant distribution by color and find variant with least occurrences **/
  let variantCountByColor: Record<string, number> = {};
  let variantWithLeastOccurrences = null;
  
  if (hasAnyColor) {
    variantCountByColor = product.productData.variants.reduce((acc: Record<string, number>, variant) => {
      const color = variant.color || 'No Color';
      acc[color] = (acc[color] || 0) + 1;
      return acc;
    }, {});

    console.log('Variant distribution by color:', variantCountByColor);

    /** Find color with minimum variants and its corresponding variant **/
    const minColor = Object.entries(variantCountByColor)
      .reduce<{color: string, count: number}>((min, [color, count]) => 
        count < min.count && color !== 'No Color' ? {color, count} : min,
        {color: '', count: Infinity}
      );

    if (minColor.color) {
      variantWithLeastOccurrences = product.productData.variants.find(v => v.color === minColor.color);
    }
  }

  /** Get all unique images and update their alt text **/
  const mediaFromProduct = product?.productData?.media?.edges?.map(media => ({
    id: media?.node?.id,
    alt: media?.node?.alt,
    contentType: "IMAGE",
  })) || [];

  const variantImages = product?.productData?.variants
    ?.filter(variant => variant?.featuredImage?.id)
    ?.map(variant => ({
      id: variant?.featuredImage?.id,
      alt: variant?.featuredImage?.altText,
      color: variant?.color,
      contentType: "IMAGE"
    })) || [];

  /** Combine and deduplicate images based on id **/
  const allFiles = [...mediaFromProduct, ...variantImages]
    .filter((file, index, self) => 
      index === self.findIndex(f => f.id === file.id)
    );

  /** Update alt text for all unique images **/
  await Promise.all(allFiles.map(async (file) => {
    const matchingVariant = variantImages.find(v => v.id === file.id);
    if (matchingVariant?.color) {
      await updateImageAltText(file?.id, matchingVariant.color, file.alt || '');
    }
  }));

  /** Prepare tags array with new_merch_product tag **/
  const productTags = product?.productData?.tags || [];
  const updatedTags = [...productTags, 'new_merch_product'];

  const productSetInput = {
    synchronous: true,
    productSet: {
      title: product?.productData?.baseTitle,
      descriptionHtml: product?.productData?.description,
      handle: productHandle,
      productType: product?.productData?.productType,
      status: "DRAFT",
      vendor: product?.productData?.vendor,
      files: allFiles.length > 0 ? allFiles.map(file => ({
        id: file.id,
        alt: file.alt,
        contentType: "IMAGE"
      })) : null,
      productOptions: [
        ...(sizeOptions.length > 0 ? [{
          name: "Size",
          values: sizeOptions?.map((size) => ({
            name: size,
          })),
        }] : []),
        ...(colorOptions.length > 0 ? [{
          name: "Color", 
          values: colorOptions?.map((color) => ({
            name: color,
          })),
        }] : [])
      ],
      tags: updatedTags,
      metafields: product?.productData?.metafields?.length > 0 ? 
        product?.productData?.metafields?.map((metafield: Metafield) => ({
          namespace: metafield?.namespace,
          key: metafield?.key,
          value: metafield?.value,
          type: metafield?.type,
        }))
      : null,
      seo: {
        title: product?.productData?.title,
        description: product?.productData?.description,
      },
      variants: product?.productData?.variants?.length > 0 ? 
        /** Track processed option combinations to avoid duplicates **/
        (() => {
          const processedCombos = new Set();
          return product.productData.variants
            .map(variant => {
              const updatedVariant = {...variant};
              
              if (hasAnySize && !updatedVariant?.size) {
                const variantsWithSameColor = product.productData.variants
                  .filter(v => v.color === updatedVariant.color && v.size);
                if (variantsWithSameColor.length > 0) {
                  updatedVariant.size = variantsWithSameColor[0].size;
                } else {
                  return null;
                }
              }
              
              if (hasAnyColor && (!updatedVariant?.color || updatedVariant.color === 'No Color') && variantWithLeastOccurrences) {
                updatedVariant.color = variantWithLeastOccurrences.color;
                if (!updatedVariant.featuredImage) {
                  updatedVariant.featuredImage = variantWithLeastOccurrences.featuredImage;
                }
              }

              /** Create unique key for option combination **/
              const comboKey = `${updatedVariant.size || ''}-${updatedVariant.color || ''}`;
              if (processedCombos.has(comboKey)) {
                return null; /** Skip duplicate combinations **/
              }
              processedCombos.add(comboKey);
              
              return {
                file: updatedVariant?.featuredImage?.id ? {
                  id: updatedVariant?.featuredImage?.id,
                  alt: `${updatedVariant?.color || 'Default'} | ${updatedVariant?.featuredImage?.altText}`,
                  contentType: "IMAGE",
                } : null,
                barcode: updatedVariant?.barcode ?? null,
                compareAtPrice: updatedVariant?.compareAtPrice ?? null,
                price: updatedVariant?.price ?? null,
                taxable: updatedVariant?.taxable ?? true,
                inventoryItem: {
                  sku: updatedVariant?.sku,
                  requiresShipping: updatedVariant?.requiresShipping ?? false,
                  countryCodeOfOrigin: updatedVariant?.countryOfOrigin ?? null,
                  harmonizedSystemCode: updatedVariant?.harmonizedSystemCode ?? null,
                  measurement: {
                    weight: {
                      unit: updatedVariant.weightUnit || "POUNDS",
                      value: updatedVariant.weight || 0,
                    }
                  },
                },
                metafields: updatedVariant?.metafields?.length > 0 ? 
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
    product: product?.productData,
  };
};

export async function POST(request: Request) {
  const updates = {
    successfulUpdates: [] as {productId: string, title: string}[],
    failedUpdates: [] as {title: string, error: string}[]
  };

  try {
    const {products}: {products: CombinedProduct[]} = await request.json();
    
    for (const product of products) {
      try {
        const result = await createProductSet(product);
        updates.successfulUpdates.push({
          productId: result?.productSetData?.id,
          title: product?.productData?.baseTitle
        });
      } catch (error) {
        updates.failedUpdates.push({
          title: product?.productData?.baseTitle,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    /** Save updates to file **/
    await fs.mkdir(path.dirname(UPDATES_FILE_PATH), {recursive: true});
    await fs.writeFile(
      UPDATES_FILE_PATH,
      JSON.stringify(updates, null, 2)
    );

    return NextResponse.json(
      {
        message: "Products Processing Complete",
        updates
      },
      {status: 200}
    );
  } catch (error) {
    console.error("Error processing products: ", error);
    return NextResponse.json({ error: `Error processing products: ${error}` }, { status: 500 });
  }
}