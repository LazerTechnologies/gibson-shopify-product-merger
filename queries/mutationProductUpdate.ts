export const mutationProductUpdate = () => {
  return `mutation UpdateProductWithNewMedia($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        metafields(first: 42) {
          edges {
            node {
              key
              namespace
              value
              reference {
                ...on Metaobject {
                  fields {
                    key
                    value
                  }
                }
              }
            }
          }
        }
        seo {
          title
          description
        }
        variants(first: 29) {
          edges {
            node {
              ...on ProductVariant {
                id
                title
                metafields(first: 23) {
                  edges {
                    node {
                      key
                      namespace
                      value
                      reference {
                        ...on Metaobject {
                          fields {
                            key
                            value
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
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