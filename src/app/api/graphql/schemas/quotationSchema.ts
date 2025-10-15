const quotationSchema = `
  # Re-using the Address type from the client schema
  # Note: GraphQL doesn't allow re-defining types, so we assume it exists.

  type ClientInfo {
    name: String!
    phone: String!
    email: String
    billingAddress: Address
    installationAddress: Address
  }

  type LineItem {
    product: Product
    description: String!
    quantity: Int!
    price: Float!
  }

  type QuotationVersion {
    version: Int!
    updatedAt: String!
    updatedBy: User
    reason: String
    totalAmount: Float!
    lineItems: [LineItem!]!
  }

  type CommercialTerm {
    title: String!
    content: String!
  }

  type Quotation {
    id: ID!
    quotationId: String!
    client: Client
    clientInfo: ClientInfo!
    status: String!
    lineItems: [LineItem!]!
    totalAmount: Float!
    validUntil: String
    commercialTerms: [CommercialTerm!]
    createdAt: String!
    editHistory: [QuotationVersion!]
  }

  input LineItemInput {
    productId: ID!
    description: String
    quantity: Int!
    price: Float
  }

  input ClientInfoInput {
    name: String!
    phone: String!
    email: String
    billingAddress: AddressInput
    installationAddress: AddressInput
  }

  input CommercialTermInput {
    title: String!
    content: String!
  }

  input CreateQuotationInput {
    clientId: ID
    clientInfo: ClientInfoInput
    lineItems: [LineItemInput!]!
    validUntil: String
    commercialTerms: [CommercialTermInput!]
  }
  
  input UpdateQuotationInput {
    lineItems: [LineItemInput!]!
    validUntil: String
    commercialTerms: [CommercialTermInput!]
    reason: String!
  }

  extend type Query {
    quotations: [Quotation!]
    quotation(id: ID!): Quotation
  }

  extend type Mutation {
    createQuotation(input: CreateQuotationInput!): Quotation!
    updateQuotation(id: ID!, input: UpdateQuotationInput!): Quotation!
    updateQuotationStatus(id: ID!, status: String!): Quotation!
    approveQuotation(quotationId: ID!): Quotation!
  }
`;

export default quotationSchema;