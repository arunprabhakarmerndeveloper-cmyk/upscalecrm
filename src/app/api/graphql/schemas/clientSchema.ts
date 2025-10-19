const clientSchema = `
  type Address {
    tag: String!
    address: String!
  }

  type CustomField {
    key: String!
    value: String!
  }

  # --- FIX: Added these basic types so the Client type can reference them ---
  type Quotation {
      id: ID!
      quotationId: String!
      createdAt: String!
      status: String!
      totalAmount: Float!
  }

  type Invoice {
      id: ID!
      invoiceId: String!
      issueDate: String
      installationDate: String
      status: String!
      totalAmount: Float!
  }

  type AMC {
      id: ID!
      amcId: String!
      startDate: String!
      endDate: String!
      status: String!
      productInstances: [ProductInstance!]
  }

  type ProductInstance {
      product: Product
  }

  type Product {
      name: String
  }
  # --- END OF FIX ---

  type Client {
    id: ID!
    name: String!
    contactPerson: String
    phone: String!
    email: String
    addresses: [Address!]
    customFields: [CustomField!]
    createdAt: String!
    updatedAt: String!
    # --- FIX: Added fields to fetch related documents ---
    quotations: [Quotation!]
    invoices: [Invoice!]
    amcs: [AMC!]
  }

  input AddressInput {
    tag: String!
    address: String!
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
    addresses: [AddressInput!]
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

