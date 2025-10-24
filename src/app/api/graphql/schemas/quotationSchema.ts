
const quotationSchema = `
  type ClientInfo {
    name: String!
    phone: String
    email: String
    billingAddress: String
    installationAddress: String
  }

  type LineItem {
    productName: String!
    description: String
    quantity: Int!
    price: Float!
  }
  
  type CommercialTerm {
    title: String!
    content: String!
  }
  
  type QuotationVersion {
    version: Int!
    updatedAt: String!
    updatedBy: User
    reason: String
    
    # Snapshot fields for a complete historical record
    clientInfo: ClientInfo!
    lineItems: [LineItem!]!
    totalAmount: Float!
    taxPercentage: Float 
    grandTotal: Float!  
    validUntil: String
    commercialTerms: [CommercialTerm!]
    imageUrls: [String!]
  }

  type Quotation {
    id: ID!
    quotationId: String!
    client: Client
    clientInfo: ClientInfo!
    status: String!
    lineItems: [LineItem!]!
    totalAmount: Float!
    taxPercentage: Float
    grandTotal: Float!
    validUntil: String
    commercialTerms: [CommercialTerm!]
    createdAt: String!
    editHistory: [QuotationVersion!]
    imageUrls: [String!]
    associatedInvoices: [Invoice]
    associatedAMCs: [AMC]
  }

  input LineItemInput {
    productName: String!
    description: String
    quantity: Int!
    price: Float!
  }

  input CommercialTermInput {
    title: String!
    content: String!
  }
  
  input NewClientForQuotationInput {
    name: String!
    phone: String
    email: String
  }

  input ClientInfoInput {
    name: String!
    phone: String
    email: String
    billingAddress: String
    installationAddress: String
  }

  input CreateQuotationInput {
    clientId: ID
    newClient: NewClientForQuotationInput
    billingAddress: String!
    installationAddress: String!
    lineItems: [LineItemInput!]!
    validUntil: String
    commercialTerms: [CommercialTermInput!]
    imageUrls: [String!]
    taxPercentage: Float
  }
  
  input UpdateQuotationInput {
    clientInfo: ClientInfoInput
    lineItems: [LineItemInput!]!
    validUntil: String
    commercialTerms: [CommercialTermInput!]
    reason: String!
    totalAmount: Float!
    taxPercentage: Float
    grandTotal: Float!  
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
