import Product from '@/models/Product';
import { GraphQLError } from 'graphql';
import { MyContext } from '../route';

// A helper function to transform a Mongoose document into a GraphQL-safe object
const transformProduct = (product: any) => {
    if (!product) return null;
    return {
        id: product._id.toString(),
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.price,
        type: product.type,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
    };
};

const productResolver = {
  Query: {
    products: async (_: unknown, { type }: { type?: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('Not authenticated');
      try {
        const filter = type ? { type } : {};
        const products = await Product.find(filter).sort({ createdAt: -1 });
        // --- THIS IS THE FIX: Transform every product in the array ---
        return products.map(transformProduct);
      } catch (error: any) {
        throw new GraphQLError(error.message);
      }
    },
    product: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      console.log(`--- BACKEND: productResolver received request for ID: ${id} ---`); // DEBUG LOG
      if (!context.user) {
        console.error("Authentication failed in productResolver: No user in context.");
        throw new GraphQLError('Not authenticated');
      }
      try {
        const product = await Product.findById(id);
        console.log("Product found in DB:", product ? 'Yes' : 'No'); // DEBUG LOG
        if (!product) {
          throw new Error('Product not found');
        }
        // --- THIS IS THE FIX: Transform the single product object before returning ---
        return transformProduct(product);
      } catch (error: any) {
        console.error("Error in product resolver:", error); // DEBUG LOG
        throw new GraphQLError(error.message);
      }
    },
  },
  Mutation: {
    // Your mutations are already correct, but we'll use the helper for consistency
    createProduct: async (_: unknown, { input }: { input: any }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.');
      try {
        const product = new Product(input);
        await product.save();
        return transformProduct(product);
      } catch (error: any) { throw new GraphQLError(error.message); }
    },
    updateProduct: async (_: unknown, { id, input }: { id: string, input: any }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.');
      try {
        const product = await Product.findByIdAndUpdate(id, input, { new: true });
        return transformProduct(product);
      } catch (error: any) { throw new GraphQLError(error.message); }
    },
    deleteProduct: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.');
      try {
        const product = await Product.findByIdAndDelete(id);
        return transformProduct(product);
      } catch (error: any) { throw new GraphQLError(error.message); }
    },
  },
};

export default productResolver;

