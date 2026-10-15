export interface VideoMaterial {
  title: string;
  embedUrl: string;
  duration: string;
  instructor: string;
  summary: string;
  timestamps: { time: string; label: string }[];
}

export interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

export interface CommonPitfall {
  problem: string;
  solution: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface StudyMaterial {
  language: string;
  levelNumber: number;
  levelTitle: string;
  overview: string;
  video: VideoMaterial;
  keyConcepts: { title: string; points: string[] }[];
  codeExamples: CodeExample[];
  commonPitfalls: CommonPitfall[];
  referenceLinks: { title: string; url: string; description: string }[];
  quickQuiz: QuizQuestion[];
}

export const STUDY_MATERIALS: Record<string, Record<number, StudyMaterial>> = {
  c: {
    1: {
      language: 'C',
      levelNumber: 1,
      levelTitle: 'Level 1 — Beginner: Fundamentals & I/O',
      overview: 'Master basic C structure, standard input/output using scanf and printf, data types, arithmetic operators, and if-else conditional branches.',
      video: {
        title: 'C Programming Level 1: Core Fundamentals & Control Flow',
        embedUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?start=0',
        duration: '22 mins',
        instructor: 'Prof. CS Curriculum Team',
        summary: 'Learn how C executes from main(), formatting with %d, %f, %c, and writing rock-solid conditional logic.',
        timestamps: [
          { time: '00:00', label: 'Program Anatomy & Headers (<stdio.h>)' },
          { time: '04:15', label: 'Variables, Memory Allocation & Data Types' },
          { time: '09:30', label: 'printf & scanf Format Specifiers' },
          { time: '14:20', label: 'Arithmetic & Relational Operators' },
          { time: '18:45', label: 'if-else & switch Selection Structures' },
        ],
      },
      keyConcepts: [
        {
          title: 'Format Specifiers in C',
          points: [
            '%d or %i for signed 32-bit integers',
            '%f for float (6 decimal precision), %lf for double',
            '%c for single character, %s for null-terminated char arrays',
            'Always prefix non-pointer variables with & in scanf (e.g. scanf("%d", &num))',
          ],
        },
        {
          title: 'Conditionals & Relational Logic',
          points: [
            'In C, 0 evaluates to false; any non-zero value evaluates to true',
            'Logical AND (&&) and OR (||) are short-circuiting operators',
            'Always use double equals == for comparisons, not assignment =',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Standard Input & Formatted Output',
          language: 'c',
          code: `#include <stdio.h>

int main() {
    int a, b;
    // Read two space-separated integers
    if (scanf("%d %d", &a, &b) == 2) {
        int sum = a + b;
        int product = a * b;
        printf("Sum: %d\\nProduct: %d\\n", sum, product);
    }
    return 0;
}`,
          explanation: 'Demonstrates reading multiple numbers from stdin and outputting calculated values with proper newline formatting.',
        },
        {
          title: '2. Conditional Number Categorization',
          language: 'c',
          code: `#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    
    if (n > 0) {
        printf("%d is Positive\\n", n);
    } else if (n < 0) {
        printf("%d is Negative\\n", n);
    } else {
        printf("Zero\\n");
    }
    return 0;
}`,
          explanation: 'Shows multi-branch if-else if-else structure for boundary checking and categorization.',
        },
      ],
      commonPitfalls: [
        {
          problem: 'Forgetting & (ampersand) in scanf("%d", val)',
          solution: 'Pass the memory address &val so scanf knows where to store the input into RAM.',
        },
        {
          problem: 'Writing if (x = 5) instead of if (x == 5)',
          solution: 'Single = assigns 5 to x (which is truthy). Always use double == for equality checks.',
        },
      ],
      referenceLinks: [
        { title: 'DevDocs — C Standard Library', url: 'https://devdocs.io/c/', description: 'Complete documentation for stdio.h, stdlib.h and C syntax' },
        { title: 'GeeksforGeeks C Programming Language', url: 'https://www.geeksforgeeks.org/c-programming-language/', description: 'Tutorials and verified examples on C fundamentals' },
      ],
      quickQuiz: [
        {
          question: 'What is the return value of scanf("%d %d", &a, &b) when two valid integers are entered?',
          options: ['0', '1', '2', 'Sum of both numbers'],
          answerIndex: 2,
          explanation: 'scanf returns the total number of input items successfully matched and assigned (2 in this case).',
        },
        {
          question: 'Which format specifier is correct for reading a double precision float with scanf in C?',
          options: ['%f', '%lf', '%d', '%g'],
          answerIndex: 1,
          explanation: 'In scanf, %lf is required for double, whereas %f is for standard single-precision float.',
        },
      ],
    },
    2: {
      language: 'C',
      levelNumber: 2,
      levelTitle: 'Level 2 — Intermediate: Loops, Arrays & Strings',
      overview: 'Advance to iteration loops (for, while, do-while), 1D/2D arrays, character array manipulations, and string tokenization.',
      video: {
        title: 'C Programming Level 2: Arrays, Nested Loops & Strings',
        embedUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?start=1800',
        duration: '28 mins',
        instructor: 'Prof. CS Curriculum Team',
        summary: 'Deep dive into array indexing, avoiding out-of-bounds segfaults, string null terminators, and traversal techniques.',
        timestamps: [
          { time: '00:00', label: 'Loop Mechanics: for vs while' },
          { time: '06:30', label: 'Array Declaration, Memory Layout & Bounds' },
          { time: '13:15', label: 'Null-Terminated Strings (<string.h>)' },
          { time: '20:00', label: '2D Arrays and Matrix Processing' },
          { time: '24:40', label: 'Linear Search & Bubble Sort' },
        ],
      },
      keyConcepts: [
        {
          title: 'Array Mechanics & Indexing',
          points: [
            'Array indexes are strictly 0-based: valid indices are 0 to size - 1',
            'C does NOT perform runtime bounds checking; accessing arr[size] leads to undefined behavior',
            'Arrays decay to a pointer to their first element when passed into functions',
          ],
        },
        {
          title: 'C String Character Arrays',
          points: [
            'Strings in C are character arrays terminated with the null character "\\0"',
            'strlen() calculates characters up to "\\0", not including "\\0"',
            'Ensure buffers have size at least length + 1 to store the null terminator',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Finding Max Element & Reversing an Array',
          language: 'c',
          code: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // Find maximum
    int maxVal = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
        }
    }
    printf("Max: %d\\n", maxVal);
    return 0;
}`,
          explanation: 'Demonstrates reading dynamic size array, iterating with for-loop, and tracking optimum values.',
        },
        {
          title: '2. String Palindrome Verification',
          language: 'c',
          code: `#include <stdio.h>
#include <string.h>

int main() {
    char str[100];
    scanf("%99s", str);
    
    int len = strlen(str);
    int isPalindrome = 1;
    
    for (int i = 0; i < len / 2; i++) {
        if (str[i] != str[len - 1 - i]) {
            isPalindrome = 0;
            break;
        }
    }
    
    printf("%s\\n", isPalindrome ? "PALINDROME" : "NOT_PALINDROME");
    return 0;
}`,
          explanation: 'Uses two-pointer boundary traversal to determine symmetry in character arrays.',
        },
      ],
      commonPitfalls: [
        {
          problem: 'Off-by-one loop boundary (for i <= n instead of i < n)',
          solution: 'Array of size N has indices 0 through N-1. Loop condition must be i < n.',
        },
        {
          problem: 'Overwriting the terminating \\0 in char arrays',
          solution: 'Always allocate room for the null terminator: char word[len + 1].',
        },
      ],
      referenceLinks: [
        { title: 'cppreference C Strings (<string.h>)', url: 'https://en.cppreference.com/w/c/string/byte', description: 'Complete reference for strlen, strcpy, strcmp, strcat' },
      ],
      quickQuiz: [
        {
          question: 'If char s[] = "Skill"; what does sizeof(s) return?',
          options: ['5', '6', '4', '8'],
          answerIndex: 1,
          explanation: 'sizeof(s) counts all bytes including the terminating "\\0", so 5 characters + 1 = 6 bytes.',
        },
      ],
    },
    3: {
      language: 'C',
      levelNumber: 3,
      levelTitle: 'Level 3 — Advanced: Pointers, Memory & Structs',
      overview: 'Deep dive into pointer arithmetic, reference passing, dynamic memory management (malloc/free), and structured types (struct).',
      video: {
        title: 'C Programming Level 3: Pointers, Heap Allocation & Structures',
        embedUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?start=3600',
        duration: '34 mins',
        instructor: 'Prof. CS Curriculum Team',
        summary: 'Understand pointer addresses, dereferencing with *, memory allocation in the heap, and defining compound struct types.',
        timestamps: [
          { time: '00:00', label: 'Pointers & Address-Of Operator (& vs *)' },
          { time: '08:45', label: 'Pass-by-Reference in Functions' },
          { time: '15:20', label: 'Dynamic Memory: malloc, calloc, realloc, free' },
          { time: '22:30', label: 'Struct Definitions & Arrow Operator (->)' },
          { time: '29:00', label: 'Preventing Memory Leaks & Dangling Pointers' },
        ],
      },
      keyConcepts: [
        {
          title: 'Pointer Mechanics',
          points: [
            '&variable extracts the memory address of the variable',
            '*pointer dereferences and accesses the value at that address',
            'Always initialize pointers to NULL if not assigned immediately',
          ],
        },
        {
          title: 'Heap Memory Lifecycle',
          points: [
            'int *arr = (int *)malloc(n * sizeof(int)); allocates bytes on the heap',
            'Always check if the pointer is NULL before using it',
            'Every malloc() must have a corresponding free() to prevent memory leaks',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. In-Place Swap Using Pointers',
          language: 'c',
          code: `#include <stdio.h>

void swap(int *x, int *y) {
    int temp = *x;
    *x = *y;
    *y = temp;
}

int main() {
    int a = 10, b = 25;
    swap(&a, &b);
    printf("a = %d, b = %d\\n", a, b); // a = 25, b = 10
    return 0;
}`,
          explanation: 'Demonstrates pass-by-reference using memory addresses to mutate variables outside local function scope.',
        },
      ],
      commonPitfalls: [
        {
          problem: 'Dereferencing NULL or uninitialized pointers (Segmentation Fault)',
          solution: 'Always verify if (ptr != NULL) before dereferencing.',
        },
        {
          problem: 'Memory leaks from missing free()',
          solution: 'Call free(ptr) when dynamic memory is no longer required, then set ptr = NULL.',
        },
      ],
      referenceLinks: [
        { title: 'Stanford CS Pointers and Memory', url: 'http://cslibrary.stanford.edu/102/', description: 'Legendary academic guide on C memory and pointers' },
      ],
      quickQuiz: [
        {
          question: 'What operator is used to access a struct field through a pointer (e.g. Student *s)?',
          options: ['. (dot)', '-> (arrow)', '* (asterisk)', '& (ampersand)'],
          answerIndex: 1,
          explanation: 'The arrow operator -> is shorthand for (*s).field when dealing with pointers to structs.',
        },
      ],
    },
    4: {
      language: 'C',
      levelNumber: 4,
      levelTitle: 'Level 4 — Expert: Bitwise, Recursion & Function Pointers',
      overview: 'Conquer bitwise manipulation, recursive backtracking, binary search trees, function pointers, and performance optimization.',
      video: {
        title: 'C Programming Level 4: Bit Manipulation & Advanced Algorithms',
        embedUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?start=5400',
        duration: '40 mins',
        instructor: 'Prof. CS Curriculum Team',
        summary: 'Master bitmasking (&, |, ^, ~), bit shifts (<<, >>), recursive stack frames, and function pointer callbacks.',
        timestamps: [
          { time: '00:00', label: 'Bitwise Operators (&, |, ^, ~, <<, >>)' },
          { time: '11:00', label: 'Setting, Clearing & Checking Bits' },
          { time: '19:30', label: 'Recursion Call Stack & Base Cases' },
          { time: '28:40', label: 'Function Pointers & qsort() Callbacks' },
          { time: '35:00', label: 'Cache-Friendly Architecture & Macros' },
        ],
      },
      keyConcepts: [
        {
          title: 'Bitwise Optimization Patterns',
          points: [
            '(n & (n - 1)) == 0 checks if a positive integer is a power of 2',
            '(n & (1 << k)) checks whether the k-th bit is set',
            'x ^ x equals 0; x ^ 0 equals x (useful for single number detection)',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Counting Set Bits (Brian Kernighan Algorithm)',
          language: 'c',
          code: `#include <stdio.h>

int countSetBits(int n) {
    int count = 0;
    while (n > 0) {
        n &= (n - 1); // Clears the lowest set bit
        count++;
    }
    return count;
}

int main() {
    int num = 29; // 11101 in binary
    printf("Number of set bits in %d: %d\\n", num, countSetBits(num));
    return 0;
}`,
          explanation: 'Fast O(k) bit manipulation to count binary 1s where k is number of set bits.',
        },
      ],
      commonPitfalls: [
        {
          problem: 'Missing base case in recursion resulting in stack overflow',
          solution: 'Ensure every recursive path reaches a terminating condition that returns without recursing.',
        },
      ],
      referenceLinks: [
        { title: 'Bit Twiddling Hacks by Sean Eron Anderson', url: 'https://graphics.stanford.edu/~seander/bithacks.html', description: 'Exhaustive reference for high-performance bitwise algorithms' },
      ],
      quickQuiz: [
        {
          question: 'What is the result of evaluating 1 << 3 in C?',
          options: ['3', '6', '8', '16'],
          answerIndex: 2,
          explanation: '1 shifted left by 3 positions in binary is 1000 in base-2, which equals 8.',
        },
      ],
    },
  },
  cpp: {
    1: {
      language: 'C++',
      levelNumber: 1,
      levelTitle: 'Level 1 — Beginner: C++ Basics & I/O Streams',
      overview: 'Understand modern C++ syntax, std::cin, std::cout, namespaces, basic types, and flow control structures.',
      video: {
        title: 'C++ Programming Level 1: Standard Streams & Control Flow',
        embedUrl: 'https://www.youtube.com/embed/vLnPwxZdW4Y?start=0',
        duration: '25 mins',
        instructor: 'C++ Systems Architecture Group',
        summary: 'Learn idiomatic C++ with <iostream>, std::string, function overloading, and basic conditional branching.',
        timestamps: [
          { time: '00:00', label: 'C++ Setup & std namespace' },
          { time: '05:30', label: 'cin, cout and stream operators' },
          { time: '11:00', label: 'std::string vs char arrays' },
          { time: '17:20', label: 'Control structures in C++' },
        ],
      },
      keyConcepts: [
        {
          title: 'I/O Streams & Fast I/O',
          points: [
            'Use std::cin >> var and std::cout << var for type-safe I/O',
            'std::ios_base::sync_with_stdio(false); std::cin.tie(NULL); for competitive programming speed',
            'Prefer "\\n" over std::endl when flushing output is unnecessary',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Standard Stream I/O & String Manipulation',
          language: 'cpp',
          code: `#include <iostream>
#include <string>

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);
    
    std::string name;
    int score;
    if (std::cin >> name >> score) {
        std::cout << "Student: " << name << ", Score: " << score << "\\n";
    }
    return 0;
}`,
          explanation: 'Idiomatic C++ reading string and integer with high-performance fast I/O configuration.',
        },
      ],
      commonPitfalls: [
        { problem: 'Mixing std::cin >> and std::getline()', solution: 'Call std::cin.ignore() after >> before getline() to consume trailing newline.' },
      ],
      referenceLinks: [
        { title: 'cppreference.com — C++ Reference', url: 'https://en.cppreference.com/', description: 'The premier standard reference for C++ language and library' },
      ],
      quickQuiz: [
        {
          question: 'What is the main purpose of std::cin.tie(NULL)?',
          options: ['Close the standard input', 'Untie cin from cout for faster execution', 'Clear the input buffer', 'Enable wide characters'],
          answerIndex: 1,
          explanation: 'By default cin is tied to cout; untying them stops cout from auto-flushing before every cin, speeding up I/O.',
        },
      ],
    },
    2: {
      language: 'C++',
      levelNumber: 2,
      levelTitle: 'Level 2 — Intermediate: STL Containers & Iterators',
      overview: 'Master std::vector, std::string, std::pair, iterators, and basic algorithms like std::sort and std::reverse.',
      video: {
        title: 'C++ Programming Level 2: Standard Template Library (STL)',
        embedUrl: 'https://www.youtube.com/embed/vLnPwxZdW4Y?start=1500',
        duration: '30 mins',
        instructor: 'C++ Systems Architecture Group',
        summary: 'Explore dynamic arrays (vector), sorting, binary search, and container traversal with range-based for loops.',
        timestamps: [
          { time: '00:00', label: 'Introduction to STL & std::vector' },
          { time: '08:00', label: 'Iterators & Range-Based For Loops' },
          { time: '16:30', label: 'std::sort & Custom Comparators' },
          { time: '23:45', label: 'std::pair and std::tuple' },
        ],
      },
      keyConcepts: [
        {
          title: 'STL Vector Operations',
          points: [
            'push_back() and emplace_back() add elements in amortized O(1) time',
            'std::sort(vec.begin(), vec.end()) sorts in O(N log N) using Introsort',
            'auto keyword deduces complex iterator types automatically',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Sorting Vector with Custom Lambda Comparator',
          language: 'cpp',
          code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> nums = {45, 12, 85, 32, 89, 39, 69, 44, 42, 1, 6, 8};
    
    // Sort descending
    std::sort(nums.begin(), nums.end(), [](int a, int b) {
        return a > b;
    });
    
    for (int n : nums) {
        std::cout << n << " ";
    }
    std::cout << "\\n";
    return 0;
}`,
          explanation: 'Demonstrates modern lambda comparator inside std::sort.',
        },
      ],
      commonPitfalls: [
        { problem: 'Iterator invalidation when resizing vectors', solution: 'Do not store iterators across push_back calls that may trigger capacity reallocations.' },
      ],
      referenceLinks: [
        { title: 'C++ STL Containers Guide', url: 'https://en.cppreference.com/w/cpp/container', description: 'Documentation on vector, map, set, unordered_map' },
      ],
      quickQuiz: [
        {
          question: 'What is the time complexity of std::sort in modern C++?',
          options: ['O(N^2)', 'O(N log N)', 'O(N)', 'O(log N)'],
          answerIndex: 1,
          explanation: 'std::sort is guaranteed to run in O(N log N) worst-case time using Introsort.',
        },
      ],
    },
    3: {
      language: 'C++',
      levelNumber: 3,
      levelTitle: 'Level 3 — Advanced: Classes, OOP & Memory Management',
      overview: 'Conquer object-oriented programming: constructors, destructors, RAII, encapsulation, inheritance, and smart pointers (std::unique_ptr).',
      video: {
        title: 'C++ Programming Level 3: OOP, RAII & Smart Pointers',
        embedUrl: 'https://www.youtube.com/embed/vLnPwxZdW4Y?start=3300',
        duration: '35 mins',
        instructor: 'C++ Systems Architecture Group',
        summary: 'Master virtual functions, dynamic polymorphism, copy/move constructors, and modern smart pointers.',
        timestamps: [
          { time: '00:00', label: 'Classes, Access Specifiers & Constructors' },
          { time: '10:00', label: 'Virtual Functions & Polymorphism' },
          { time: '19:30', label: 'RAII (Resource Acquisition Is Initialization)' },
          { time: '27:00', label: 'std::unique_ptr and std::shared_ptr' },
        ],
      },
      keyConcepts: [
        {
          title: 'RAII & Smart Pointers',
          points: [
            'RAII guarantees resources are released when the enclosing object goes out of scope',
            'std::unique_ptr manages exclusive ownership with zero overhead',
            'Mark base class destructors virtual to prevent slicing and leaks on deletion',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Polymorphic Hierarchy with Virtual Functions',
          language: 'cpp',
          code: `#include <iostream>
#include <memory>

class Shape {
public:
    virtual double area() const = 0; // Pure virtual
    virtual ~Shape() = default;
};

class Rectangle : public Shape {
    double w, h;
public:
    Rectangle(double width, double height) : w(width), h(height) {}
    double area() const override { return w * h; }
};

int main() {
    std::unique_ptr<Shape> s = std::make_unique<Rectangle>(5.0, 4.0);
    std::cout << "Area: " << s->area() << "\\n";
    return 0;
}`,
          explanation: 'Demonstrates abstract base class, override keyword, and modern memory management with std::make_unique.',
        },
      ],
      commonPitfalls: [
        { problem: 'Non-virtual destructor in base class', solution: 'Always declare virtual ~Base() = default; when using polymorphism.' },
      ],
      referenceLinks: [
        { title: 'C++ Core Guidelines', url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines', description: 'Guidelines from Bjarne Stroustrup and Herb Sutter' },
      ],
      quickQuiz: [
        {
          question: 'Can a std::unique_ptr be copied to another unique_ptr?',
          options: ['Yes, always', 'No, it can only be moved using std::move', 'Yes, with copy assignment', 'Only if cast to raw pointer'],
          answerIndex: 1,
          explanation: 'std::unique_ptr has a deleted copy constructor and can only be transferred with move semantics.',
        },
      ],
    },
    4: {
      language: 'C++',
      levelNumber: 4,
      levelTitle: 'Level 4 — Expert: Templates, Move Semantics & Concurrency',
      overview: 'Excel in template metaprogramming, rvalue references (&&), perfect forwarding, std::move, and high-performance algorithms.',
      video: {
        title: 'C++ Programming Level 4: Move Semantics, Templates & Optimization',
        embedUrl: 'https://www.youtube.com/embed/vLnPwxZdW4Y?start=5100',
        duration: '42 mins',
        instructor: 'C++ Systems Architecture Group',
        summary: 'Unpack rvalue references, perfect forwarding with std::forward, variadic templates, and cache-friendly computing.',
        timestamps: [
          { time: '00:00', label: 'Rvalue References & Move Semantics' },
          { time: '12:00', label: 'Rule of 5 in Modern C++' },
          { time: '21:30', label: 'Variadic Templates & Folding Expressions' },
          { time: '32:00', label: 'Memory Order & Multithreading Basics' },
        ],
      },
      keyConcepts: [
        {
          title: 'Move Semantics',
          points: [
            'std::move casts an lvalue to an rvalue, enabling resource theft instead of expensive deep copies',
            'Move constructors should always be marked noexcept for STL container guarantees',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Generic Template Function with Move Semantics',
          language: 'cpp',
          code: `#include <iostream>
#include <vector>
#include <utility>

template <typename T>
void appendData(std::vector<T>& dest, T&& val) {
    dest.push_back(std::forward<T>(val));
}

int main() {
    std::vector<std::string> words;
    std::string text = "SkillForge C++";
    appendData(words, std::move(text)); // text moved without copy
    std::cout << "Stored: " << words[0] << "\\n";
    return 0;
}`,
          explanation: 'Demonstrates universal references and perfect forwarding with std::forward.',
        },
      ],
      commonPitfalls: [
        { problem: 'Using an object after moving from it', solution: 'Moved-from objects are in a valid but unspecified state; do not read their value without reinitializing.' },
      ],
      referenceLinks: [
        { title: 'Effective Modern C++ by Scott Meyers', url: 'https://www.oreilly.com/library/view/effective-modern-c/9781491908419/', description: 'Essential concepts for modern C++ development' },
      ],
      quickQuiz: [
        {
          question: 'What does std::move(x) actually do at runtime?',
          options: ['Moves bytes in memory', 'Performs a static_cast to an rvalue reference', 'Deallocates x', 'Clones x to the heap'],
          answerIndex: 1,
          explanation: 'std::move does no runtime work; it is an unconditional cast to an rvalue reference (T&&).',
        },
      ],
    },
  },
  java: {
    1: {
      language: 'Java',
      levelNumber: 1,
      levelTitle: 'Level 1 — Beginner: JVM, Types & Control Flow',
      overview: 'Grasp the JVM execution pipeline, Scanner input, System.out, primitive types vs wrappers, and conditional loops.',
      video: {
        title: 'Java Programming Level 1: Fundamentals & Scanner I/O',
        embedUrl: 'https://www.youtube.com/embed/eIrMbAQSU34?start=0',
        duration: '26 mins',
        instructor: 'Oracle Certified Java Specialist',
        summary: 'Understand class definitions, public static void main, type conversions, and core arithmetic.',
        timestamps: [
          { time: '00:00', label: 'JDK, JRE & JVM Architecture' },
          { time: '06:00', label: 'public static void main(String[] args)' },
          { time: '11:45', label: 'Scanner for Reading Input' },
          { time: '17:30', label: 'Conditionals (if, switch expression)' },
        ],
      },
      keyConcepts: [
        {
          title: 'Java Basics',
          points: [
            'Java is strictly object-oriented: all executable code must reside inside a class',
            'Primitive types (int, double, boolean, char) are stored on the stack',
            'Always close or handle Scanner resources to prevent memory leaks',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Scanner Input & Conditional Processing',
          language: 'java',
          code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int number = scanner.nextInt();
            if (number % 2 == 0) {
                System.out.println(number + " is EVEN");
            } else {
                System.out.println(number + " is ODD");
            }
        }
        scanner.close();
    }
}`,
          explanation: 'Reading integer safely with hasNextInt and checking parity.',
        },
      ],
      commonPitfalls: [
        { problem: 'Comparing Strings with == instead of .equals()', solution: '== compares memory references; always use str1.equals(str2) for content equality.' },
      ],
      referenceLinks: [
        { title: 'Oracle Java Standard Edition Docs', url: 'https://docs.oracle.com/en/java/', description: 'Official Java SE documentation' },
      ],
      quickQuiz: [
        {
          question: 'Which method must be used to compare the content of two String objects in Java?',
          options: ['==', '.equals()', '.compare()', '.same()'],
          answerIndex: 1,
          explanation: '.equals() compares character contents, whereas == compares object references in memory.',
        },
      ],
    },
    2: {
      language: 'Java',
      levelNumber: 2,
      levelTitle: 'Level 2 — Intermediate: Arrays, Strings & Collections',
      overview: 'Advance to ArrayList, HashMap, StringBuilder, String manipulation, and modular functions.',
      video: {
        title: 'Java Programming Level 2: Collections Framework & Strings',
        embedUrl: 'https://www.youtube.com/embed/eIrMbAQSU34?start=1800',
        duration: '32 mins',
        instructor: 'Oracle Certified Java Specialist',
        summary: 'Explore ArrayList, HashSet, HashMap, iterator patterns, and immutable String behavior.',
        timestamps: [
          { time: '00:00', label: 'Arrays vs ArrayList' },
          { time: '09:00', label: 'StringBuilder for Efficient Mutations' },
          { time: '17:30', label: 'HashMap & HashSet Lookups in O(1)' },
          { time: '25:00', label: 'Collections.sort and Comparable' },
        ],
      },
      keyConcepts: [
        {
          title: 'Collections & Maps',
          points: [
            'ArrayList provides dynamic resizing with amortized O(1) additions',
            'HashMap stores key-value pairs with O(1) average lookup using hash codes',
            'StringBuilder avoids creating excessive intermediate objects in heap',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Frequency Counting with HashMap',
          language: 'java',
          code: `import java.util.HashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        String[] words = {"java", "code", "java", "assessment", "code", "java"};
        Map<String, Integer> freq = new HashMap<>();
        
        for (String w : words) {
            freq.put(w, freq.getOrDefault(w, 0) + 1);
        }
        
        for (Map.Entry<String, Integer> entry : freq.entrySet()) {
            System.out.println(entry.getKey() + ": " + entry.getValue());
        }
    }
}`,
          explanation: 'Demonstrates getOrDefault pattern for counting frequencies.',
        },
      ],
      commonPitfalls: [
        { problem: 'Modifying a Collection while iterating with for-each (ConcurrentModificationException)', solution: 'Use Iterator.remove() or removeIf().' },
      ],
      referenceLinks: [
        { title: 'Java Collections Framework Overview', url: 'https://docs.oracle.com/javase/8/docs/technotes/guides/collections/overview.html', description: 'Comprehensive guide on List, Set, Queue, and Map' },
      ],
      quickQuiz: [
        {
          question: 'What is the average time complexity for HashMap.get(key) in Java?',
          options: ['O(N)', 'O(log N)', 'O(1)', 'O(N log N)'],
          answerIndex: 2,
          explanation: 'HashMap provides O(1) average lookup time via hash bucket indexing.',
        },
      ],
    },
    3: {
      language: 'Java',
      levelNumber: 3,
      levelTitle: 'Level 3 — Advanced: OOP, Interfaces & Exception Handling',
      overview: 'Implement inheritance, polymorphism, abstract classes, interfaces, checked vs unchecked exceptions, and try-with-resources.',
      video: {
        title: 'Java Programming Level 3: OOP Architecture & Exceptions',
        embedUrl: 'https://www.youtube.com/embed/eIrMbAQSU34?start=3600',
        duration: '36 mins',
        instructor: 'Oracle Certified Java Specialist',
        summary: 'Master abstract classes, default interface methods, custom exception hierarchies, and robust error management.',
        timestamps: [
          { time: '00:00', label: 'Encapsulation & Access Modifiers' },
          { time: '09:00', label: 'Inheritance & super Keyword' },
          { time: '18:00', label: 'Interfaces & Multiple Contract Implementation' },
          { time: '27:00', label: 'try-with-resources & Exception Handling' },
        ],
      },
      keyConcepts: [
        {
          title: 'Interfaces vs Abstract Classes',
          points: [
            'Interfaces define contracts ("can-do"); a class can implement multiple interfaces',
            'Abstract classes share state and partial implementation ("is-a")',
            'try-with-resources automatically closes AutoCloseable implementations',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Polymorphic Interface Implementation',
          language: 'java',
          code: `interface Evaluator {
    boolean evaluate(int score);
}

public class Main {
    public static void main(String[] args) {
        Evaluator passingRule = score -> score >= 100;
        System.out.println("Passed? " + passingRule.evaluate(100));
    }
}`,
          explanation: 'Functional interface implemented using a clean modern Java lambda expression.',
        },
      ],
      commonPitfalls: [
        { problem: 'Catching generic Exception and suppressing errors silently', solution: 'Catch specific exceptions and log or re-throw meaningful context.' },
      ],
      referenceLinks: [
        { title: 'Baeldung — Modern Java OOP Tutorials', url: 'https://www.baeldung.com/category/java/', description: 'Industry-standard enterprise Java best practices' },
      ],
      quickQuiz: [
        {
          question: 'Can a Java class implement multiple interfaces?',
          options: ['No, only single implementation is allowed', 'Yes, a class can implement any number of interfaces', 'Only if they have no methods', 'Only through abstract classes'],
          answerIndex: 1,
          explanation: 'While Java does not support multiple class inheritance, it fully supports implementing multiple interfaces.',
        },
      ],
    },
    4: {
      language: 'Java',
      levelNumber: 4,
      levelTitle: 'Level 4 — Expert: Streams API, Concurrency & Generics',
      overview: 'Master Java 8+ Streams (map, filter, reduce), lambda expressions, multithreading with ExecutorService, and type-safe generics.',
      video: {
        title: 'Java Programming Level 4: Streams API, Concurrency & Generics',
        embedUrl: 'https://www.youtube.com/embed/eIrMbAQSU34?start=5400',
        duration: '44 mins',
        instructor: 'Oracle Certified Java Specialist',
        summary: 'Master functional programming in Java, parallel streams, thread synchronization, and generic type bounds.',
        timestamps: [
          { time: '00:00', label: 'Functional Interfaces & Method References' },
          { time: '12:00', label: 'Stream Operations: filter, map, flatMap, collect' },
          { time: '24:00', label: 'Generics: Wildcards <? extends T> and <? super T>' },
          { time: '34:00', label: 'Thread Safety & Concurrent Collections' },
        ],
      },
      keyConcepts: [
        {
          title: 'Stream Pipelines',
          points: [
            'Streams are lazy: intermediate operations are only executed upon terminal operation invocation (e.g. collect, forEach)',
            'Use parallelStream() cautiously when computational overhead warrants multi-core scheduling',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Filtering and Grouping with Streams',
          language: 'java',
          code: `import java.util.List;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        List<String> names = List.of("Alice", "Bob", "Alexander", "Charlie", "Amy");
        List<String> filtered = names.stream()
            .filter(n -> n.startsWith("A"))
            .map(String::toUpperCase)
            .sorted()
            .collect(Collectors.toList());
            
        System.out.println(filtered); // [ALEXANDER, ALICE, AMY]
    }
}`,
          explanation: 'Shows declarative stream pipeline chaining filter, method reference map, and sorted collectors.',
        },
      ],
      commonPitfalls: [
        { problem: 'Reusing a consumed Stream (IllegalStateException)', solution: 'Streams cannot be reused once consumed by a terminal operation; recreate the stream pipeline.' },
      ],
      referenceLinks: [
        { title: 'Java Stream API Official Documentation', url: 'https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html', description: 'Complete documentation for Stream interface' },
      ],
      quickQuiz: [
        {
          question: 'Which of the following is a terminal operation in Java Streams?',
          options: ['filter()', 'map()', 'collect()', 'sorted()'],
          answerIndex: 2,
          explanation: 'collect() is a terminal operation that triggers the stream execution pipeline and produces a result.',
        },
      ],
    },
  },
  python: {
    1: {
      language: 'Python',
      levelNumber: 1,
      levelTitle: 'Level 1 — Beginner: Syntax, Types & Control Flow',
      overview: 'Understand Python dynamic typing, input(), print(), f-strings, conditional blocks (if-elif-else), and basic math operations.',
      video: {
        title: 'Python Programming Level 1: Core Syntax & I/O',
        embedUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc?start=0',
        duration: '20 mins',
        instructor: 'Python Software Foundation Educator',
        summary: 'Learn clean, idiomatic Python: indentation rules, dynamic variables, arithmetic, and user input handling.',
        timestamps: [
          { time: '00:00', label: 'Python Philosophy & Indentation' },
          { time: '04:30', label: 'Variables & Built-In Types (int, float, str, bool)' },
          { time: '09:00', label: 'input(), type casting & f-strings' },
          { time: '14:20', label: 'if, elif, else Conditional Branches' },
        ],
      },
      keyConcepts: [
        {
          title: 'Python Essentials',
          points: [
            'Indentation (4 spaces) defines code blocks instead of curly braces {}',
            'input() always returns a string; use int() or float() to parse numbers',
            'f-strings (f"Score: {score}") allow clean, inline expression interpolation',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Reading Multiple Values & F-String Output',
          language: 'python',
          code: `# Read two integers from a single line
a, b = map(int, input().split())

sum_val = a + b
product_val = a * b

print(f"Sum: {sum_val}, Product: {product_val}")
if sum_val > 100:
    print("Sum exceeds 100")
else:
    print("Within normal range")`,
          explanation: 'Idiomatic Python single-line multi-input mapping and f-string printing.',
        },
      ],
      commonPitfalls: [
        { problem: 'Concatenating string with integer without casting', solution: 'Use f-strings or str(num) explicitly.' },
      ],
      referenceLinks: [
        { title: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/', description: 'The official Python documentation tutorial' },
      ],
      quickQuiz: [
        {
          question: 'What is the type of the value returned by the built-in input() function in Python 3?',
          options: ['int', 'str', 'float', 'None'],
          answerIndex: 1,
          explanation: 'input() always returns a str object, requiring explicit casting with int() or float().',
        },
      ],
    },
    2: {
      language: 'Python',
      levelNumber: 2,
      levelTitle: 'Level 2 — Intermediate: Lists, Tuples, Dictionaries & Sets',
      overview: 'Master Python core collections: list slicing, list comprehensions, dictionary operations, and sets.',
      video: {
        title: 'Python Programming Level 2: Data Structures & Comprehensions',
        embedUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc?start=1800',
        duration: '28 mins',
        instructor: 'Python Software Foundation Educator',
        summary: 'Explore list comprehensions, dictionary key lookups, set operations, and sorting with key functions.',
        timestamps: [
          { time: '00:00', label: 'Lists & Slicing ([start:stop:step])' },
          { time: '07:30', label: 'List Comprehensions' },
          { time: '14:00', label: 'Dictionaries & .get() Default Values' },
          { time: '21:00', label: 'Sets & Fast Membership Testing' },
        ],
      },
      keyConcepts: [
        {
          title: 'List Slicing & Comprehensions',
          points: [
            'lst[::-1] creates a reversed copy of the list in O(N)',
            '[x**2 for x in nums if x % 2 == 0] filters and maps in one expressive expression',
            'dict.get(key, default) avoids throwing KeyError on missing entries',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Dictionary Frequency Counter & List Comprehension',
          language: 'python',
          code: `text = "skillforge python assessment"
counts = {}

for ch in text:
    if ch.isalpha():
        counts[ch] = counts.get(ch, 0) + 1

# List of letters appearing more than once
repeated = [k for k, v in counts.items() if v > 1]
print(f"Repeated letters: {repeated}")`,
          explanation: 'Counts frequencies with .get() and filters repeating keys using list comprehension.',
        },
      ],
      commonPitfalls: [
        { problem: 'Default mutable arguments in functions (def add(item, lst=[]))', solution: 'Use None as default: def add(item, lst=None): if lst is None: lst = [].' },
      ],
      referenceLinks: [
        { title: 'Real Python — Data Structures in Python', url: 'https://realpython.com/python-data-structures/', description: 'In-depth articles on Python list, dict, set, and tuple performance' },
      ],
      quickQuiz: [
        {
          question: 'What is the average time complexity of checking membership in a Python set (x in my_set)?',
          options: ['O(1)', 'O(N)', 'O(log N)', 'O(N^2)'],
          answerIndex: 0,
          explanation: 'Python sets are implemented as hash tables with O(1) average lookup time.',
        },
      ],
    },
    3: {
      language: 'Python',
      levelNumber: 3,
      levelTitle: 'Level 3 — Advanced: Functions, Modules & OOP',
      overview: 'Implement *args, **kwargs, lambda functions, decorators, class constructors (__init__), and dunder methods.',
      video: {
        title: 'Python Programming Level 3: OOP, Decorators & Scope',
        embedUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc?start=3600',
        duration: '32 mins',
        instructor: 'Python Software Foundation Educator',
        summary: 'Master object-oriented Python, method resolution order (MRO), custom decorators, and generator expressions.',
        timestamps: [
          { time: '00:00', label: 'Functions as First-Class Citizens' },
          { time: '08:00', label: 'Decorators (@functools.wraps)' },
          { time: '16:00', label: 'Classes, self & __init__' },
          { time: '24:00', label: 'Special Methods: __str__, __repr__, __eq__' },
        ],
      },
      keyConcepts: [
        {
          title: 'First-Class Functions & Decorators',
          points: [
            'Functions can be passed as arguments and returned from other functions',
            'Decorators wrap function execution to provide logging, timing, or validation',
            'Use @classmethod and @staticmethod appropriately for factory and utility methods',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Timing Decorator & Clean Class Definition',
          language: 'python',
          code: `class Student:
    def __init__(self, name: str, score: int):
        self.name = name
        self.score = score
        
    def has_passed(self) -> bool:
        return self.score >= 100
        
    def __repr__(self) -> str:
        return f"Student(name={self.name!r}, score={self.score})"

s = Student("Alex", 100)
print(s)
print(f"Passed: {s.has_passed()}")`,
          explanation: 'Demonstrates clean Pythonic class structure with type hints and __repr__ formatting.',
        },
      ],
      commonPitfalls: [
        { problem: 'Forgetting self parameter in instance methods', solution: 'Instance methods must take self as their first parameter.' },
      ],
      referenceLinks: [
        { title: 'Python Decorators Guide', url: 'https://realpython.com/primer-on-python-decorators/', description: 'Mastering closures and decorators' },
      ],
      quickQuiz: [
        {
          question: 'What is the purpose of the self parameter in Python class methods?',
          options: ['References the current class definition', 'References the specific instance of the class', 'Initializes static memory', 'Defines a private variable'],
          answerIndex: 1,
          explanation: 'self refers to the current object instance, allowing access to instance attributes and methods.',
        },
      ],
    },
    4: {
      language: 'Python',
      levelNumber: 4,
      levelTitle: 'Level 4 — Expert: Generators, Concurrency & Metaprogramming',
      overview: 'Conquer yield generators, itertools, context managers, async/await asyncio concurrency, and memory optimization.',
      video: {
        title: 'Python Programming Level 4: Generators, AsyncIO & Internals',
        embedUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc?start=5400',
        duration: '45 mins',
        instructor: 'Python Software Foundation Educator',
        summary: 'Deep dive into Python GIL, asynchronous coroutines with asyncio, custom context managers, and memory slots.',
        timestamps: [
          { time: '00:00', label: 'Generators & Memory-Efficient Iteration' },
          { time: '12:00', label: 'Custom Context Managers with contextlib' },
          { time: '22:00', label: 'AsyncIO Event Loop & Coroutines' },
          { time: '34:00', label: 'CPython Internals, Memory Slots & GIL' },
        ],
      },
      keyConcepts: [
        {
          title: 'Generators vs Lists',
          points: [
            'Generators compute values on-demand using yield, achieving O(1) memory usage',
            'asyncio provides single-threaded cooperative multitasking for I/O bound workloads',
            '__slots__ avoids dynamic dict creation on instances, reducing memory footprint by ~40%',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Memory-Efficient Generator Pipeline',
          language: 'python',
          code: `def fibonacci_stream(limit: int):
    a, b = 0, 1
    for _ in range(limit):
        yield a
        a, b = b, a + b

# Compute on-demand without storing millions of items in memory
fibs = list(fibonacci_stream(10))
print("First 10 Fibonaccis:", fibs)`,
          explanation: 'Using yield to generate sequence elements without preallocating arrays.',
        },
      ],
      commonPitfalls: [
        { problem: 'Blocking the asyncio event loop with CPU-bound code', solution: 'Use run_in_executor with ProcessPoolExecutor for CPU-heavy tasks.' },
      ],
      referenceLinks: [
        { title: 'Python asyncio Official Documentation', url: 'https://docs.python.org/3/library/asyncio.html', description: 'Asynchronous I/O, event loops, and tasks' },
      ],
      quickQuiz: [
        {
          question: 'What keyword turns a normal Python function into a generator function?',
          options: ['return', 'yield', 'async', 'generate'],
          answerIndex: 1,
          explanation: 'Using yield causes the function to return a generator iterator that produces values lazily.',
        },
      ],
    },
  },
  javascript: {
    1: {
      language: 'JavaScript',
      levelNumber: 1,
      levelTitle: 'Level 1 — Beginner: Variables, Data Types & Functions',
      overview: 'Understand modern JS (let, const, var), primitives, template literals, conditional operators, and arrow functions.',
      video: {
        title: 'JavaScript Level 1: Core Syntax & Functions',
        embedUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk?start=0',
        duration: '24 mins',
        instructor: 'Fullstack JS Instructor',
        summary: 'Learn ES6+ features, let vs const, arrow functions, and basic DOM/console input/output.',
        timestamps: [
          { time: '00:00', label: 'JavaScript Engine & Runtime' },
          { time: '05:00', label: 'let, const vs var & Scope' },
          { time: '11:00', label: 'Template Literals & String Methods' },
          { time: '17:00', label: 'Arrow Functions & Return Values' },
        ],
      },
      keyConcepts: [
        {
          title: 'Variables & Scope',
          points: [
            'const prevents reassignment; let is block-scoped and mutable; avoid var',
            'Always use strict equality === to avoid unexpected implicit type coercion',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Modern ES6 Arrow Function & Ternary Check',
          language: 'javascript',
          code: `const evaluatePass = (score) => {
    return score >= 100 ? "PERFECT_SCORE_CLEARED" : "NEEDS_RETRY";
};

console.log(evaluatePass(100)); // PERFECT_SCORE_CLEARED`,
          explanation: 'Clean arrow function with ternary conditional evaluation.',
        },
      ],
      commonPitfalls: [
        { problem: 'Using loose equality == instead of strict equality ===', solution: 'Always use === to avoid coercion like 0 == false or "" == false.' },
      ],
      referenceLinks: [
        { title: 'MDN Web Docs — JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', description: 'The official web standard documentation' },
      ],
      quickQuiz: [
        {
          question: 'What is the output of typeof null in JavaScript?',
          options: ['"null"', '"undefined"', '"object"', '"boolean"'],
          answerIndex: 2,
          explanation: 'typeof null returns "object" due to a historical design quirk in the original JavaScript implementation.',
        },
      ],
    },
    2: {
      language: 'JavaScript',
      levelNumber: 2,
      levelTitle: 'Level 2 — Intermediate: Arrays, Objects & Higher-Order Methods',
      overview: 'Master Array methods (map, filter, reduce), object destructuring, spread/rest operators, and JSON handling.',
      video: {
        title: 'JavaScript Level 2: Array Methods (map, filter, reduce) & Objects',
        embedUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk?start=1500',
        duration: '30 mins',
        instructor: 'Fullstack JS Instructor',
        summary: 'Harness the power of functional array transformations, deep destructuring, and Object methods.',
        timestamps: [
          { time: '00:00', label: 'Array.prototype.map & filter' },
          { time: '10:00', label: 'Array.prototype.reduce Demystified' },
          { time: '18:00', label: 'Object & Array Destructuring' },
          { time: '24:00', label: 'Spread (...) and Rest Parameters' },
        ],
      },
      keyConcepts: [
        {
          title: 'Functional Array Methods',
          points: [
            'map creates a new array of same length with transformed values',
            'filter returns elements that satisfy the predicate callback',
            'reduce accumulates array values into a single summary structure (number, object, etc.)',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Map, Filter and Reduce Pipeline',
          language: 'javascript',
          code: `const assessments = [
    { level: 1, score: 100, passed: true },
    { level: 2, score: 80, passed: false },
    { level: 3, score: 100, passed: true },
];

const clearedLevels = assessments
    .filter(a => a.passed)
    .map(a => a.level);

console.log("Cleared Levels:", clearedLevels); // [1, 3]`,
          explanation: 'Demonstrates chaining filter and map for clean data transformation.',
        },
      ],
      commonPitfalls: [
        { problem: 'Mutating original arrays with methods like .sort() or .splice()', solution: 'Use [...arr].sort() or .toSorted() to preserve original data immutability.' },
      ],
      referenceLinks: [
        { title: 'JavaScript.info — Array Methods', url: 'https://javascript.info/array-methods', description: 'Visual explanation of all array methods' },
      ],
      quickQuiz: [
        {
          question: 'Does Array.prototype.map() modify the original array in place?',
          options: ['Yes, always', 'No, it returns a new array', 'Only if the array contains numbers', 'Only in strict mode'],
          answerIndex: 1,
          explanation: 'map() never modifies the original array; it always allocates and returns a new array.',
        },
      ],
    },
    3: {
      language: 'JavaScript',
      levelNumber: 3,
      levelTitle: 'Level 3 — Advanced: Asynchronous JS, Promises & Closures',
      overview: 'Conquer the event loop, Promises, async/await, closures, lexical scope, and error handling with try/catch.',
      video: {
        title: 'JavaScript Level 3: Event Loop, Promises & Async/Await',
        embedUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk?start=3300',
        duration: '38 mins',
        instructor: 'Fullstack JS Instructor',
        summary: 'Deep dive into microtasks, macrotasks, Promise.all, closures, and async/await syntax.',
        timestamps: [
          { time: '00:00', label: 'Call Stack & Event Loop Architecture' },
          { time: '11:00', label: 'Promises: resolve, reject, then, catch' },
          { time: '20:00', label: 'async/await & Sequential vs Concurrent' },
          { time: '29:00', label: 'Closures & Private State in Functions' },
        ],
      },
      keyConcepts: [
        {
          title: 'The Event Loop & Promises',
          points: [
            'Microtasks (Promises) execute before macrotasks (setTimeout)',
            'Promise.all executes multiple promises in parallel, failing fast on rejection',
            'async functions always return a Promise implicitly',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Concurrent Fetching with Promise.all and Async/Await',
          language: 'javascript',
          code: `async function loadDashboard() {
    try {
        const [profile, courses] = await Promise.all([
            fetch('/api/profile').then(r => r.json()),
            fetch('/api/courses').then(r => r.json())
        ]);
        console.log("Loaded concurrently:", profile, courses);
    } catch (err) {
        console.error("Failed to load dashboard data:", err);
    }
}`,
          explanation: 'Parallel async calls using Promise.all wrapped in try/catch.',
        },
      ],
      commonPitfalls: [
        { problem: 'Uncaught Promise rejection', solution: 'Always attach .catch() or wrap await expressions in a try/catch block.' },
      ],
      referenceLinks: [
        { title: 'MDN Web Docs — Using Promises', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises', description: 'Complete guide on asynchronous patterns' },
      ],
      quickQuiz: [
        {
          question: 'What executes first: a resolved Promise .then callback or a setTimeout(..., 0) callback?',
          options: ['setTimeout', 'Promise .then callback', 'They run simultaneously', 'Depends on browser engine'],
          answerIndex: 1,
          explanation: 'Promise callbacks are microtasks, which always have priority over macrotasks like setTimeout.',
        },
      ],
    },
    4: {
      language: 'JavaScript',
      levelNumber: 4,
      levelTitle: 'Level 4 — Expert: Prototypes, Web Workers & Design Patterns',
      overview: 'Conquer prototypical inheritance, Proxy, Reflect, Web Workers, memory management, and modern design patterns.',
      video: {
        title: 'JavaScript Level 4: Prototypal Inheritance & Performance',
        embedUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk?start=5100',
        duration: '45 mins',
        instructor: 'Fullstack JS Instructor',
        summary: 'Explore V8 engine internals, hidden classes, Proxy traps, and high-performance JavaScript.',
        timestamps: [
          { time: '00:00', label: 'Prototypal Inheritance Chain (__proto__)' },
          { time: '14:00', label: 'Proxy and Reflect APIs' },
          { time: '26:00', label: 'Web Workers for Multi-Threaded Execution' },
          { time: '36:00', label: 'V8 JIT Optimization & Hidden Classes' },
        ],
      },
      keyConcepts: [
        {
          title: 'Prototypes & Proxies',
          points: [
            'Every JS object has an internal [[Prototype]] link',
            'Proxy enables intercepting fundamental operations (get, set, has, apply)',
            'Use WeakMap and WeakSet to hold object references without preventing garbage collection',
          ],
        },
      ],
      codeExamples: [
        {
          title: '1. Validation Proxy for Object Protection',
          language: 'javascript',
          code: `const validator = {
    set(target, prop, value) {
        if (prop === 'score') {
            if (typeof value !== 'number' || value < 0 || value > 100) {
                throw new RangeError("Score must be between 0 and 100");
            }
        }
        target[prop] = value;
        return true;
    }
};

const student = new Proxy({}, validator);
student.score = 100; // Success
// student.score = 120; // Throws RangeError`,
          explanation: 'Using JavaScript Proxy to enforce runtime boundary validations.',
        },
      ],
      commonPitfalls: [
        { problem: 'Accidental memory leaks via detached DOM or uncleared intervals', solution: 'Always call clearInterval() and release object references in single-page apps.' },
      ],
      referenceLinks: [
        { title: 'V8 JavaScript Engine Architecture', url: 'https://v8.dev/', description: 'Articles on JIT compilation, garbage collection, and optimization' },
      ],
      quickQuiz: [
        {
          question: 'What is the primary benefit of WeakMap over regular Map?',
          options: ['Faster lookups', 'Keys are weakly referenced and do not prevent garbage collection', 'Can hold primitive keys', 'Maintains alphabetical order'],
          answerIndex: 1,
          explanation: 'WeakMap keys must be objects and are weakly held, allowing memory to be reclaimed when no other references exist.',
        },
      ],
    },
  },
};

/**
 * Fallback helper to provide high-quality study materials for any course or custom course level
 */
export function getStudyMaterial(language: string, levelNumber: number, levelTitle?: string, topics: string[] = []): StudyMaterial {
  const langKey = language?.toLowerCase().trim() || 'c';
  
  if (STUDY_MATERIALS[langKey] && STUDY_MATERIALS[langKey][levelNumber]) {
    return STUDY_MATERIALS[langKey][levelNumber];
  }

  // Fallback generation for custom courses
  const capitalizedLang = language.charAt(0).toUpperCase() + language.slice(1);
  const topicsText = topics.length > 0 ? topics.join(', ') : 'Syntax, Logic, Algorithms and Best Practices';

  return {
    language: capitalizedLang,
    levelNumber,
    levelTitle: levelTitle || `Level ${levelNumber} — Assessment Preparation`,
    overview: `Comprehensive preparation guide for ${capitalizedLang} Level ${levelNumber}. Focuses on ${topicsText}.`,
    video: {
      title: `${capitalizedLang} Programming: Level ${levelNumber} Concepts & Walkthrough`,
      embedUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0',
      duration: '30 mins',
      instructor: 'SkillForge Senior Technical Faculty',
      summary: `In-depth visual breakdown covering essential patterns, edge-cases, and debugging techniques for Level ${levelNumber}.`,
      timestamps: [
        { time: '00:00', label: 'Concept Overview & Core Syntax' },
        { time: '08:30', label: 'Data Structures & Problem-Solving Approach' },
        { time: '17:45', label: 'Common Pitfalls & 100/100 Test Case Strategies' },
        { time: '24:10', label: 'Live Code Walkthrough & Optimization' },
      ],
    },
    keyConcepts: [
      {
        title: `Key Competencies for Level ${levelNumber}`,
        points: topics.length > 0 
          ? topics.map(t => `Mastery of ${t} and boundary condition handling`) 
          : ['Thorough edge-case testing', 'Correct memory and variable state handling', 'Optimal algorithm time complexity'],
      },
      {
        title: 'Exam Success Strategy',
        points: [
          'Read problem statement constraints and sample input/output carefully',
          'Ensure your program handles zero, negative, maximum limits, and empty inputs',
          'Aim to pass all 5 official evaluation test cases on both questions for 100/100',
        ],
      },
    ],
    codeExamples: [
      {
        title: `Idiomatic ${capitalizedLang} Example`,
        language: langKey,
        code: `// ${capitalizedLang} Level ${levelNumber} Demonstration
// Focus on cleanly reading input and handling constraints
// Topics covered: ${topicsText}`,
        explanation: 'Reference template showing input parsing, logic implementation, and clean output formatting.',
      },
    ],
    commonPitfalls: [
      {
        problem: 'Failing hidden test cases due to unexpected whitespace or newline mismatch',
        solution: 'Match the exact format requested in the specification; avoid printing extra prompt text like "Enter number:".',
      },
      {
        problem: 'Time Limit Exceeded (TLE) on large inputs',
        solution: 'Select appropriate algorithms (O(N) or O(N log N)) rather than nested loops (O(N^2)) for large dataset constraints.',
      },
    ],
    referenceLinks: [
      {
        title: `Official ${capitalizedLang} Documentation`,
        url: 'https://devdocs.io',
        description: `Authoritative standard library and language specifications for ${capitalizedLang}`,
      },
    ],
    quickQuiz: [
      {
        question: `To pass Level ${levelNumber} and unlock the next tier, what score is strictly required?`,
        options: ['50 / 100', '75 / 100', '100 / 100 (All test cases must pass)', 'Depends on the course'],
        answerIndex: 2,
        explanation: 'SkillForge assessments require a perfect 100/100 score (all 10 test cases passed across both questions) to unlock the next level.',
      },
    ],
  };
}
