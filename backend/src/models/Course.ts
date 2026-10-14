import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  language: 'c' | 'cpp' | 'java' | 'python' | 'javascript';
  description: string;
  icon: string;
  totalLevels: number;
  topics: {
    beginner: string[];
    intermediate: string[];
    advanced: string[];
    expert: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      unique: true,
      trim: true,
    },
    language: {
      type: String,
      required: [true, 'Programming language is required'],
      enum: ['c', 'cpp', 'java', 'python', 'javascript'],
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'Code',
    },
    totalLevels: {
      type: Number,
      default: 4,
    },
    topics: {
      beginner: [{ type: String }],
      intermediate: [{ type: String }],
      advanced: [{ type: String }],
      expert: [{ type: String }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>('Course', courseSchema);
