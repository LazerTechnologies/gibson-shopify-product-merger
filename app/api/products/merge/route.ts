import {NextResponse} from "next/server";

/** Types **/
import type {CombinedProduct, Metafield} from "@/lib/types/ShopifyData";

/** Queries **/
import {mutationProductSet} from "@/queries";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;

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
  let variantWithLeastOccurrences: any = null;
  
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

    console.log('Color with minimum variants:', minColor);

    if (minColor.color) {
      variantWithLeastOccurrences = product.productData.variants.find(v => v.color === minColor.color);
    }
  }

  /** Get all unique images **/
  const mediaFromProduct = product?.productData?.media?.edges?.map(media => ({
    id: media?.node?.id,
    alt: media?.node?.alt,
    contentType: "IMAGE",
  })) || [];

  const variantImages = product?.productData?.variants
    ?.filter(variant => variant?.featuredImage?.id)
    ?.map(variant => ({
      id: variant?.featuredImage?.id,
      alt: `${variant?.color || 'Default'} | ${variant?.featuredImage?.altText}`,
      contentType: "IMAGE"
    })) || [];

  /** Combine and deduplicate images based on id **/
  const allFiles = [...mediaFromProduct, ...variantImages]
    .filter((file, index, self) => 
      index === self.findIndex(f => f.id === file.id)
    );

  const productSetInput = {
    synchronous: true,
    productSet: {
      title: product?.productData?.baseTitle,
      descriptionHtml: product?.productData?.description,
      handle: productHandle,
      productType: product?.productData?.productType,
      status: "DRAFT",
      vendor: product?.productData?.vendor,
      files: allFiles.length > 0 ? allFiles : null,
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
        title: product?.productData?.title,
        description: product?.productData?.description,
      },
      variants: product?.productData?.variants?.length > 0 ? 
        /** Track processed option combinations to avoid duplicates **/
        (() => {
          const processedCombos = new Set();
          return product.productData.variants
            .map(variant => {
              let updatedVariant = {...variant};
              
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
  console.log("Product Create Response:", productCreateData);

  if (productCreateData?.data?.productCreate?.userErrors?.length > 0) {
    console.error("Product Creation Errors:", productCreateData.data.productCreate.userErrors);
    throw new Error("Product Creation Failed: " + JSON.stringify(productCreateData.data.productCreate.userErrors));
  }

  return {
    productSetInput,
    productCreateData,
    product: product?.productData,
  };
};

export async function POST(request: Request) {
  try {
    const {products}: {products: CombinedProduct[]} = await request.json();
    const mergedProductsResponse = await Promise.all(products.map(createProductSet));

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
  }
}