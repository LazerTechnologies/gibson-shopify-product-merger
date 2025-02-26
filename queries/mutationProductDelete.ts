export const mutationProductDelete = (
  productId: string,
) => {
  return `mutation {
    productDelete(input: {
      id: "${productId}"
    }) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }`;
};