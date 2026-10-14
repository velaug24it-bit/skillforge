import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  marks?: number;
  explanation?: string;
}

export interface ICodingQuestion extends Document {
  courseId: mongoose.Types.ObjectId;
  levelId: mongoose.Types.ObjectId;
  language: string;
  levelNumber: number;
  questionNumber: number; // 1 or 2
  title: string;
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleTestCase: ITestCase;
  mainTestCases: ITestCase[]; // Exactly 5 test cases, each 10 marks
  referenceSolution: string;
  starterCode: Record<string, string>;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  topicTags: string[];
  timeLimitMs: number;
  memoryLimitKb: number;
  marks: number;
  createdAt: Date;
  updatedAt: Date;
}

const testCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    marks: { type: Number, default: 10 },
    explanation: { type: String },
  },
  { _id: false }
);

const codingQuestionSchema = new Schema<ICodingQuestion>(
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
      required: true,
      lowercase: true,
    },
    levelNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    questionNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    problemStatement: {
      type: String,
      required: true,
    },
    inputFormat: {
      type: String,
      required: true,
    },
    outputFormat: {
      type: String,
      required: true,
    },
    constraints: {
      type: String,
      required: true,
    },
    sampleTestCase: {
      type: testCaseSchema,
      required: true,
    },
    mainTestCases: {
      type: [testCaseSchema],
      required: true,
      validate: [
        (val: ITestCase[]) => val.length === 5,
        'Question must have exactly 5 main test cases',
      ],
    },
    referenceSolution: {
      type: String,
      required: true,
    },
    starterCode: {
      type: Map,
      of: String,
      default: {},
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      required: true,
    },
    topicTags: [{ type: String }],
    timeLimitMs: {
      type: Number,
      default: 2000,
    },
    memoryLimitKb: {
      type: Number,
      default: 128000,
    },
    marks: {
      type: Number,
      default: 50, // 50 marks per question
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for course, level and question number
codingQuestionSchema.index({ courseId: 1, levelNumber: 1, questionNumber: 1 }, { unique: true });

export const CodingQuestion: Model<ICodingQuestion> =
  mongoose.models.CodingQuestion || mongoose.model<ICodingQuestion>('CodingQuestion', codingQuestionSchema);
