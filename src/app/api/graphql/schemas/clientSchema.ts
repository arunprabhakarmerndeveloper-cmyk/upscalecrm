const clientSchema = `
  type Address {
    tag: String!
    address: String!
  }

  type CustomField {
    key: String!
    value: String!
  }

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

  type AMCProduct {
    productName: String!
    serialNumber: String
    purchaseDate: String
  }

  type AMC {
      id: ID!
      amcId: String!
      startDate: String!
      endDate: String!
      status: String!
      productInstances: [AMCProduct!]
  }

  type Product {
      name: String
  }

  type Client {
    id: ID!
    name: String!
    contactPerson: String
    phone: String
    email: String
    addresses: [Address]
    customFields: [CustomField]
    createdAt: String!
    updatedAt: String!
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
    phone: String
    email: String
    addresses: [AddressInput!]
    customFields: [CustomFieldInput!]
  }

  extend type Query {
    clients: [Client!]
    client(id: ID!): Client 
    searchClients(term: String!): [Client!]
  }

  extend type Mutation {
    createClient(input: ClientInput!): Client!
    updateClient(id: ID!, input: ClientInput!): Client!
    deleteClient(id: ID!): Client
  }
`;

export default clientSchema;

