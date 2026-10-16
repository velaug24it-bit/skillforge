import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAptitudeOption {
  key: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface IAptitudeQuestion extends Document {
  courseId: mongoose.Types.ObjectId;
  levelId: mongoose.Types.ObjectId;
  language: string; // 'aptitude'
  levelNumber: number; // 1 to 6
  questionNumber: number; // 1 to 40
  questionText: string;
  options: IAptitudeOption[];
  correctOption: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  topicTag: string;
  difficulty: 'Beginner' | 'Elementary' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master' | string;
  marks: number; // default 1.0
  negativeMarks: number; // default 0.25
  createdAt: Date;
  updatedAt: Date;
}

const aptitudeOptionSchema = new Schema<IAptitudeOption>(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const aptitudeQuestionSchema = new Schema<IAptitudeQuestion>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    levelId: {
      type: Schema.Types.ObjectId,
      ref: 'AssessmentLevel',
      required: true,
      index: true,
    },
    language: {
      type: String,
      default: 'aptitude',
      lowercase: true,
    },
    levelNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    questionNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [aptitudeOptionSchema],
      required: true,
      validate: [
        (val: IAptitudeOption[]) => val.length === 4,
        'Question must have exactly 4 options (A, B, C, D)',
      ],
    },
    correctOption: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
    explanation: {
      type: String,
      required: true,
    },
    topicTag: {
      type: String,
      default: 'General Aptitude',
    },
    difficulty: {
      type: String,
      default: 'Intermediate',
    },
    marks: {
      type: Number,
      default: 1.0,
    },
    negativeMarks: {
      type: Number,
      default: 0.25,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index for course, level and question number
aptitudeQuestionSchema.index({ courseId: 1, levelNumber: 1, questionNumber: 1 }, { unique: true });

export const AptitudeQuestion: Model<IAptitudeQuestion> =
  mongoose.models.AptitudeQuestion ||
  mongoose.model<IAptitudeQuestion>('AptitudeQuestion', aptitudeQuestionSchema);