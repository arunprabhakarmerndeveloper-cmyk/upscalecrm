import { Document, Types } from "mongoose";
import Product, { IProduct } from "@/models/Product";
import { GraphQLError } from "graphql";
import { MyContext } from "../route";

// --- TypeScript Interfaces & Types ---

type ProductType = "product" | "service";

// Describes the structure of a Mongoose Product document
interface ProductDocument extends IProduct, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Describes the input for the createProduct mutation
interface ProductInput {
  name: string;
  price: number;
  type: ProductType;
  productId?: string;
  description?: string;
}

type UpdateProductInput = Partial<ProductInput>;

// --- Helper Function ---

const transformProduct = (
  product:
    | (IProduct & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date })
    | null
) => {
  if (!product) return null;
  return {
    id: product._id.toString(),
    name: product.name,
    productId: product.productId,
    description: product.description,
    price: product.price,
    type: product.type,
    createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: product.updatedAt?.toISOString() || new Date().toISOString(),
  };
};

// --- Resolver Map ---

const productResolver = {
  Query: {
    products: async (
      _: unknown,
      { type }: { type?: ProductType },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      try {
        const filter = type ? { type } : {};

        // Use .lean() to get plain JS objects, then cast to ProductDocument[]
        const products = (await Product.find(filter)
          .sort({ createdAt: -1 })
          .lean()) as unknown as ProductDocument[];

        return products.map(transformProduct);
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError(
          "An unknown error occurred while fetching products."
        );
      }
    },
    product: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      try {
        const product = (await Product.findById(id)) as ProductDocument | null;
        if (!product) {
          throw new Error("Product not found");
        }
        return transformProduct(product);
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError(
          "An unknown error occurred while fetching the product."
        );
      }
    },

    searchProducts: async (_: unknown, { term }: { term: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      
      const searchRegex = new RegExp(term, 'i');
      return await Product.find({ name: searchRegex }).limit(10);
    },
  },
  Mutation: {
    createProduct: async (
      _: unknown,
      { input }: { input: ProductInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("You must be logged in.");
      try {
        const product = new Product(input);
        await product.save();

        // Cast only the _id type safely
        const productObj = product.toObject() as IProduct & {
          _id: Types.ObjectId;
          createdAt?: Date;
          updatedAt?: Date;
        };

        return transformProduct(productObj);
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError(
          "An unknown error occurred while creating the product."
        );
      }
    },
    updateProduct: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateProductInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("You must be logged in.");
      try {
        const product = (await Product.findByIdAndUpdate(id, input, {
          new: true,
        })) as ProductDocument | null;
        return transformProduct(product);
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError(
          "An unknown error occurred while updating the product."
        );
      }
    },
    deleteProduct: async (
      _: unknown,
      { id }: { id: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("You must be logged in.");
      try {
        const product = (await Product.findByIdAndDelete(
          id
        )) as ProductDocument | null;
        return transformProduct(product);
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError(
          "An unknown error occurred while deleting the product."
        );
      }
    },
  },
};

export default productResolver;
