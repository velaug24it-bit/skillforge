import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStudentProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  language: string;
  currentUnlockedLevel: number; // 1 to 6
  completedLevels: number[]; // Array of completed levels e.g. [1, 2]
  highestScores: Map<string, number>; // levelNumber -> score
  totalAttempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentProgressSchema = new Schema<IStudentProgress>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    currentUnlockedLevel: {
      type: Number,
      default: 1, // Everyone starts at Level 1
      min: 1,
      max: 6,
    },
    completedLevels: {
      type: [Number],
      default: [],
    },
    highestScores: {
      type: Map,
      of: Number,
      default: {},
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Unique student per course progress record
studentProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export const StudentProgress: Model<IStudentProgress> =
  mongoose.models.StudentProgress ||
  mongoose.model<IStudentProgress>('StudentProgress', studentProgressSchema);