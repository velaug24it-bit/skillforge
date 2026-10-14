import { connectDatabase, disconnectDatabase } from './config/database';
import { Course, AssessmentLevel, CodingQuestion } from './models';
import { ensureAdminUser } from './utils/initAdmin';

interface QuestionSeedData {
  levelNumber: number;
  questionNumber: number;
  title: string;
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  topicTags: string[];
  starterCode: Record<string, string>;
  referenceSolution: string;
  sampleTestCase: {
    input: string;
    expectedOutput: string;
    explanation?: string;
  };
  mainTestCases: Array<{
    input: string;
    expectedOutput: string;
    marks: number;
  }>;
}

const coursesData = [
  {
    name: 'C Programming',
    language: 'c' as const,
    description: 'Master low-level programming fundamentals, memory management, pointers, and performance-critical systems development in ANSI C.',
    icon: 'Code2',
    totalLevels: 4,
    topics: {
      beginner: ['Input & Output (scanf/printf)', 'Variables & Data Types', 'Operators & Expressions', 'Conditional Statements (if/else, switch)', 'Basic Arithmetic'],
      intermediate: ['Loops (for, while, do-while)', '1D and 2D Arrays', 'Strings & char arrays', 'Functions & Variable Scope', 'Searching & Sorting Algorithms'],
      advanced: ['Pointers & Address Arithmetic', 'Recursion & Call Stack', 'Structures & Unions', 'Dynamic Memory Allocation (malloc/free)', 'Linked Lists & Stacks'],
      expert: ['Bitwise Operators & Bit Manipulation', 'Binary Search Trees', 'Function Pointers & Callbacks', 'File I/O & Binary Serialization', 'Algorithmic Optimization'],
    },
  },
  {
    name: 'C++ Programming',
    language: 'cpp' as const,
    description: 'Explore modern C++ features, Object-Oriented Programming (OOP), the Standard Template Library (STL), and advanced algorithmic design.',
    icon: 'Cpu',
    totalLevels: 4,
    topics: {
      beginner: ['Standard I/O (cin/cout)', 'Data Types & Constants', 'Arithmetic & Bitwise Operators', 'Conditionals & Branching', 'Namespaces & References'],
      intermediate: ['Loops & Iteration', 'std::vector & std::string', 'Classes, Constructors & Destructors', 'Inheritance & Polymorphism', 'STL Algorithms (sort, find)'],
      advanced: ['Templates & Generics', 'Operator Overloading', 'Exception Handling', 'STL Map, Set & Priority Queue', 'Divide & Conquer Recursion'],
      expert: ['Smart Pointers (unique_ptr, shared_ptr)', 'Move Semantics & Rvalue References', 'Graph Algorithms (Dijkstra, BFS/DFS)', 'Dynamic Programming', 'Multi-threading'],
    },
  },
  {
    name: 'Java Programming',
    language: 'java' as const,
    description: 'Enterprise software development with pure OOP principles, strong type safety, collections framework, and multi-threaded architectures.',
    icon: 'Coffee',
    totalLevels: 4,
    topics: {
      beginner: ['Scanner & System.out', 'Primitive Types & Wrappers', 'Arithmetic & Relational Operators', 'Conditional Logic', 'Type Casting & Math API'],
      intermediate: ['For, While & Enhanced For Loops', 'Arrays & String Manipulation', 'Encapsulation & Interfaces', 'Method Overloading & Overriding', 'Package Structure'],
      advanced: ['Java Collections (ArrayList, HashMap, HashSet)', 'Exception Hierarchy (try-catch-finally)', 'Generics & Enums', 'Recursion & Backtracking', 'File Streams'],
      expert: ['Stream API & Lambda Expressions', 'Concurrency & ExecutorService', 'Dynamic Programming on Trees', 'Design Patterns (Singleton, Factory)', 'Memory Profiling & GC'],
    },
  },
  {
    name: 'Python Programming',
    language: 'python' as const,
    description: 'High-level expressive scripting, data structures, functional paradigms, and algorithm problem solving with Python 3.',
    icon: 'Terminal',
    totalLevels: 4,
    topics: {
      beginner: ['input() & print() Formatting', 'Dynamic Typing (int, float, str, bool)', 'Arithmetic & Logical Operators', 'if-elif-else Conditions', 'String Slicing'],
      intermediate: ['For & While Loops with range()', 'Lists, Tuples & Dictionaries', 'Custom Functions & Default Args', 'List Comprehensions', 'Module Imports'],
      advanced: ['Recursion & Memoization', 'File Operations & Context Managers', 'Lambda Functions & map/filter', 'OOP (Classes, Magic Methods)', 'Stack & Queue with deque'],
      expert: ['Generators & Iterators', 'Decorators & Higher-Order Functions', 'Graph Traversal & Shortest Path', 'Dynamic Programming', 'Time & Space Complexity Tuning'],
    },
  },
  {
    name: 'JavaScript Programming',
    language: 'javascript' as const,
    description: 'Modern ECMAScript logic, asynchronous execution, closures, array methods, and computational algorithmic thinking.',
    icon: 'Braces',
    totalLevels: 4,
    topics: {
      beginner: ['console.log & Input Parsing', 'let, const, var & Primitives', 'Arithmetic & Comparison Operators', 'Control Flow (if, switch, ternary)', 'Template Literals'],
      intermediate: ['Loops & Iteration (for...of, for...in)', 'Array Transformations (map, filter, reduce)', 'Functions, Arrow Syntax & Scopes', 'Object Literals & Destructuring', 'String Methods'],
      advanced: ['Closures & Higher-Order Functions', 'Recursion & Callbacks', 'Promises & async/await', 'Set and Map Data Structures', 'Algorithmic Problem Solving'],
      expert: ['Event Loop & Microtask Queue', 'Prototypal Inheritance', 'Graph & Tree Algorithms', 'Dynamic Programming Memoization', 'Memory Optimization & Currying'],
    },
  },
];

const levelCategoryInfo = [
  { levelNumber: 1, title: 'Level 1 — Beginner', category: 'Beginner' as const, durationMinutes: 60, passingScore: 100 },
  { levelNumber: 2, title: 'Level 2 — Intermediate', category: 'Intermediate' as const, durationMinutes: 60, passingScore: 100 },
  { levelNumber: 3, title: 'Level 3 — Advanced', category: 'Advanced' as const, durationMinutes: 60, passingScore: 100 },
  { levelNumber: 4, title: 'Level 4 — Expert', category: 'Expert' as const, durationMinutes: 60, passingScore: 100 },
];

// Verified C questions: 2 per level for all 4 levels (8 questions total)
const cQuestions: QuestionSeedData[] = [
  // LEVEL 1 - QUESTION 1
  {
    levelNumber: 1,
    questionNumber: 1,
    title: 'Sum of Two Floating Point Numbers',
    problemStatement: 'Write a C program that reads two floating-point numbers from standard input, calculates their sum, and prints the result rounded to exactly 2 decimal places.',
    inputFormat: 'A single line containing two space-separated floating-point numbers A and B.',
    outputFormat: 'Print the sum rounded to 2 decimal places in the format: "Sum = X.XX".',
    constraints: '-10000.0 <= A, B <= 10000.0',
    difficulty: 'Beginner',
    topicTags: ['I/O', 'Float', 'Arithmetic'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main() {\n    // Read two floats and print their sum rounded to 2 decimal places\n    float a, b;\n    if (scanf("%f %f", &a, &b) == 2) {\n        // Your code here\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n\nint main() {\n    float a, b;\n    if (scanf("%f %f", &a, &b) == 2) {\n        printf("Sum = %.2f\\n", a + b);\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: '3.50 2.25',
      expectedOutput: 'Sum = 5.75',
      explanation: '3.50 + 2.25 = 5.75',
    },
    mainTestCases: [
      { input: '10.00 20.00', expectedOutput: 'Sum = 30.00', marks: 10 },
      { input: '0.00 0.00', expectedOutput: 'Sum = 0.00', marks: 10 },
      { input: '-5.25 15.50', expectedOutput: 'Sum = 10.25', marks: 10 },
      { input: '-12.75 -3.25', expectedOutput: 'Sum = -16.00', marks: 10 },
      { input: '123.456 654.321', expectedOutput: 'Sum = 777.78', marks: 10 },
    ],
  },
  // LEVEL 1 - QUESTION 2
  {
    levelNumber: 1,
    questionNumber: 2,
    title: 'Check Even or Odd and Positive or Negative',
    problemStatement: 'Given a non-zero integer N, determine if it is Positive or Negative, and whether it is Even or Odd. Output both classifications separated by a space.',
    inputFormat: 'A single integer N (N != 0).',
    outputFormat: 'Print "[Positive/Negative] [Even/Odd]" followed by a newline.',
    constraints: '-10^6 <= N <= 10^6, N != 0',
    difficulty: 'Beginner',
    topicTags: ['Conditionals', 'Operators', 'Integers'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        // Your code here\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        const char* sign = (n > 0) ? "Positive" : "Negative";\n        const char* parity = (n % 2 == 0) ? "Even" : "Odd";\n        printf("%s %s\\n", sign, parity);\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: '14',
      expectedOutput: 'Positive Even',
      explanation: '14 is positive and even.',
    },
    mainTestCases: [
      { input: '7', expectedOutput: 'Positive Odd', marks: 10 },
      { input: '-4', expectedOutput: 'Negative Even', marks: 10 },
      { input: '-9', expectedOutput: 'Negative Odd', marks: 10 },
      { input: '100', expectedOutput: 'Positive Even', marks: 10 },
      { input: '-999999', expectedOutput: 'Negative Odd', marks: 10 },
    ],
  },
  // LEVEL 2 - QUESTION 1
  {
    levelNumber: 2,
    questionNumber: 1,
    title: 'Reverse an Integer Array',
    problemStatement: 'Given an integer N followed by N integers, reverse the array in place or print it in reverse order, with elements separated by a single space.',
    inputFormat: 'First line contains integer N. Second line contains N space-separated integers.',
    outputFormat: 'Print the reversed elements on a single line separated by a space.',
    constraints: '1 <= N <= 1000, -10^5 <= elements <= 10^5',
    difficulty: 'Intermediate',
    topicTags: ['Arrays', 'Loops'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        int arr[1000];\n        for (int i = 0; i < n; i++) {\n            scanf("%d", &arr[i]);\n        }\n        // Reverse and print\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        int arr[1005];\n        for (int i = 0; i < n; i++) {\n            scanf("%d", &arr[i]);\n        }\n        for (int i = n - 1; i >= 0; i--) {\n            printf("%d%s", arr[i], (i == 0) ? "" : " ");\n        }\n        printf("\\n");\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: '5\n1 2 3 4 5',
      expectedOutput: '5 4 3 2 1',
      explanation: 'Reversing [1, 2, 3, 4, 5] yields 5 4 3 2 1',
    },
    mainTestCases: [
      { input: '3\n10 20 30', expectedOutput: '30 20 10', marks: 10 },
      { input: '1\n99', expectedOutput: '99', marks: 10 },
      { input: '4\n-1 -2 -3 -4', expectedOutput: '-4 -3 -2 -1', marks: 10 },
      { input: '6\n1 0 1 0 1 0', expectedOutput: '0 1 0 1 0 1', marks: 10 },
      { input: '5\n50 40 30 20 10', expectedOutput: '10 20 30 40 50', marks: 10 },
    ],
  },
  // LEVEL 2 - QUESTION 2
  {
    levelNumber: 2,
    questionNumber: 2,
    title: 'Palindrome String Checker',
    problemStatement: 'Read a single word (no whitespace) of lowercase English characters and determine whether it is a palindrome. Print "YES" if it is a palindrome, otherwise print "NO".',
    inputFormat: 'A single string S without spaces.',
    outputFormat: 'Print "YES" or "NO" on a new line.',
    constraints: '1 <= |S| <= 100',
    difficulty: 'Intermediate',
    topicTags: ['Strings', 'Two Pointers'],
    starterCode: {
      c: '#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[105];\n    if (scanf("%100s", s) == 1) {\n        // Your code here\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[105];\n    if (scanf("%100s", s) == 1) {\n        int len = strlen(s);\n        int isPalindrome = 1;\n        for (int i = 0; i < len / 2; i++) {\n            if (s[i] != s[len - 1 - i]) {\n                isPalindrome = 0;\n                break;\n            }\n        }\n        printf("%s\\n", isPalindrome ? "YES" : "NO");\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: 'radar',
      expectedOutput: 'YES',
      explanation: '"radar" reads the same forwards and backwards.',
    },
    mainTestCases: [
      { input: 'level', expectedOutput: 'YES', marks: 10 },
      { input: 'college', expectedOutput: 'NO', marks: 10 },
      { input: 'a', expectedOutput: 'YES', marks: 10 },
      { input: 'abccba', expectedOutput: 'YES', marks: 10 },
      { input: 'skillforge', expectedOutput: 'NO', marks: 10 },
    ],
  },
  // LEVEL 3 - QUESTION 1
  {
    levelNumber: 3,
    questionNumber: 1,
    title: 'N-th Fibonacci Number with Recursion',
    problemStatement: 'Calculate the N-th Fibonacci number where Fib(0) = 0, Fib(1) = 1, and Fib(N) = Fib(N-1) + Fib(N-2).',
    inputFormat: 'A single integer N.',
    outputFormat: 'Print the N-th Fibonacci number.',
    constraints: '0 <= N <= 30',
    difficulty: 'Advanced',
    topicTags: ['Recursion', 'Math'],
    starterCode: {
      c: '#include <stdio.h>\n\nlong long fib(int n) {\n    // Implement recursive function\n    return 0;\n}\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        printf("%lld\\n", fib(n));\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n\nlong long fib(int n) {\n    if (n <= 0) return 0;\n    if (n == 1) return 1;\n    long long a = 0, b = 1, c = 0;\n    for (int i = 2; i <= n; i++) {\n        c = a + b;\n        a = b;\n        b = c;\n    }\n    return b;\n}\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        printf("%lld\\n", fib(n));\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: '6',
      expectedOutput: '8',
      explanation: 'Fib(6) = 8: [0, 1, 1, 2, 3, 5, 8]',
    },
    mainTestCases: [
      { input: '0', expectedOutput: '0', marks: 10 },
      { input: '1', expectedOutput: '1', marks: 10 },
      { input: '10', expectedOutput: '55', marks: 10 },
      { input: '20', expectedOutput: '6765', marks: 10 },
      { input: '30', expectedOutput: '832040', marks: 10 },
    ],
  },
  // LEVEL 3 - QUESTION 2
  {
    levelNumber: 3,
    questionNumber: 2,
    title: 'Find the Second Largest Element in Array',
    problemStatement: 'Given an array of N integers, find and print the second largest distinct element. If no second distinct largest element exists, print -1.',
    inputFormat: 'First line contains integer N. Second line contains N space-separated integers.',
    outputFormat: 'Print the second largest distinct integer, or -1.',
    constraints: '2 <= N <= 1000, -10^5 <= elements <= 10^5',
    difficulty: 'Advanced',
    topicTags: ['Data Structures', 'Searching'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        // Your code here\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n#include <limits.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        long long max1 = LLONG_MIN;\n        long long max2 = LLONG_MIN;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            scanf("%lld", &val);\n            if (val > max1) {\n                max2 = max1;\n                max1 = val;\n            } else if (val < max1 && val > max2) {\n                max2 = val;\n            }\n        }\n        if (max2 == LLONG_MIN) {\n            printf("-1\\n");\n        } else {\n            printf("%lld\\n", max2);\n        }\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: '5\n12 35 1 10 34',
      expectedOutput: '34',
      explanation: 'Largest is 35, second largest is 34.',
    },
    mainTestCases: [
      { input: '4\n10 10 10 10', expectedOutput: '-1', marks: 10 },
      { input: '3\n1 2 3', expectedOutput: '2', marks: 10 },
      { input: '5\n5 4 3 2 1', expectedOutput: '4', marks: 10 },
      { input: '2\n-5 -2', expectedOutput: '-5', marks: 10 },
      { input: '6\n100 50 100 50 25 10', expectedOutput: '50', marks: 10 },
    ],
  },
  // LEVEL 4 - QUESTION 1
  {
    levelNumber: 4,
    questionNumber: 1,
    title: 'Maximum Subarray Sum (Kadane\'s Algorithm)',
    problemStatement: 'Given an array of N integers, find the contiguous subarray (containing at least one number) which has the largest sum and return that sum.',
    inputFormat: 'First line contains integer N. Second line contains N space-separated integers.',
    outputFormat: 'Print the maximum subarray sum.',
    constraints: '1 <= N <= 10^5, -1000 <= elements <= 1000',
    difficulty: 'Expert',
    topicTags: ['Dynamic Programming', 'Optimization'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        // Implement Kadane\'s algorithm\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        long long maxSoFar;\n        long long currMax;\n        long long first;\n        scanf("%lld", &first);\n        maxSoFar = first;\n        currMax = first;\n        for (int i = 1; i < n; i++) {\n            long long val;\n            scanf("%lld", &val);\n            currMax = (val > currMax + val) ? val : (currMax + val);\n            if (currMax > maxSoFar) maxSoFar = currMax;\n        }\n        printf("%lld\\n", maxSoFar);\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: '8\n-2 -3 4 -1 -2 1 5 -3',
      expectedOutput: '7',
      explanation: 'Subarray [4, -1, -2, 1, 5] gives max sum = 7.',
    },
    mainTestCases: [
      { input: '4\n-1 -2 -3 -4', expectedOutput: '-1', marks: 10 },
      { input: '5\n1 2 3 4 5', expectedOutput: '15', marks: 10 },
      { input: '1\n42', expectedOutput: '42', marks: 10 },
      { input: '5\n-5 10 -2 3 -1', expectedOutput: '11', marks: 10 },
      { input: '6\n2 -1 2 3 4 -5', expectedOutput: '10', marks: 10 },
    ],
  },
  // LEVEL 4 - QUESTION 2
  {
    levelNumber: 4,
    questionNumber: 2,
    title: 'Count Set Bits (Hamming Weight)',
    problemStatement: 'Given a non-negative integer N, count and print the total number of set bits (1s) in its binary representation using bitwise manipulation.',
    inputFormat: 'A single non-negative integer N.',
    outputFormat: 'Print the count of set bits.',
    constraints: '0 <= N <= 2^31 - 1',
    difficulty: 'Expert',
    topicTags: ['Bit Manipulation', 'Algorithms'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main() {\n    unsigned int n;\n    if (scanf("%u", &n) == 1) {\n        // Count set bits using bitwise operators\n    }\n    return 0;\n}',
    },
    referenceSolution: '#include <stdio.h>\n\nint main() {\n    unsigned int n;\n    if (scanf("%u", &n) == 1) {\n        int count = 0;\n        while (n > 0) {\n            n &= (n - 1); // Brian Kernighan\'s algorithm\n            count++;\n        }\n        printf("%d\\n", count);\n    }\n    return 0;\n}',
    sampleTestCase: {
      input: '11',
      expectedOutput: '3',
      explanation: 'Binary of 11 is 1011, having 3 set bits.',
    },
    mainTestCases: [
      { input: '0', expectedOutput: '0', marks: 10 },
      { input: '1', expectedOutput: '1', marks: 10 },
      { input: '7', expectedOutput: '3', marks: 10 },
      { input: '15', expectedOutput: '4', marks: 10 },
      { input: '255', expectedOutput: '8', marks: 10 },
    ],
  },
];

// Helper to generate seed questions for other languages (C++, Java, Python, JS)
const generateGenericQuestionsForLanguage = (language: string): QuestionSeedData[] => {
  return [
    {
      levelNumber: 1,
      questionNumber: 1,
      title: `Sum of Two Numbers in ${language.toUpperCase()}`,
      problemStatement: `Read two integers A and B from standard input and print their sum.`,
      inputFormat: 'Two space-separated integers A and B.',
      outputFormat: 'Print the sum as a single integer.',
      constraints: '-10^6 <= A, B <= 10^6',
      difficulty: 'Beginner',
      topicTags: ['I/O', 'Basics'],
      starterCode: {
        [language]: language === 'python' ? 'a, b = map(int, input().split())\n# Print sum\n' :
                    language === 'javascript' ? 'const fs = require("fs");\nconst [a, b] = fs.readFileSync(0, "utf-8").trim().split(/\\s+/).map(Number);\n// Print sum\n' :
                    language === 'cpp' ? '#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        // Output sum\n    }\n    return 0;\n}' :
                    'import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        // Output sum\n    }\n}',
      },
      referenceSolution: language === 'python' ? 'a, b = map(int, input().split())\nprint(a + b)' :
                         language === 'javascript' ? 'const fs = require("fs");\nconst [a, b] = fs.readFileSync(0, "utf-8").trim().split(/\\s+/).map(Number);\nconsole.log(a + b);' :
                         language === 'cpp' ? '#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    if (cin >> a >> b) cout << a + b << endl;\n    return 0;\n}' :
                         'import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}',
      sampleTestCase: { input: '4 7', expectedOutput: '11', explanation: '4 + 7 = 11' },
      mainTestCases: [
        { input: '10 20', expectedOutput: '30', marks: 10 },
        { input: '0 0', expectedOutput: '0', marks: 10 },
        { input: '-5 5', expectedOutput: '0', marks: 10 },
        { input: '-10 -25', expectedOutput: '-35', marks: 10 },
        { input: '1000 2000', expectedOutput: '3000', marks: 10 },
      ],
    },
    {
      levelNumber: 1,
      questionNumber: 2,
      title: `Even or Odd in ${language.toUpperCase()}`,
      problemStatement: `Given an integer N, print "EVEN" if N is even, or "ODD" if N is odd.`,
      inputFormat: 'A single integer N.',
      outputFormat: 'Print "EVEN" or "ODD".',
      constraints: '-10^6 <= N <= 10^6',
      difficulty: 'Beginner',
      topicTags: ['Conditionals'],
      starterCode: {
        [language]: language === 'python' ? 'n = int(input().strip())\n# Print EVEN or ODD\n' :
                    language === 'javascript' ? 'const fs = require("fs");\nconst n = parseInt(fs.readFileSync(0, "utf-8").trim(), 10);\n// Print EVEN or ODD\n' :
                    language === 'cpp' ? '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    if (cin >> n) {\n        // Your code\n    }\n    return 0;\n}' :
                    'import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        // Your code\n    }\n}',
      },
      referenceSolution: language === 'python' ? 'n = int(input().strip())\nprint("EVEN" if n % 2 == 0 else "ODD")' :
                         language === 'javascript' ? 'const fs = require("fs");\nconst n = parseInt(fs.readFileSync(0, "utf-8").trim(), 10);\nconsole.log(n % 2 === 0 ? "EVEN" : "ODD");' :
                         language === 'cpp' ? '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    if (cin >> n) cout << (n % 2 == 0 ? "EVEN" : "ODD") << endl;\n    return 0;\n}' :
                         'import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n % 2 == 0 ? "EVEN" : "ODD");\n    }\n}',
      sampleTestCase: { input: '8', expectedOutput: 'EVEN' },
      mainTestCases: [
        { input: '3', expectedOutput: 'ODD', marks: 10 },
        { input: '0', expectedOutput: 'EVEN', marks: 10 },
        { input: '-4', expectedOutput: 'EVEN', marks: 10 },
        { input: '-7', expectedOutput: 'ODD', marks: 10 },
        { input: '1002', expectedOutput: 'EVEN', marks: 10 },
      ],
    },
    {
      levelNumber: 2,
      questionNumber: 1,
      title: `Array Maximum Element in ${language.toUpperCase()}`,
      problemStatement: `Given N numbers, find and print the maximum value in the array.`,
      inputFormat: 'First line contains integer N. Second line contains N space-separated integers.',
      outputFormat: 'Print the maximum value.',
      constraints: '1 <= N <= 1000',
      difficulty: 'Intermediate',
      topicTags: ['Arrays', 'Iteration'],
      starterCode: { [language]: '// Find maximum element' },
      referenceSolution: language === 'python' ? 'n = int(input())\narr = list(map(int, input().split()))\nprint(max(arr))' : 'print(max)',
      sampleTestCase: { input: '4\n1 5 3 2', expectedOutput: '5' },
      mainTestCases: [
        { input: '3\n-1 -5 -2', expectedOutput: '-1', marks: 10 },
        { input: '1\n100', expectedOutput: '100', marks: 10 },
        { input: '5\n10 20 30 40 50', expectedOutput: '50', marks: 10 },
        { input: '4\n0 0 0 0', expectedOutput: '0', marks: 10 },
        { input: '5\n99 2 45 88 12', expectedOutput: '99', marks: 10 },
      ],
    },
    {
      levelNumber: 2,
      questionNumber: 2,
      title: `Factorial Calculator in ${language.toUpperCase()}`,
      problemStatement: `Calculate the factorial of a given integer N (N! = 1 * 2 * ... * N, with 0! = 1).`,
      inputFormat: 'A single integer N.',
      outputFormat: 'Print N!',
      constraints: '0 <= N <= 12',
      difficulty: 'Intermediate',
      topicTags: ['Loops', 'Math'],
      starterCode: { [language]: '// Calculate factorial' },
      referenceSolution: language === 'python' ? 'import math\nprint(math.factorial(int(input())))' : 'factorial',
      sampleTestCase: { input: '5', expectedOutput: '120' },
      mainTestCases: [
        { input: '0', expectedOutput: '1', marks: 10 },
        { input: '1', expectedOutput: '1', marks: 10 },
        { input: '3', expectedOutput: '6', marks: 10 },
        { input: '6', expectedOutput: '720', marks: 10 },
        { input: '10', expectedOutput: '3628800', marks: 10 },
      ],
    },
    {
      levelNumber: 3,
      questionNumber: 1,
      title: `Linear Search in ${language.toUpperCase()}`,
      problemStatement: `Search for target K in array of N elements. Print index (0-indexed) or -1 if not found.`,
      inputFormat: 'First line: N K. Second line: N space-separated elements.',
      outputFormat: 'Print the index or -1.',
      constraints: '1 <= N <= 1000',
      difficulty: 'Advanced',
      topicTags: ['Searching', 'Algorithms'],
      starterCode: { [language]: '// Search target' },
      referenceSolution: 'search',
      sampleTestCase: { input: '5 30\n10 20 30 40 50', expectedOutput: '2' },
      mainTestCases: [
        { input: '3 99\n1 2 3', expectedOutput: '-1', marks: 10 },
        { input: '1 5\n5', expectedOutput: '0', marks: 10 },
        { input: '4 2\n4 3 2 1', expectedOutput: '2', marks: 10 },
        { input: '5 10\n10 20 30 10 50', expectedOutput: '0', marks: 10 },
        { input: '3 0\n-1 0 1', expectedOutput: '1', marks: 10 },
      ],
    },
    {
      levelNumber: 3,
      questionNumber: 2,
      title: `Count Occurrences in ${language.toUpperCase()}`,
      problemStatement: `Count how many times character C appears in string S.`,
      inputFormat: 'First line: string S. Second line: single character C.',
      outputFormat: 'Print occurrence count.',
      constraints: '1 <= |S| <= 1000',
      difficulty: 'Advanced',
      topicTags: ['Strings', 'Frequency'],
      starterCode: { [language]: '// Count occurrences' },
      referenceSolution: 'count',
      sampleTestCase: { input: 'banana\na', expectedOutput: '3' },
      mainTestCases: [
        { input: 'hello\nl', expectedOutput: '2', marks: 10 },
        { input: 'skillforge\nz', expectedOutput: '0', marks: 10 },
        { input: 'aaaaa\na', expectedOutput: '5', marks: 10 },
        { input: 'assessment\ns', expectedOutput: '4', marks: 10 },
        { input: 'test\nt', expectedOutput: '2', marks: 10 },
      ],
    },
    {
      levelNumber: 4,
      questionNumber: 1,
      title: `Climbing Stairs in ${language.toUpperCase()}`,
      problemStatement: `You are climbing a staircase with N steps. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
      inputFormat: 'A single integer N.',
      outputFormat: 'Print total distinct ways.',
      constraints: '1 <= N <= 40',
      difficulty: 'Expert',
      topicTags: ['Dynamic Programming'],
      starterCode: { [language]: '// DP Staircase' },
      referenceSolution: 'dp',
      sampleTestCase: { input: '3', expectedOutput: '3' },
      mainTestCases: [
        { input: '1', expectedOutput: '1', marks: 10 },
        { input: '2', expectedOutput: '2', marks: 10 },
        { input: '4', expectedOutput: '5', marks: 10 },
        { input: '5', expectedOutput: '8', marks: 10 },
        { input: '10', expectedOutput: '89', marks: 10 },
      ],
    },
    {
      levelNumber: 4,
      questionNumber: 2,
      title: `Valid Parentheses Checker in ${language.toUpperCase()}`,
      problemStatement: `Given a string consisting of '(', ')', '{', '}', '[', ']', determine if the input string is valid. Output "VALID" or "INVALID".`,
      inputFormat: 'A single string of brackets.',
      outputFormat: 'Print "VALID" or "INVALID".',
      constraints: '1 <= |S| <= 10^4',
      difficulty: 'Expert',
      topicTags: ['Stack', 'Data Structures'],
      starterCode: { [language]: '// Stack verification' },
      referenceSolution: 'stack',
      sampleTestCase: { input: '()[]{}', expectedOutput: 'VALID' },
      mainTestCases: [
        { input: '(]', expectedOutput: 'INVALID', marks: 10 },
        { input: '([{}])', expectedOutput: 'VALID', marks: 10 },
        { input: '((()', expectedOutput: 'INVALID', marks: 10 },
        { input: '{[()]}', expectedOutput: 'VALID', marks: 10 },
        { input: '((', expectedOutput: 'INVALID', marks: 10 },
      ],
    },
  ];
};

export const seedDatabase = async () => {
  console.log('[Seed] Starting database seeding for SkillForge...');

  try {
    await connectDatabase();

    for (const courseData of coursesData) {
      console.log(`[Seed] Processing course: ${courseData.name} (${courseData.language})`);
      
      const course = await Course.findOneAndUpdate(
        { language: courseData.language },
        courseData,
        { upsert: true, new: true }
      );

      // Create 4 levels for this course
      for (const levelInfo of levelCategoryInfo) {
        const levelTopics = courseData.topics[levelInfo.category.toLowerCase() as keyof typeof courseData.topics] || [];
        
        const assessmentLevel = await AssessmentLevel.findOneAndUpdate(
          { courseId: course._id, levelNumber: levelInfo.levelNumber },
          {
            courseId: course._id,
            language: course.language,
            levelNumber: levelInfo.levelNumber,
            title: levelInfo.title,
            category: levelInfo.category,
            description: `Assessment for ${course.name} - ${levelInfo.title}. Covers: ${levelTopics.slice(0, 3).join(', ')}.`,
            topics: levelTopics,
            passingScore: levelInfo.passingScore,
            durationMinutes: levelInfo.durationMinutes,
          },
          { upsert: true, new: true }
        );

        // Populate verified questions
        const questionsToSeed = course.language === 'c' 
          ? cQuestions.filter((q) => q.levelNumber === levelInfo.levelNumber)
          : generateGenericQuestionsForLanguage(course.language).filter((q) => q.levelNumber === levelInfo.levelNumber);

        for (const q of questionsToSeed) {
          await CodingQuestion.findOneAndUpdate(
            { courseId: course._id, levelNumber: levelInfo.levelNumber, questionNumber: q.questionNumber },
            {
              courseId: course._id,
              levelId: assessmentLevel._id,
              language: course.language,
              levelNumber: levelInfo.levelNumber,
              questionNumber: q.questionNumber,
              title: q.title,
              problemStatement: q.problemStatement,
              inputFormat: q.inputFormat,
              outputFormat: q.outputFormat,
              constraints: q.constraints,
              difficulty: q.difficulty,
              topicTags: q.topicTags,
              starterCode: q.starterCode,
              referenceSolution: q.referenceSolution,
              sampleTestCase: q.sampleTestCase,
              mainTestCases: q.mainTestCases,
              marks: 50,
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    await ensureAdminUser();
    console.log('[Seed] Database seeded successfully with all 5 courses, 20 levels, admin user, and verified coding questions!');
  } catch (error: any) {
    console.error(`[Seed] Error seeding database: ${error.message}`);
  } finally {
    await disconnectDatabase();
  }
};

// Allow direct CLI execution
if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}
