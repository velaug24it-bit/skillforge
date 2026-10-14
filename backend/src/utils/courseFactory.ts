import { Course, AssessmentLevel, CodingQuestion } from '../models';

interface CreateCourseInput {
  name: string;
  language: 'c' | 'cpp' | 'java' | 'python' | 'javascript';
  description: string;
  icon?: string;
  topics?: {
    beginner?: string[];
    intermediate?: string[];
    advanced?: string[];
    expert?: string[];
  };
}

export const createFullCourseHierarchy = async (input: CreateCourseInput) => {
  const { name, language, description, icon = 'Code', topics } = input;

  const defaultTopics = {
    beginner: topics?.beginner?.length
      ? topics.beginner
      : ['Variables & Data Types', 'Conditionals & Loops', 'Basic I/O', 'Functions'],
    intermediate: topics?.intermediate?.length
      ? topics.intermediate
      : ['Arrays & Matrices', 'Strings & Pointers', 'Recursion', 'Searching & Sorting'],
    advanced: topics?.advanced?.length
      ? topics.advanced
      : ['Data Structures (Stacks, Queues, Trees)', 'Algorithm Complexity', 'Two-pointer & Sliding Window'],
    expert: topics?.expert?.length
      ? topics.expert
      : ['Dynamic Programming', 'Graph Algorithms', 'Memory & System Design', 'High-performance Optimization'],
  };

  // 1. Create Course
  const course = await Course.create({
    name,
    language,
    description,
    icon,
    totalLevels: 4,
    topics: defaultTopics,
    isActive: true,
  });

  // 2. Create 4 Assessment Levels
  const levelConfigs = [
    {
      levelNumber: 1,
      title: 'Level 1: Core Fundamentals & Control Flow',
      category: 'Beginner' as const,
      description: `Basic syntax, elementary operations, and control structures in ${language.toUpperCase()}.`,
      topics: defaultTopics.beginner,
    },
    {
      levelNumber: 2,
      title: 'Level 2: Data Structures & Algorithms Foundation',
      category: 'Intermediate' as const,
      description: `Linear structures, searching, sorting, and state manipulation in ${language.toUpperCase()}.`,
      topics: defaultTopics.intermediate,
    },
    {
      levelNumber: 3,
      title: 'Level 3: Advanced Problem Solving & Complexity',
      category: 'Advanced' as const,
      description: `Optimal algorithms, trees, stacks, and complex reasoning in ${language.toUpperCase()}.`,
      topics: defaultTopics.advanced,
    },
    {
      levelNumber: 4,
      title: 'Level 4: Mastery, System Design & Performance',
      category: 'Expert' as const,
      description: `Dynamic programming, graph theory, and high-performance engineering in ${language.toUpperCase()}.`,
      topics: defaultTopics.expert,
    },
  ];

  const createdLevels = [];

  for (const cfg of levelConfigs) {
    const levelDoc = await AssessmentLevel.create({
      courseId: course._id,
      language: course.language,
      levelNumber: cfg.levelNumber,
      title: cfg.title,
      category: cfg.category,
      description: cfg.description,
      topics: cfg.topics,
      passingScore: 100,
      durationMinutes: 60,
    });
    createdLevels.push(levelDoc);

    // 3. Create 2 Coding Questions for this level
    await createQuestionsForLevel(course, levelDoc, cfg.levelNumber);
  }

  return { course, levels: createdLevels };
};

async function createQuestionsForLevel(course: any, level: any, levelNumber: number) {
  const lang = course.language;

  // Level 1: Basic Math & String
  if (levelNumber === 1) {
    // Q1: Sum of Two Numbers
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 1,
      questionNumber: 1,
      title: 'Sum of Two Numbers',
      problemStatement: 'Read two integers A and B separated by space. Calculate and output their sum.',
      inputFormat: 'A single line containing two space-separated integers A and B.',
      outputFormat: 'Print the sum of A and B.',
      constraints: '-10^6 <= A, B <= 10^6',
      sampleTestCase: {
        input: '15 25',
        expectedOutput: '40',
        explanation: '15 + 25 = 40',
      },
      mainTestCases: [
        { input: '3 7', expectedOutput: '10', marks: 10 },
        { input: '-10 20', expectedOutput: '10', marks: 10 },
        { input: '0 0', expectedOutput: '0', marks: 10 },
        { input: '1000 -500', expectedOutput: '500', marks: 10 },
        { input: '999999 1', expectedOutput: '1000000', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'sum'),
      starterCode: {
        [lang]: getStarterCode(lang, 'sum_skeleton'),
      },
      difficulty: 'Beginner',
      topicTags: ['Math', 'Basic I/O'],
      timeLimitMs: 2000,
      memoryLimitKb: 65536,
      marks: 50,
    });

    // Q2: Even or Odd
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 1,
      questionNumber: 2,
      title: 'Even or Odd Number',
      problemStatement: 'Given an integer N, determine if it is Even or Odd.',
      inputFormat: 'A single integer N.',
      outputFormat: 'Print "EVEN" if N is even, or "ODD" if N is odd (without quotes).',
      constraints: '-10^9 <= N <= 10^9',
      sampleTestCase: {
        input: '4',
        expectedOutput: 'EVEN',
        explanation: '4 is divisible by 2.',
      },
      mainTestCases: [
        { input: '10', expectedOutput: 'EVEN', marks: 10 },
        { input: '7', expectedOutput: 'ODD', marks: 10 },
        { input: '0', expectedOutput: 'EVEN', marks: 10 },
        { input: '-3', expectedOutput: 'ODD', marks: 10 },
        { input: '1000000000', expectedOutput: 'EVEN', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'even_odd'),
      starterCode: {
        [lang]: getStarterCode(lang, 'even_odd_skeleton'),
      },
      difficulty: 'Beginner',
      topicTags: ['Conditionals', 'Operators'],
      timeLimitMs: 2000,
      memoryLimitKb: 65536,
      marks: 50,
    });
  } else if (levelNumber === 2) {
    // Q1: Array Maximum
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 2,
      questionNumber: 1,
      title: 'Find Maximum in Array',
      problemStatement: 'Given an integer N followed by N space-separated integers, find the maximum element.',
      inputFormat: 'First line contains integer N. Second line contains N integers.',
      outputFormat: 'Print the maximum integer found in the array.',
      constraints: '1 <= N <= 1000',
      sampleTestCase: {
        input: '5\n1 9 3 7 4',
        expectedOutput: '9',
        explanation: '9 is the largest element.',
      },
      mainTestCases: [
        { input: '4\n5 2 8 1', expectedOutput: '8', marks: 10 },
        { input: '3\n-5 -2 -9', expectedOutput: '-2', marks: 10 },
        { input: '1\n42', expectedOutput: '42', marks: 10 },
        { input: '5\n10 20 30 40 50', expectedOutput: '50', marks: 10 },
        { input: '6\n100 10 99 100 2 0', expectedOutput: '100', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'max_array'),
      starterCode: {
        [lang]: getStarterCode(lang, 'max_array_skeleton'),
      },
      difficulty: 'Intermediate',
      topicTags: ['Arrays', 'Loops'],
      timeLimitMs: 2000,
      memoryLimitKb: 65536,
      marks: 50,
    });

    // Q2: Reverse String
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 2,
      questionNumber: 2,
      title: 'Reverse String',
      problemStatement: 'Given a non-empty string S, output its reverse.',
      inputFormat: 'A single string S without whitespace.',
      outputFormat: 'Print the reversed string.',
      constraints: '1 <= |S| <= 1000',
      sampleTestCase: {
        input: 'skillforge',
        expectedOutput: 'egrofliks',
        explanation: 'Reversing "skillforge" gives "egrofliks".',
      },
      mainTestCases: [
        { input: 'hello', expectedOutput: 'olleh', marks: 10 },
        { input: 'racecar', expectedOutput: 'racecar', marks: 10 },
        { input: 'a', expectedOutput: 'a', marks: 10 },
        { input: 'programming', expectedOutput: 'gnimmargorp', marks: 10 },
        { input: '12345', expectedOutput: '54321', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'reverse_str'),
      starterCode: {
        [lang]: getStarterCode(lang, 'reverse_str_skeleton'),
      },
      difficulty: 'Intermediate',
      topicTags: ['Strings', 'Pointers'],
      timeLimitMs: 2000,
      memoryLimitKb: 65536,
      marks: 50,
    });
  } else if (levelNumber === 3) {
    // Q1: Two Sum Target
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 3,
      questionNumber: 1,
      title: 'Two Sum Target Indices',
      problemStatement: 'Given N, a target sum T, and an array of N integers, find 0-based indices of two numbers that add up to T. Print indices separated by a space in ascending order.',
      inputFormat: 'Line 1: N and T.\nLine 2: N space-separated integers.',
      outputFormat: 'Two space-separated indices i j (i < j).',
      constraints: '2 <= N <= 10^4',
      sampleTestCase: {
        input: '4 9\n2 7 11 15',
        expectedOutput: '0 1',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9.',
      },
      mainTestCases: [
        { input: '3 6\n3 2 4', expectedOutput: '1 2', marks: 10 },
        { input: '2 6\n3 3', expectedOutput: '0 1', marks: 10 },
        { input: '4 10\n1 2 8 9', expectedOutput: '0 3', marks: 10 },
        { input: '5 0\n-5 1 2 4 5', expectedOutput: '0 4', marks: 10 },
        { input: '4 8\n4 2 6 4', expectedOutput: '0 3', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'two_sum'),
      starterCode: {
        [lang]: getStarterCode(lang, 'two_sum_skeleton'),
      },
      difficulty: 'Advanced',
      topicTags: ['Hashing', 'Two Pointers'],
      timeLimitMs: 2000,
      memoryLimitKb: 65536,
      marks: 50,
    });

    // Q2: Balanced Parentheses
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 3,
      questionNumber: 2,
      title: 'Valid Parentheses',
      problemStatement: 'Given a string containing only parentheses "()[]{}", determine if the input string is valid. Output YES or NO.',
      inputFormat: 'A single string S.',
      outputFormat: 'Print "YES" if valid, otherwise "NO".',
      constraints: '1 <= |S| <= 1000',
      sampleTestCase: {
        input: '()[]{}',
        expectedOutput: 'YES',
        explanation: 'All brackets close in proper order.',
      },
      mainTestCases: [
        { input: '()', expectedOutput: 'YES', marks: 10 },
        { input: '(]', expectedOutput: 'NO', marks: 10 },
        { input: '([{}])', expectedOutput: 'YES', marks: 10 },
        { input: '((()', expectedOutput: 'NO', marks: 10 },
        { input: '{[]()}', expectedOutput: 'YES', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'parentheses'),
      starterCode: {
        [lang]: getStarterCode(lang, 'parentheses_skeleton'),
      },
      difficulty: 'Advanced',
      topicTags: ['Stack', 'Parsing'],
      timeLimitMs: 2000,
      memoryLimitKb: 65536,
      marks: 50,
    });
  } else {
    // Level 4: Expert
    // Q1: Longest Consecutive Sequence
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 4,
      questionNumber: 1,
      title: 'Longest Consecutive Elements Sequence',
      problemStatement: 'Given an unsorted array of N integers, find the length of the longest consecutive elements sequence in O(N) complexity.',
      inputFormat: 'Line 1: integer N.\nLine 2: N space-separated integers.',
      outputFormat: 'Print the length of the longest consecutive elements sequence.',
      constraints: '0 <= N <= 10^5',
      sampleTestCase: {
        input: '6\n100 4 200 1 3 2',
        expectedOutput: '4',
        explanation: 'The consecutive sequence is [1, 2, 3, 4], length is 4.',
      },
      mainTestCases: [
        { input: '10\n0 3 7 2 5 8 4 6 0 1', expectedOutput: '9', marks: 10 },
        { input: '5\n1 2 3 4 5', expectedOutput: '5', marks: 10 },
        { input: '1\n99', expectedOutput: '1', marks: 10 },
        { input: '4\n10 20 30 40', expectedOutput: '1', marks: 10 },
        { input: '7\n9 1 4 7 3 -1 0', expectedOutput: '3', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'consecutive'),
      starterCode: {
        [lang]: getStarterCode(lang, 'consecutive_skeleton'),
      },
      difficulty: 'Expert',
      topicTags: ['Dynamic Programming', 'Hash Set'],
      timeLimitMs: 2000,
      memoryLimitKb: 131072,
      marks: 50,
    });

    // Q2: Coin Change Minimum Coins
    await CodingQuestion.create({
      courseId: course._id,
      levelId: level._id,
      language: lang,
      levelNumber: 4,
      questionNumber: 2,
      title: 'Coin Change Minimum Coins',
      problemStatement: 'Given an amount M and N coin denominations, compute the fewest number of coins needed to make up that amount. If cannot be made up, output -1.',
      inputFormat: 'Line 1: N and M.\nLine 2: N distinct coin denominations.',
      outputFormat: 'Print the minimum coins required, or -1.',
      constraints: '1 <= N <= 12, 0 <= M <= 10^4',
      sampleTestCase: {
        input: '3 11\n1 2 5',
        expectedOutput: '3',
        explanation: '11 = 5 + 5 + 1 (3 coins)',
      },
      mainTestCases: [
        { input: '1 2\n3', expectedOutput: '-1', marks: 10 },
        { input: '1 0\n1', expectedOutput: '0', marks: 10 },
        { input: '3 7\n1 3 4', expectedOutput: '2', marks: 10 },
        { input: '4 14\n1 5 6 9', expectedOutput: '2', marks: 10 },
        { input: '3 30\n2 5 10', expectedOutput: '3', marks: 10 },
      ],
      referenceSolution: getStarterCode(lang, 'coin_change'),
      starterCode: {
        [lang]: getStarterCode(lang, 'coin_change_skeleton'),
      },
      difficulty: 'Expert',
      topicTags: ['Dynamic Programming', 'Optimization'],
      timeLimitMs: 2000,
      memoryLimitKb: 131072,
      marks: 50,
    });
  }
}

function getStarterCode(lang: string, type: string): string {
  if (lang === 'python') {
    if (type.includes('skeleton')) {
      return `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    # Write your solution here
    pass

if __name__ == '__main__':
    main()
`;
    }
    return `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    a, b = int(lines[0]), int(lines[1])
    print(a + b)

if __name__ == '__main__':
    main()
`;
  }

  if (lang === 'c') {
    return `#include <stdio.h>

int main() {
    // Read input from standard input
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    }
    return 0;
}
`;
  }

  if (lang === 'cpp') {
    return `#include <iostream>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    // Write your solution here
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << "\\n";
    }
    return 0;
}
`;
  }

  if (lang === 'java') {
    return `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}
`;
  }

  // javascript
  return `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2) return;
    const a = parseInt(input[0], 10);
    const b = parseInt(input[1], 10);
    console.log(a + b);
}

solve();
`;
}
