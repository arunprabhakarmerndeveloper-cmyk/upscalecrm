// src/models/Product.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku?: string;
  description?: string;
  price: number;
  type: 'product' | 'service';
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true, sparse: true },
  description: { type: String },
  price: { type: Number, required: true },
  type: {
    type: String,
    enum: ['product', 'service'],
    required: true,
  },
}, {
  timestamps: true,
  // --- ADD THE FIX HERE ---
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);