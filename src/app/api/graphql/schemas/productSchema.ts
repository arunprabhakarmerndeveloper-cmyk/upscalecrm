const productSchema = `
  type Product {
    id: ID!
    name: String!
    sku: String
    description: String
    price: Float!
    type: String! # Will be 'product' or 'service'
    createdAt: String!
    updatedAt: String!
  }

  input ProductInput {
    name: String!
    sku: String
    description: String
    price: Float!
    type: String! # Must be 'product' or 'service'
  }

  extend type Query {
    products(type: String): [Product!]
    product(id: ID!): Product
  }

  extend type Mutation {
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
    deleteProduct(id: ID!): Product
  }
`;

export default productSchema;
