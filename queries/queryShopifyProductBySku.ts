export const queryShopifyProductBySku = (sku: string) => {
  return `query getProductBySKU {
    products(first: 5, query: "sku:${sku}") {
      edges {
        node {
          id
          title
          vendor
          handle
          createdAt
          updatedAt
          publishedAt
          productType
          status
          description
          descriptionHtml
          tags
          seo {
            title
            description
          }
          featuredMedia {
            id
            alt
            preview {
              image {
                url
                altText
              }
            }
          }
          media(first: 60) {
            edges {
              node {
                ... on MediaImage {
                  id
                  mediaContentType
                  image {
                    id
                    url
                    width
                    height
                  }
                  alt
                }
              }
            }
          }
          metafields(first: 70) {
            nodes {
              namespace
              key
              value
              type
              reference {
                ...on Metaobject {
                  id
                  type
                  fields {
                    key
                    value
                    type
                  }
                }
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                sku
                price
                compareAtPrice
                inventoryQuantity
                barcode
                taxable
                inventoryItem {
                  countryCodeOfOrigin
                  harmonizedSystemCode
                  measurement {
                    weight {
                      value
                    }
                  }
                }
                metafields(first: 43) {
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