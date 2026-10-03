import type { Problem, Topic } from "./types.js";

const now = "2026-10-03T00:00:00.000Z";

export const codeTourTopics: Topic[] = [
  { id: "complexity", name: "Complexity & constraints", description: "Turn constraints into an acceptable time complexity before coding.", createdAt: now },
  { id: "prefix-sum", name: "Prefix sums", description: "Range sums, balance arrays, and prefix-frequency invariants.", createdAt: now },
  { id: "sorting-greedy", name: "Sorting & greedy", description: "Exchange arguments, scheduling, and budget-to-maximum-count patterns.", createdAt: now },
  { id: "binary-search", name: "Binary search", description: "Bounds, monotone predicates, and searching the answer.", createdAt: now },
  { id: "number-theory", name: "Number theory", description: "GCD, sieve, SPF, factorization, and prime exponents.", createdAt: now },
  { id: "graph", name: "Graphs", description: "BFS, DFS, DSU, shortest paths, and graph modeling.", createdAt: now },
  { id: "fenwick", name: "Fenwick & offline queries", description: "Coordinate compression, sweep order, and point/range aggregation.", createdAt: now },
  { id: "contest", name: "Contest execution", description: "Problem scanning, partial scoring, debugging, and penalty discipline.", createdAt: now },
];

export const codeTourProblems: Problem[] = [
  {
    id: "threshold-homework",
    title: "Threshold homework",
    topic: "prefix-sum",
    difficulty: "easy",
    statement: "Given N tasks with required skill b and time a, answer each query x with the total time of tasks whose required skill is at most x.",
    constraints: ["1 <= N,Q <= 200000", "0 <= a,b,x <= 1000000000"],
    language: "cpp",
    sourceUrl: "https://oj.vnoi.info/problem/codetour24_c2_a",
    tests: [
      { name: "mixed thresholds", input: "4 4\n3 5\n2 1\n7 5\n4 9\n0\n1\n5\n10\n", expected: "0\n2\n12\n16\n" },
      { name: "duplicate threshold", input: "3 2\n5 2\n6 2\n1 3\n2\n3\n", expected: "11\n12\n" },
    ],
    createdAt: now,
  },
  {
    id: "maximum-subarray",
    title: "Maximum subarray sum",
    topic: "prefix-sum",
    difficulty: "easy",
    statement: "Given an integer array, print the maximum sum of a non-empty contiguous subarray.",
    constraints: ["1 <= N <= 200000", "-1000000000 <= a[i] <= 1000000000"],
    language: "cpp",
    tests: [
      { name: "mixed", input: "5\n-2 1 -3 4 5\n", expected: "9\n" },
      { name: "all negative", input: "4\n-9 -2 -7 -3\n", expected: "-2\n" },
    ],
    createdAt: now,
  },
  {
    id: "training-budget",
    title: "Training budget",
    topic: "sorting-greedy",
    difficulty: "easy",
    statement: "Each player has current skill a and gains b per training. With at most C training units total, maximize how many players reach skill K.",
    constraints: ["1 <= N <= 200000", "1 <= b,K <= 1000000000", "0 <= C <= 1000000000000000000"],
    language: "cpp",
    tests: [
      { name: "choose cheapest", input: "4 5 10\n8 1\n3 2\n10 7\n1 3\n", expected: "3\n" },
      { name: "none affordable", input: "2 0 100\n1 1\n99 1\n", expected: "1\n" },
    ],
    createdAt: now,
  },
  {
    id: "count-components",
    title: "Count connected components",
    topic: "graph",
    difficulty: "easy",
    statement: "Given an undirected graph, print its number of connected components.",
    constraints: ["1 <= N,M <= 200000", "1 <= u,v <= N"],
    language: "cpp",
    tests: [
      { name: "three groups", input: "6 3\n1 2\n2 3\n5 6\n", expected: "3\n" },
      { name: "isolated", input: "3 0\n", expected: "3\n" },
    ],
    createdAt: now,
  },
  {
    id: "divisible-product",
    title: "Divisibility of a huge product",
    topic: "number-theory",
    difficulty: "medium",
    statement: "Given A as the product of N positive integers, answer whether A is divisible by X^P for each query. Never construct A directly.",
    constraints: ["1 <= a[i],X <= 1000000", "1 <= N,Q <= 200000", "1 <= P <= 1000000000"],
    language: "cpp",
    sourceUrl: "https://oj.vnoi.info/problem/codetour24_c2_e",
    tests: [
      { name: "prime exponents", input: "3 4\n12 5 10\n2 3\n5 2\n6 1\n10 3\n", expected: "YES\nYES\nYES\nNO\n" },
    ],
    createdAt: now,
  },
];

export const codeTourPlan = `# Code Tour preparation track

This is an editable starter track, not a locked course.

## Phase 1 — reflexes
1. Read constraints and state the target complexity before coding.
2. Prefix sums, frequencies, sorting, lower_bound/upper_bound.
3. Greedy by cost and binary search on a monotone answer.
4. GCD, sieve, SPF, and prime-exponent reasoning.

## Phase 2 — contest core
5. Two pointers, hash maps, circular sequences, and string invariants.
6. BFS/DFS, DSU, Dijkstra, and grid modeling.
7. Fenwick tree, coordinate compression, and offline queries.
8. Basic 1D/2D DP; learn to identify and take subtasks.

## Phase 3 — simulation
9. Two-hour mock: scan all tasks first, solve sure points, then hunt partials.
10. Review every wrong answer by failure class: idea, proof, implementation, edge case, or time.

## AI boundary
AI is for preparation and post-session review only. Enable contest mode before an official round; the CLI will block its AI commands.
`;
