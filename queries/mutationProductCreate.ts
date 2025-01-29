export const mutationProductCreate = () => {
  return `mutation createProductMetafields($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        options(first: 99) {
          name
          values
          id
          optionValues {
            name
          }
        }
        media(first: 40) {
          edges {
            node {
              id
              preview {
                image {
                  url
                }
              }
            }
          }
        }
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