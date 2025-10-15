// src/app/api/graphql/schemas/clientSchema.ts
const clientSchema = `
  type Address {
    street: String
    city: String
    pincode: String
  }

  type CustomField {
    key: String!
    value: String!
  }

  type Client {
    id: ID!
    name: String!
    contactPerson: String
    phone: String!
    email: String
    billingAddress: Address
    installationAddress: Address
    customFields: [CustomField!]
    createdAt: String!
    updatedAt: String!
  }

  input AddressInput {
    street: String
    city: String
    pincode: String
  }

  input CustomFieldInput {
    key: String!
    value: String!
  }

  input ClientInput {
    name: String!
    contactPerson: String
    phone: String!
    email: String
    billingAddress: AddressInput
    installationAddress: AddressInput
    customFields: [CustomFieldInput!]
  }

  extend type Query {
    clients: [Client!]
    client(id: ID!): Client 
  }

  extend type Mutation {
    createClient(input: ClientInput!): Client!
    updateClient(id: ID!, input: ClientInput!): Client!
    deleteClient(id: ID!): Client
  }
`;

export default clientSchema;