// src/app/api/graphql/resolvers/index.ts

import merge from 'lodash.merge';
import clientResolver from './clientResolver';
import userResolver from './userResolver';
import productResolver from './productResolver';
import quotationResolver from './quotationResolver';
import invoiceResolver from './invoiceResolver';
import amcResolver from './amcResolver';

// 2. Add the user resolver to the merge function
const resolvers = merge(
  {}, 
  clientResolver,
  userResolver,
  productResolver,
  quotationResolver,
  invoiceResolver,
  amcResolver,
);

export default resolvers;