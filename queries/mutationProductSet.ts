export const mutationProductSet = () => {
  return `mutation createProductAsynchronous($productSet: ProductSetInput!, $synchronous: Boolean!) {
    productSet(synchronous: $synchronous, input: $productSet) {
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
        variants(first: 99) {
          nodes {
            id
            position
            title
          }
        }
      }
      productSetOperation {
        id
        status
        userErrors {
          code
          field
          message
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }`;
};