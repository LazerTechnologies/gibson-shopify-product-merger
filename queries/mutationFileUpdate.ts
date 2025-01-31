export const mutationFileUpdate = () => {
  return `mutation FileUpdate($input: [FileUpdateInput!]!) {
    fileUpdate(files: $input) {
      userErrors {
        code
        field
        message
      }
      files {
        alt
      }
    }
  }`;
};