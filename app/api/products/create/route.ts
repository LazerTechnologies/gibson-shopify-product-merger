import { NextResponse } from "next/server";

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const GRAPHQL_ENDPOINT = `https://${SHOP_NAME}/admin/api/2024-01/graphql.json`;

const CREATE_PRODUCT_MUTATION = `
  mutation createProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        description
        images {
          edges {
            node {
              id
              url
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_OPTION_MUTATION = `
  mutation createOptions(
    $productId: ID!, 
    $options: [OptionCreateInput!]!, 
  ) {
    productOptionsCreate(
      productId: $productId, 
      options: $options, 
    ) {
      userErrors {
        field
        message
        code
      }
      product {
        id
        variants(first: 10) {
          nodes {
            id
            title
            selectedOptions {
              name
              value
            }
          }
        }
        options {
          id
          name
          values
          position
          optionValues {
            id
            name
            hasVariants
          }
        }
      }
    }
  }
`;

const CREATE_VARIANTS_MUTATION = `
  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
        sku
        inventoryQuantity
        inventoryItem {
          id
          tracked
          unitCost {
            amount
            currencyCode
          }
        }
        selectedOptions {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_VARIANT_MUTATION = `
  mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant {
        id
        price
        sku
        inventoryQuantity
        inventoryItem {
          id
          tracked
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function POST(request: Request) {
  try {
    const { product, variants } = await request.json();
    console.log("Creating product:", product);

    // Step 1: Create base product
    const productResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CREATE_PRODUCT_MUTATION,
        variables: {
          input: product,
        },
      }),
    });

    const productResult = await productResponse.json();
    console.log("Product creation result:", productResult);

    if (
      productResult.errors ||
      productResult.data?.productCreate?.userErrors?.length > 0
    ) {
      return NextResponse.json(
        { error: "Failed to create product", details: productResult },
        { status: 400 }
      );
    }

    const productId = productResult.data.productCreate.product.id;

    console.log(
      "Creating options",
      JSON.stringify({
        productId,
        options: [
          {
            name: "Size",
            values: variants.variants.map((v: any) => ({
              name: v.options[0],
            })),
          },
        ],
      })
    );

    // Step 2: Create the size option
    const optionResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CREATE_OPTION_MUTATION,
        variables: {
          productId,
          options: [
            {
              name: "Size",
              values: variants.variants.map((v: any) => ({
                name: v.options[0],
              })),
            },
          ],
        },
      }),
    });

    const optionResult = await optionResponse.json();
    console.log("Option creation result:", JSON.stringify(optionResult));

    if (
      optionResult.errors ||
      optionResult.data?.productOptionsCreate?.userErrors?.length > 0
    ) {
      return NextResponse.json(
        {
          error: "Failed to create options",
          details:
            optionResult.data?.productOptionsCreate?.userErrors ||
            optionResult.errors,
        },
        { status: 400 }
      );
    }

    // After option creation and before creating other variants:
    // Update the auto-created variant
    const firstVariant =
      optionResult.data.productOptionsCreate.product.variants.nodes[0];
    const firstVariantData = variants.variants[0];

    const updateFirstVariantResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: UPDATE_VARIANT_MUTATION,
        variables: {
          input: {
            id: firstVariant.id,
            price: firstVariantData.price,
            sku: firstVariantData.sku,
            compareAtPrice: firstVariantData.compareAtPrice,
            barcode: firstVariantData.barcode,
            inventoryPolicy: firstVariantData.inventoryPolicy,
            taxable: firstVariantData.taxable,
            inventoryQuantities: firstVariantData.inventoryQuantities,
            imageSrc: firstVariantData.imageSrc,
          },
        },
      }),
    });

    const updateResult = await updateFirstVariantResponse.json();
    console.log(
      "Update first variant result:",
      JSON.stringify(updateResult, null, 2)
    );

    if (
      updateResult.errors ||
      updateResult.data?.productVariantUpdate?.userErrors?.length > 0
    ) {
      console.error("Failed to update first variant:", updateResult);
    }

    // Before creating variants, let's log the input
    console.log(
      "Creating variants with input:",
      JSON.stringify(
        {
          productId,
          variants: variants.variants.map((v: any) => ({
            size: v.options[0],
            sku: v.sku,
          })),
        },
        null,
        2
      )
    );

    // Step 3: Create variants, skipping the first one that was auto-created
    const variantsResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CREATE_VARIANTS_MUTATION,
        variables: {
          productId,
          variants: variants.variants.slice(1).map((v: any) => {
            // Skip the first variant
            const sizeOption =
              optionResult.data.productOptionsCreate.product.options[0];
            const sizeValue = sizeOption.optionValues.find(
              (val: any) => val.name === v.options[0]
            );

            console.log("Creating variant with option data:", {
              size: v.options[0],
              optionId: sizeOption.id,
              valueId: sizeValue?.id,
            });

            return {
              price: v.price,
              sku: v.sku,
              compareAtPrice: v.compareAtPrice,
              barcode: v.barcode,
              inventoryPolicy: v.inventoryPolicy,
              taxable: v.taxable,
              optionValues: [
                {
                  id: sizeValue?.id,
                  optionId: sizeOption.id,
                },
              ],
              inventoryQuantities: v.inventoryQuantities,
              imageSrc: v.imageSrc,
            };
          }),
        },
      }),
    });

    const variantsResult = await variantsResponse.json();
    console.log(
      "Full variants creation result:",
      JSON.stringify(variantsResult, null, 2)
    );

    if (
      variantsResult.errors ||
      variantsResult.data?.productVariantsBulkCreate?.userErrors?.length > 0
    ) {
      console.error("Variant creation failed with:", {
        errors: variantsResult.errors,
        userErrors: variantsResult.data?.productVariantsBulkCreate?.userErrors,
        input: {
          productId,
          variants: variants.variants.map((v: any) => ({
            size: v.options[0],
            sku: v.sku,
            optionValues: v.optionValues,
          })),
        },
        optionData: {
          sizeOption:
            optionResult.data.productOptionsCreate.product.options.find(
              (opt: any) => opt.name === "Size"
            ),
        },
      });

      return NextResponse.json(
        {
          error: "Failed to create variants",
          details: {
            graphqlErrors: variantsResult.errors,
            userErrors:
              variantsResult.data?.productVariantsBulkCreate?.userErrors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      product: productResult.data.productCreate.product,
      options: optionResult.data.productOptionsCreate.product.options,
      variants: variantsResult.data.productVariantsBulkCreate.productVariants,
    });
  } catch (error) {
    console.error("Error in create product handler:", error);
    return NextResponse.json(
      { error: "Failed to create product", details: error.message },
      { status: 500 }
    );
  }
}
