const productSchema = `
  type Product {
    id: ID!
    name: String!
    productId: String
    description: String
    price: Float!
    type: String!
    createdAt: String!
    updatedAt: String!
  }

  input ProductInput {
    name: String!
    productId: String 
    description: String
    price: Float!
    type: String!
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
