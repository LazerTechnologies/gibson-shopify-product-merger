export const queryGetAllLifestyleProducts = () => {
  return `query GetLifestyleProducts($cursor: String) {
    products(first: 250, query: "vendor:Lifestyle", after: $cursor) {
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
          metafields(first: 65) {
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
                metafields(first: 30) {
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }`;
};