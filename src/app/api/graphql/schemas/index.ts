// src/app/api/graphql/schemas/index.ts

import clientSchema from './clientSchema';
import userSchema from './userSchema';
import productSchema from './productSchema';
import quotationSchema from './quotationSchema';
import invoiceSchema from './invoiceSchema';
import amcSchema from './amcSchema'; 

const rootSchema = `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`;

// 2. Add the user schema to the array
const typeDefs = [
  rootSchema, 
  clientSchema,
  userSchema,
  productSchema,
  quotationSchema,
  invoiceSchema,
  amcSchema,
];

export default typeDefs;