export const mutationProductVariantsBulkCreate = () => {
  return `mutation ProductVariantsCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        title
        sku
        price
        compareAtPrice
        barcode
        inventoryQuantity
        inventoryPolicy
        taxable
        position
        createdAt
        updatedAt
        displayName
        availableForSale
        selectedOptions {
          name
          value
        }
        metafields(first: 28) {
          nodes {
            id
            namespace
            key
            value
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }`;
};