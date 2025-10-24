const amcSchema = `
  type AMCProduct {
    productName: String!
    description: String
    quantity: Int
    price: Float
    serialNumber: String
    purchaseDate: String
  }

  input ClientInfoInput {
    name: String!
    phone: String
    email: String
    billingAddress: String
    installationAddress: String
  }

  type ServiceVisit {
    scheduledDate: String!
    completedDate: String
    status: String!
    notes: String
  }

  type AMC {
    id: ID!
    amcId: String!
    client: Client
    clientInfo: ClientInfo!
    productInstances: [AMCProduct!]! 
    startDate: String!
    endDate: String!
    contractAmount: Float!
    taxPercentage: Float
    frequencyPerYear: Int!
    serviceVisits: [ServiceVisit!]!
    status: String!
    createdBy: User
    createdAt: String!
    originatingInvoice: Invoice
    commercialTerms: String
  }

  input AMCProductInput {
    productName: String!
    description: String
    quantity: Int
    price: Float
    serialNumber: String
    purchaseDate: String
  }

  input ServiceVisitInput {
    scheduledDate: String!
  }

  input NewClientForAMCInput {
    name: String!
    phone: String
    email: String
  }

  input CreateAMCInput {
    clientId: ID 
    newClient: NewClientForAMCInput
    productInstances: [AMCProductInput!]!
    startDate: String!
    endDate: String!
    contractAmount: Float!
    taxPercentage: Float
    frequencyPerYear: Int!
    serviceVisits: [ServiceVisitInput!]!
    billingAddress: String!
    installationAddress: String!
    commercialTerms: String
    originatingInvoiceId: ID
  }

  input UpdateAMCInput {
    clientInfo: ClientInfoInput # ADDED
    startDate: String
    endDate: String
    contractAmount: Float
    taxPercentage: Float
    frequencyPerYear: Int
    status: String
    productInstances: [AMCProductInput!]
    commercialTerms: String
    serviceVisits: [ServiceVisitInput!]
  }

  extend type Query {
    amcs: [AMC!]
    amc(id: ID!): AMC
  }

  extend type Mutation {
    createAMC(input: CreateAMCInput!): AMC!
    updateAMC(id: ID!, input: UpdateAMCInput!): AMC!
    deleteAMC(id: ID!): AMC
    updateAmcServiceStatus(amcId: ID!, visitIndex: Int!, status: String!, completedDate: String): AMC
  }
`;

export default amcSchema;