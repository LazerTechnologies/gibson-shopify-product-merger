export const queryGetProductBySkuGetId = (sku: string) => {
  return `query GetProductBySkuGetId {
    products(first: 4, query: "sku:${sku}") {
      edges {
        node {
          id
          title
          description
          descriptionHtml
          productType
          vendor
          handle
          seo {
            title
            description
          }
          variants(first: 10) {
            edges {
              node {
                id
                metafields(first: 37) {
                  nodes {
                    namespace
                    key
                    value
                    type
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;
};