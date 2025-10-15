// src/models/Counter.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
  _id: string;
  seq: number;
}

const CounterSchema: Schema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

// Helper function to get the next number
export async function getNextSequenceValue(sequenceName: string): Promise<string> {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true } // Create the document if it doesn't exist
  );
  // Format the number to be at least 3 digits long (e.g., 1 -> 001)
  return sequenceDocument.seq.toString().padStart(3, '0');
}