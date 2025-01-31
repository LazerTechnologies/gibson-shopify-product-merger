import {NextResponse} from "next/server";

/** Types **/
import type {
  CombinedProduct,
  Metafield,
  ProductOption,
  ProductCreateResponse,
  VariantCreateResponse,
} from "@/lib/types/ShopifyData";

/** Queries **/
import {
  mutationProductCreate,
  mutationProductVariantsBulkCreate,
  mutationProductVariantsBulkDelete,
} from "@/queries";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2025-01/graphql.json`;

const createShopifyProduct = async (product: CombinedProduct) => {
  /** Create The Product Handle - Remove White Space And Replace With A Dash **/
  const productHandle = product?.productData?.baseTitle?.replace(/\s+/g, '-');

  /** Get unique size and color options from variants **/
  const sizeOptions = [...new Set(product.productData.variants.map(v => v.size))].filter(Boolean);
  const colorOptions = [...new Set(product.productData.variants.map(v => v.color))].filter(Boolean);

  if (sizeOptions.length > 0) {
    sizeOptions.unshift("Default Title");
  } else if (colorOptions.length > 0) {
    colorOptions.unshift("Default Title");
  };

  /** Create The Product Input For The Product Create Mutation **/
  const productCreateInput = {
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

  const productCreateData = await productCreateResponse.json() as ProductCreateResponse;
  console.log("Product Create Response:", productCreateData);

  /** Check for user errors in product creation **/
  if (productCreateData?.data?.productCreate?.userErrors?.length > 0) {
    console.error("Product Creation Errors:", productCreateData.data.productCreate.userErrors);
    throw new Error("Product Creation Failed: " + JSON.stringify(productCreateData.data.productCreate.userErrors));
  };

  return productCreateData;
}

const createProductVariants = async (product: CombinedProduct, productCreateData: ProductCreateResponse) => {
  const productId = productCreateData?.data?.productCreate?.product?.id;

  /** Get the option IDs for Size and Color **/
  const sizeOptionId = productCreateData?.data?.productCreate?.product?.options?.find((option: ProductOption) => 
    option.name === "Size"
  )?.id;

  const colorOptionId = productCreateData?.data?.productCreate?.product?.options?.find((option: ProductOption) => 
    option.name === "Color"
  )?.id;

  const productVariantsToUpdate = product?.productData?.variants?.filter((variant) =>
    variant?.size || variant?.color !== ''
  );

  /** Create The Structure For The Bulk Variant Input **/
  const productVariantData = productVariantsToUpdate?.length > 0 ? 
    productVariantsToUpdate?.map(variant => ({
      barcode: variant?.barcode ?? null,
      compareAtPrice: variant?.compareAtPrice ?? null,
      price: variant?.price ?? null,
      taxable: variant?.taxable ?? true,
      inventoryItem: {
        sku: variant?.sku,
        requiresShipping: variant?.requiresShipping ?? false,
        countryCodeOfOrigin: variant?.countryOfOrigin ?? null,
        measurement: {
          weight: {
            unit: variant.weightUnit || "POUNDS",
            value: variant.weight || 0,
          }
        },
      },
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

  const productVariantInput = {
    productId: productId,
    variants: productVariantData,
  };

  console.log("Creating Product Variants");
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

  const variantCreateData = await productVariantCreateResponse.json() as VariantCreateResponse;
  console.log("Variant Create Response:", variantCreateData);

  return {variantCreateData, productVariantData};
};

const deleteDefaultTitleVariant = async (productId: string, variants: { id: string; title: string }[]) => {
  const defaultTitleVariant = variants.find(variant => variant.title.includes("Default Title"));
  
  if (defaultTitleVariant) {
    console.log("Deleting Default Title Variant");
    const deleteResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutationProductVariantsBulkDelete(),
        variables: {
          productId: productId,
          variantsIds: [defaultTitleVariant.id]
        },
      })
    });
    
    const deleteData = await deleteResponse.json();
    console.log("Default Title Variant Deleted:", deleteData);
    return deleteData;
  };
  return null;
};

/**
 * I ran into an issue when creating the variants, the first option being created was returning an error 
 * saying that this variant already exists. This is why we are creating the first option to be "Default Title".
 * After we create the variants, we will delete the "Default Title" variant. 
 */
export async function POST(request: Request) {
  try {
    const {products} = await request.json();

    const mergedProductsResponse = await Promise.all(products.map(async (product: CombinedProduct) => {
      const productCreateData = await createShopifyProduct(product);
      const {variantCreateData, productVariantData} = await createProductVariants(product, productCreateData);
      
      /** Check for user errors in variant creation **/
      if (variantCreateData?.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        console.error("Variant Creation Errors:", variantCreateData.data.productVariantsBulkCreate.userErrors);
        return {
          product: productCreateData?.data?.productCreate?.product,
          variants: variantCreateData?.data?.productVariantsBulkCreate?.productVariants,
          error: variantCreateData.data.productVariantsBulkCreate.userErrors,
          productVariantData: productVariantData,
        };
      };

      /** Delete the Default Title variant after successful variant creation **/
      const deleteResult = await deleteDefaultTitleVariant(
        productCreateData.data.productCreate.product.id,
        variantCreateData.data.productVariantsBulkCreate.productVariants
      );

      return {
        product: productCreateData?.data?.productCreate?.product,
        variants: variantCreateData?.data?.productVariantsBulkCreate?.productVariants,
        productCreateData: productCreateData,
        productVariantData: productVariantData,
        defaultTitleDeletion: deleteResult
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