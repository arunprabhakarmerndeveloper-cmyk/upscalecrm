const quotationSchema = `
  type ClientInfo {
    name: String!
    phone: String!
    email: String
    billingAddress: String
    installationAddress: String
  }

  type LineItem {
    product: Product
    description: String
    quantity: Int!
    price: Float!
  }

  type QuotationVersion {
    version: Int!
    updatedAt: String!
    updatedBy: User
    reason: String
    totalAmount: Float!
    lineItems: [LineItem!]
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
    associatedInvoices: [Invoice!]
    associatedAMCs: [AMC!]
    imageUrls: [String!]
  }

  input LineItemInput {
    productId: ID!
    description: String
    quantity: Int!
    price: Float
  }

  input CommercialTermInput {
    title: String!
    content: String!
  }

  input CreateQuotationInput {
    clientId: ID!
    billingAddress: String!
    installationAddress: String!
    lineItems: [LineItemInput!]!
    validUntil: String
    commercialTerms: [CommercialTermInput!]
    imageUrls: [String!]
  }
  
  input UpdateQuotationInput {
    lineItems: [LineItemInput!]!
    validUntil: String
    commercialTerms: [CommercialTermInput!]
    reason: String!
    totalAmount: Float!
    imageUrls: [String!]
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

