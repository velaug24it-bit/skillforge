import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAssessmentLevel extends Document {
  courseId: mongoose.Types.ObjectId;
  language: string;
  levelNumber: number; // 1 to 6
  title: string;
  category: 'Beginner' | 'Elementary' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master' | string;
  description: string;
  topics: string[];
  passingScore: number;
  totalMarks?: number;
  assessmentType?: 'coding' | 'aptitude';
  negativeMarking?: number;
  marksPerQuestion?: number;
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
      max: 6,
    },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    topics: [{ type: String }],
    totalMarks: {
      type: Number,
      default: 100,
    },
    assessmentType: {
      type: String,
      enum: ['coding', 'aptitude'],
      default: 'coding',
    },
    negativeMarking: {
      type: Number,
      default: 0,
    },
    marksPerQuestion: {
      type: Number,
      default: 50,
    },
    passingScore: {
      type: Number,
      default: 100,
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