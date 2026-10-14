import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAssessmentLevel extends Document {
  courseId: mongoose.Types.ObjectId;
  language: string;
  levelNumber: number; // 1, 2, 3, 4
  title: string;
  category: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description: string;
  topics: string[];
  passingScore: number;
  durationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentLevelSchema = new Schema<IAssessmentLevel>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
      lowercase: true,
    },
    levelNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    topics: [{ type: String }],
    passingScore: {
      type: Number,
      default: 100, // 100/100 required
    },
    durationMinutes: {
      type: Number,
      default: 60,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for course and level number uniqueness
assessmentLevelSchema.index({ courseId: 1, levelNumber: 1 }, { unique: true });

export const AssessmentLevel: Model<IAssessmentLevel> =
  mongoose.models.AssessmentLevel || mongoose.model<IAssessmentLevel>('AssessmentLevel', assessmentLevelSchema);
