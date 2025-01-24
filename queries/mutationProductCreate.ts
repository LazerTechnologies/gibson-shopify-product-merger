export const mutationProductCreate = () => {
  return `mutation createProductMetafields($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        metafields(first: 40) {
          edges {
            node {
              id
              namespace
              key
              value
            }
          }
        }
      }
      userErrors {
        message
        field
      }
    }
  }`;
};