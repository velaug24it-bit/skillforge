import fs from 'fs';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Course, AssessmentLevel, AptitudeQuestion } from '../models';

export const seedAptitudeCourse = async (): Promise<void> => {
  console.log('[Seed Aptitude] Starting Aptitude Course & Questions Seeding...');

  try {
    await connectDatabase();

    const courseData = {
      name: 'Quantitative & Logical Aptitude',
      language: 'aptitude' as const,
      description:
        'Comprehensive 6-tier aptitude curriculum covering Arithmetic Fundamentals, Commercial Math, Logical Deduction, Puzzles, Verbal Proficiency, and Advanced Data Interpretation & Probability.',
      icon: 'BrainCircuit',
      totalLevels: 6,
      topics: {
        beginner: [
          'Percentages & Fractions',
          'Ratios & Proportions',
          'Averages & Weighted Means',
          'Divisibility, HCF & LCM',
          'Simple Interest',
        ],
        intermediate: [
          'Profit, Loss & Discounts',
          'Compound Interest & Depreciation',
          'Time & Work & Efficiency',
          'Pipes & Cisterns',
          'Speed, Time & Distance & Trains',
        ],
        advanced: [
          'Number & Letter Sequences',
          'Coding-Decoding & Analogies',
          'Blood Relations & Family Trees',
          'Direction Sense & Bearings',
          'Formal Syllogisms & Venn Logic',
        ],
        expert: [
          'Linear & Circular Seating',
          'Matrix Puzzles & Calendars',
          'Critical Reasoning & Assumptions',
          'Reading Comprehension & Grammar',
          'Permutations, Probability & DI',
        ],
      },
      isActive: true,
    };

    const course = await Course.findOneAndUpdate(
      { language: 'aptitude' },
      courseData,
      { upsert: true, new: true }
    );
    console.log(`[Seed Aptitude] Course upserted: ${course.name} (ID: ${course._id})`);

    const levelsInfo = [
      {
        levelNumber: 1,
        title: 'Level 1 — Arithmetic Fundamentals',
        category: 'Beginner',
        description: 'Foundations of numbers, fractions, percentages, ratios, averages, HCF/LCM, and simple interest.',
        topics: ['Percentages', 'Ratios & Proportions', 'Averages', 'Numbers & Divisibility', 'Simple Interest'],
      },
      {
        levelNumber: 2,
        title: 'Level 2 — Commercial Mathematics & Applied Arithmetic',
        category: 'Elementary',
        description: 'Applied arithmetic problems including profit and loss, compound interest, time & work, pipes, and speed-distance-trains.',
        topics: ['Profit & Loss', 'Compound Interest', 'Time & Work', 'Pipes & Cisterns', 'Speed, Time & Distance'],
      },
      {
        levelNumber: 3,
        title: 'Level 3 — Logical Deduction & Reasoning',
        category: 'Intermediate',
        description: 'Formal logical reasoning, coding-decoding, number/letter series, family relations, direction sense, and syllogisms.',
        topics: ['Number Series', 'Coding-Decoding', 'Blood Relations', 'Direction Sense', 'Syllogisms', 'Order & Ranking'],
      },
      {
        levelNumber: 4,
        title: 'Level 4 — Analytical Puzzles & Critical Logic',
        category: 'Advanced',
        description: 'Complex seating arrangements, calendar and clock analysis, critical reasoning assumptions, and deduction puzzles.',
        topics: ['Seating Arrangements', 'Clocks & Calendars', 'Critical Reasoning', 'Puzzles'],
      },
      {
        levelNumber: 5,
        title: 'Level 5 — Verbal Ability & English Comprehension',
        category: 'Expert',
        description: 'Advanced verbal aptitude, vocabulary synonyms/antonyms, sentence structure, grammatical error spotting, and reading comprehension.',
        topics: ['Synonyms & Antonyms', 'Sentence Correction', 'Idioms & Phrases', 'Para Jumbles', 'Reading Comprehension'],
      },
      {
        levelNumber: 6,
        title: 'Level 6 — Advanced Quantitative, Data Interpretation & Probability',
        category: 'Master',
        description: 'High-level combinatorics, probability theory, 2D/3D mensuration, data interpretation charts, tables, and mixtures & alligations.',
        topics: ['Permutations & Combinations', 'Probability', 'Mensuration', 'Data Interpretation', 'Mixtures & Alligations'],
      },
    ];

    const levelMap = new Map<number, any>();

    for (const lvl of levelsInfo) {
      const assessmentLevel = await AssessmentLevel.findOneAndUpdate(
        { courseId: course._id, levelNumber: lvl.levelNumber },
        {
          courseId: course._id,
          language: 'aptitude',
          levelNumber: lvl.levelNumber,
          title: lvl.title,
          category: lvl.category,
          description: lvl.description,
          topics: lvl.topics,
          totalMarks: 40,
          passingScore: 24,
          negativeMarking: 0.25,
          marksPerQuestion: 1.0,
          durationMinutes: 60,
          assessmentType: 'aptitude',
        },
        { upsert: true, new: true }
      );
      levelMap.set(lvl.levelNumber, assessmentLevel);
      console.log(`[Seed Aptitude] Level ${lvl.levelNumber} configured: ${lvl.title} (40 Marks, Pass: 24 Marks, -0.25 Negative)`);
    }

    // Load questions JSON
    const questionsFilePath = path.join(__dirname, '../data/aptitudeQuestions.json');
    if (!fs.existsSync(questionsFilePath)) {
      throw new Error(`Questions file not found at: ${questionsFilePath}`);
    }

    const rawQuestionsData = JSON.parse(fs.readFileSync(questionsFilePath, 'utf-8'));
    console.log(`[Seed Aptitude] Found ${rawQuestionsData.length} questions in JSON. Inserting into MongoDB...`);

    let insertedCount = 0;
    for (const qData of rawQuestionsData) {
      const targetLevel = levelMap.get(qData.levelNumber);
      if (!targetLevel) {
        throw new Error(`Target level not found for levelNumber: ${qData.levelNumber}`);
      }

      await AptitudeQuestion.findOneAndUpdate(
        {
          courseId: course._id,
          levelNumber: qData.levelNumber,
          questionNumber: qData.questionNumber,
        },
        {
          courseId: course._id,
          levelId: targetLevel._id,
          language: 'aptitude',
          levelNumber: qData.levelNumber,
          questionNumber: qData.questionNumber,
          questionText: qData.questionText,
          options: qData.options,
          correctOption: qData.correctOption,
          explanation: qData.explanation,
          topicTag: qData.topicTag,
          difficulty: qData.difficulty,
          marks: 1.0,
          negativeMarks: 0.25,
        },
        { upsert: true, new: true }
      );
      insertedCount++;
    }

    console.log(`[Seed Aptitude] Successfully seeded all ${insertedCount} questions across 6 levels!`);
  } catch (error: any) {
    console.error(`[Seed Aptitude] Error: ${error.message}`);
    throw error;
  } finally {
    await disconnectDatabase();
  }
};

// Allow direct CLI execution
if (require.main === module) {
  seedAptitudeCourse()
    .then(() => {
      console.log('[Seed Aptitude] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Aptitude] Failed:', err);
      process.exit(1);
    });
}
