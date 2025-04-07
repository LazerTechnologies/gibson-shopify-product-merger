export const queryGetAllNonMergedMerchProducts = (after: string | null) => {
  return `query GetLifestyleProducts {
    products(
      first: 99, 
      query: "tag:non_merged_merch_product", 
      after: ${after ? `"${after}"` : "null"}
    ) {
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
          media(first: 29) {
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
          metafields(first: 60) {
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
                metafields(first: 16) {
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