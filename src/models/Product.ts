import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  productId?: string;
  description?: string;
  price: number;
  type: 'product' | 'service';
}

const ProductSchema: Schema<IProduct> = new Schema({
  name: { type: String, required: true },
  productId: { type: String, unique: true, sparse: true }, 
  description: { type: String },
  price: { type: Number, required: true },
  type: {
    type: String,
    enum: ['product', 'service'],
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
