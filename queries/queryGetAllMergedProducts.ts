export const queryGetAllMergedProducts = () => {
  return `query GetMergedProducts($cursor: String) {
    products(first: 49, query: "tag:new_merch_product", after: $cursor) {
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
                ... on Metaobject {
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
          variants(first: 99) {
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