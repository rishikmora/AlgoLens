export type Lang = "javascript" | "python" | "cpp" | "java" | "go" | "rust";

export const LANGS: { id: Lang; label: string; ext: string }[] = [
  { id: "javascript", label: "JavaScript", ext: "js" },
  { id: "python", label: "Python", ext: "py" },
  { id: "cpp", label: "C++", ext: "cpp" },
  { id: "java", label: "Java", ext: "java" },
  { id: "go", label: "Go", ext: "go" },
  { id: "rust", label: "Rust", ext: "rs" },
];

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  args: unknown[];
  expected: unknown;
}

export interface Problem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  acceptance: number;
  companies: string[];
  topics: string[];
  /** Function the judge will call. */
  fn: string;
  /** Names of the arguments, in order — shown in the custom-input panel. */
  params: string[];
  description: string;
  constraints: string[];
  examples: Example[];
  /** Four escalating hints: nudge → direction → name the tool → pseudocode. */
  hints: [string, string, string, string];
  editorial: {
    approach: string;
    time: string;
    space: string;
    code: string;
  };
  /** Key into the visualizer registry, when this problem has a canned animation. */
  viz?: string;
  starter: Record<Lang, string>;
  tests: TestCase[];
}

const genericStarter = (
  fn: string,
  params: string[],
  jsBody = "  // Write your solution here\n",
): Record<Lang, string> => {
  const p = params.join(", ");
  const snake = fn.replace(/([A-Z])/g, "_$1").toLowerCase();
  return {
    javascript: `function ${fn}(${p}) {\n${jsBody}}\n`,
    python: `def ${snake}(${p}):\n    # Write your solution here\n    pass\n`,
    cpp: `class Solution {\npublic:\n    // Write your solution here\n};\n`,
    java: `class Solution {\n    // Write your solution here\n}\n`,
    go: `func ${fn[0].toUpperCase() + fn.slice(1)}(${p} int) int {\n\t// Write your solution here\n\treturn 0\n}\n`,
    rust: `impl Solution {\n    // Write your solution here\n}\n`,
  };
};

export const PROBLEMS: Problem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    acceptance: 54,
    companies: ["Amazon", "Google", "Microsoft", "Adobe", "Uber"],
    topics: ["Arrays", "Hash Map", "Frequency"],
    fn: "twoSum",
    params: ["nums", "target"],
    description:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input has **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9, so we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    hints: [
      "Think about what you need to *look up* as you walk the array.",
      "For each number, you already know the value you need. Can you preprocess what you have seen so far?",
      "Use a Hash Map from value → index, filled as you scan.",
      "seen = {}\nfor i, x in nums:\n    need = target - x\n    if need in seen: return [seen[need], i]\n    seen[x] = i",
    ],
    editorial: {
      approach:
        "The brute force checks every pair in O(n²). The insight is that for each element x we know exactly what we need: target - x. A hash map gives us O(1) lookup for 'have I seen that value?', so one pass is enough.",
      time: "O(n)",
      space: "O(n)",
      code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    },
    viz: "two-sum",
    starter: {
      javascript: "function twoSum(nums, target) {\n  // Write your solution here\n}\n",
      python: "def two_sum(nums, target):\n    # Write your solution here\n    pass\n",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};\n",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n    }\n}\n",
      go: "func twoSum(nums []int, target int) []int {\n\t// Write your solution here\n}\n",
      rust: "impl Solution {\n    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {\n        // Write your solution here\n    }\n}\n",
    },
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      { args: [[0, 4, 3, 0], 0], expected: [0, 3] },
    ],
  },

  {
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    acceptance: 58,
    companies: ["Google", "Meta", "Bloomberg"],
    topics: ["Arrays", "Binary Search"],
    fn: "search",
    params: ["nums", "target"],
    description:
      "Given a sorted array of distinct integers `nums` and an integer `target`, return the index of `target`, or `-1` if it does not exist.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
    constraints: [
      "1 <= nums.length <= 10^4",
      "nums is sorted in strictly increasing order",
      "-10^4 < nums[i], target < 10^4",
    ],
    examples: [
      { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4", explanation: "9 exists in nums and its index is 4." },
      { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" },
    ],
    hints: [
      "You are throwing away information by scanning left to right. The array is sorted.",
      "After one comparison against the middle element, how much of the array can you discard?",
      "Maintain two pointers, lo and hi, and halve the range each step.",
      "lo, hi = 0, n-1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if nums[mid] == target: return mid\n    if nums[mid] < target: lo = mid + 1\n    else: hi = mid - 1\nreturn -1",
    ],
    editorial: {
      approach:
        "Each comparison against the midpoint eliminates half the remaining candidates, giving log₂(n) iterations. Use lo + (hi - lo) / 2 rather than (lo + hi) / 2 in languages where the sum can overflow.",
      time: "O(log n)",
      space: "O(1)",
      code: `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    },
    viz: "binary-search",
    starter: genericStarter("search", ["nums", "target"]),
    tests: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { args: [[5], 5], expected: 0 },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9], 1], expected: 0 },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9], 9], expected: 8 },
    ],
  },

  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    acceptance: 41,
    companies: ["Amazon", "Microsoft", "Goldman Sachs", "Flipkart"],
    topics: ["Strings", "Stack"],
    fn: "isValid",
    params: ["s"],
    description:
      "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of bracket, and in the correct order.",
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"],
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false", explanation: "The ')' would have to close a '(' but the most recent open bracket is '['." },
    ],
    hints: [
      "Which bracket does a closing bracket have to match? Always the most recent unmatched one.",
      "'Most recent' should suggest a particular data structure.",
      "Use a Stack: push opening brackets, pop on closing brackets.",
      "stack = []\nfor c in s:\n    if c is opening: stack.push(c)\n    else:\n        if stack empty or stack.pop() != match(c): return False\nreturn len(stack) == 0",
    ],
    editorial: {
      approach:
        "A stack matches the last-in-first-out nature of nesting. Push every opening bracket; on a closing bracket, the top of the stack must be its partner. The string is valid only if the stack ends empty — a non-empty stack means unclosed brackets.",
      time: "O(n)",
      space: "O(n)",
      code: `function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') stack.push(c);
    else if (stack.pop() !== pairs[c]) return false;
  }
  return stack.length === 0;
}`,
    },
    viz: "stack",
    starter: genericStarter("isValid", ["s"]),
    tests: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: ["]"], expected: false },
    ],
  },

  {
    slug: "sort-an-array",
    title: "Sort an Array",
    difficulty: "Medium",
    acceptance: 57,
    companies: ["Google", "Meta", "Atlassian"],
    topics: ["Arrays", "Divide and Conquer", "Sorting"],
    fn: "sortArray",
    params: ["nums"],
    description:
      "Given an array of integers `nums`, sort the array in ascending order and return it.\n\nYou must solve the problem **without using any built-in** functions in `O(n log n)` time and with the smallest space complexity possible.",
    constraints: ["1 <= nums.length <= 5 * 10^4", "-5 * 10^4 <= nums[i] <= 5 * 10^4"],
    examples: [
      { input: "nums = [5,2,3,1]", output: "[1,2,3,5]" },
      { input: "nums = [5,1,1,2,0,0]", output: "[0,0,1,1,2,5]" },
    ],
    hints: [
      "O(n log n) is a strong signal about the shape of the algorithm.",
      "If you could sort two halves independently, how hard would it be to combine them?",
      "Merge sort: split, sort each half recursively, then merge two sorted lists.",
      "def sort(a):\n    if len(a) <= 1: return a\n    mid = len(a) // 2\n    L, R = sort(a[:mid]), sort(a[mid:])\n    return merge(L, R)",
    ],
    editorial: {
      approach:
        "Merge sort splits the array in half until subarrays are trivially sorted, then merges pairs of sorted arrays in linear time. The recursion tree has log n levels and each level does O(n) merging work, giving O(n log n) overall. It is stable, and unlike quicksort has no adversarial O(n²) case.",
      time: "O(n log n)",
      space: "O(n)",
      code: `function sortArray(nums) {
  if (nums.length <= 1) return nums;
  const mid = nums.length >> 1;
  const L = sortArray(nums.slice(0, mid));
  const R = sortArray(nums.slice(mid));
  const out = [];
  let i = 0, j = 0;
  while (i < L.length && j < R.length) {
    out.push(L[i] <= R[j] ? L[i++] : R[j++]);
  }
  while (i < L.length) out.push(L[i++]);
  while (j < R.length) out.push(R[j++]);
  return out;
}`,
    },
    viz: "merge-sort",
    starter: genericStarter("sortArray", ["nums"]),
    tests: [
      { args: [[5, 2, 3, 1]], expected: [1, 2, 3, 5] },
      { args: [[5, 1, 1, 2, 0, 0]], expected: [0, 0, 1, 1, 2, 5] },
      { args: [[1]], expected: [1] },
      { args: [[-4, 0, 7, 4, 9, -5, -1, 0, -7, -1]], expected: [-7, -5, -4, -1, -1, 0, 0, 4, 7, 9] },
    ],
  },

  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "Medium",
    acceptance: 51,
    companies: ["Amazon", "Microsoft", "Goldman Sachs", "Adobe"],
    topics: ["Arrays", "Dynamic Programming", "Divide and Conquer"],
    fn: "maxSubArray",
    params: ["nums"],
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    hints: [
      "At each position, you only really have one decision to make.",
      "Either you extend the subarray ending at the previous index, or you start fresh here.",
      "Kadane's algorithm: track the best sum ending at i, and the best seen overall.",
      "cur = best = nums[0]\nfor x in nums[1:]:\n    cur = max(x, cur + x)\n    best = max(best, cur)\nreturn best",
    ],
    editorial: {
      approach:
        "Kadane's algorithm. Define cur as the maximum sum of a subarray ending exactly at index i. Then cur_i = max(nums[i], cur_{i-1} + nums[i]) — carrying a negative prefix forward never helps. The answer is the max over all cur values.",
      time: "O(n)",
      space: "O(1)",
      code: `function maxSubArray(nums) {
  let cur = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
    },
    viz: "kadane",
    starter: genericStarter("maxSubArray", ["nums"]),
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
      { args: [[-1]], expected: -1 },
      { args: [[-2, -1, -3]], expected: -1 },
    ],
  },

  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "Easy",
    acceptance: 52,
    companies: ["Amazon", "Adobe", "Uber"],
    topics: ["Dynamic Programming", "Recursion", "Math"],
    fn: "climbStairs",
    params: ["n"],
    description:
      "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can climb either **1** or **2** steps. In how many distinct ways can you climb to the top?",
    constraints: ["1 <= n <= 45"],
    examples: [
      { input: "n = 2", output: "2", explanation: "1+1, or 2." },
      { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, or 2+1." },
    ],
    hints: [
      "How can you arrive at step n? There are only two possibilities.",
      "The number of ways to reach step n depends on the two steps below it.",
      "This is the Fibonacci recurrence: f(n) = f(n-1) + f(n-2).",
      "a, b = 1, 1\nfor i in range(2, n+1):\n    a, b = b, a + b\nreturn b",
    ],
    editorial: {
      approach:
        "The last move onto step n is either a 1-step from n-1 or a 2-step from n-2, and those sets of paths are disjoint. So f(n) = f(n-1) + f(n-2) with f(1)=1, f(2)=2 — the Fibonacci sequence. Only the last two values matter, so O(1) space suffices.",
      time: "O(n)",
      space: "O(1)",
      code: `function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}`,
    },
    viz: "fib",
    starter: genericStarter("climbStairs", ["n"]),
    tests: [
      { args: [2], expected: 2 },
      { args: [3], expected: 3 },
      { args: [1], expected: 1 },
      { args: [10], expected: 89 },
      { args: [45], expected: 1836311903 },
    ],
  },

  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    acceptance: 35,
    companies: ["Amazon", "Google", "Meta", "Bloomberg", "Flipkart"],
    topics: ["Strings", "Hash Map", "Sliding Window"],
    fn: "lengthOfLongestSubstring",
    params: ["s"],
    description:
      "Given a string `s`, find the length of the **longest substring** without duplicate characters.",
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
    examples: [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "bbbbb"', output: "1" },
      { input: 's = "pwwkew"', output: "3", explanation: '"wke" — note "pwke" is a subsequence, not a substring.' },
    ],
    hints: [
      "You do not need to re-check substrings you have already ruled out.",
      "Keep a window over the string. When does the left edge need to move?",
      "Sliding window plus a Hash Map of character → last index.",
      "left = 0; last = {}; best = 0\nfor right, c in s:\n    if c in last and last[c] >= left: left = last[c] + 1\n    last[c] = right\n    best = max(best, right - left + 1)",
    ],
    editorial: {
      approach:
        "Maintain a window [left, right] that always contains distinct characters. As right advances, if the new character was seen at an index inside the window, jump left to just past that occurrence. Each index is visited at most twice, so the scan is linear.",
      time: "O(n)",
      space: "O(min(n, alphabet))",
      code: `function lengthOfLongestSubstring(s) {
  const last = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (last.has(c) && last.get(c) >= left) left = last.get(c) + 1;
    last.set(c, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    },
    viz: "sliding-window",
    starter: genericStarter("lengthOfLongestSubstring", ["s"]),
    tests: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
      { args: ["pwwkew"], expected: 3 },
      { args: [""], expected: 0 },
      { args: ["dvdf"], expected: 3 },
    ],
  },

  {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    acceptance: 58,
    companies: ["Amazon", "Google", "Microsoft", "Uber"],
    topics: ["Graphs", "BFS", "DFS", "Union Find", "Matrix"],
    fn: "numIslands",
    params: ["grid"],
    description:
      "Given an `m x n` 2D binary grid which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.",
    constraints: ["m == grid.length", "n == grid[i].length", "1 <= m, n <= 300", "grid[i][j] is '0' or '1'"],
    examples: [
      { input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', output: "2" },
    ],
    hints: [
      "What makes two land cells part of the *same* island?",
      "If you find an unvisited land cell, everything reachable from it is one island.",
      "Flood fill each unvisited land cell with BFS or DFS, counting how many times you start.",
      "count = 0\nfor each cell:\n    if cell == '1' and not visited:\n        count += 1\n        flood_fill(cell)   # BFS/DFS marks the whole component\nreturn count",
    ],
    editorial: {
      approach:
        "This is connected-components counting on an implicit graph where cells are nodes and edges join orthogonally adjacent land. Scan every cell; when you hit unvisited land, increment the counter and flood-fill the entire component so it is never counted again. Every cell is visited a constant number of times.",
      time: "O(m · n)",
      space: "O(m · n) worst case for the queue/recursion",
      code: `function numIslands(grid) {
  const m = grid.length, n = grid[0].length;
  let count = 0;
  const flood = (r, c) => {
    if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    flood(r + 1, c); flood(r - 1, c);
    flood(r, c + 1); flood(r, c - 1);
  };
  for (let r = 0; r < m; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === '1') { count++; flood(r, c); }
  return count;
}`,
    },
    viz: "bfs",
    starter: genericStarter("numIslands", ["grid"]),
    tests: [
      { args: [[["1", "1", "0"], ["1", "0", "0"], ["0", "0", "1"]]], expected: 2 },
      { args: [[["1", "1", "1"], ["0", "1", "0"], ["1", "1", "1"]]], expected: 1 },
      { args: [[["0"]]], expected: 0 },
      { args: [[["1", "0", "1", "0", "1"]]], expected: 3 },
    ],
  },

  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "Medium",
    acceptance: 44,
    companies: ["Amazon", "Google", "Goldman Sachs", "Atlassian"],
    topics: ["Dynamic Programming", "BFS", "Arrays"],
    fn: "coinChange",
    params: ["coins", "amount"],
    description:
      "You are given an integer array `coins` representing coins of different denominations and an integer `amount`.\n\nReturn the **fewest number of coins** needed to make up that amount. If it cannot be made up by any combination, return `-1`. You have an infinite number of each kind of coin.",
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
    examples: [
      { input: "coins = [1,2,5], amount = 11", output: "3", explanation: "11 = 5 + 5 + 1" },
      { input: "coins = [2], amount = 3", output: "-1" },
      { input: "coins = [1], amount = 0", output: "0" },
    ],
    hints: [
      "Greedy — always taking the largest coin — is wrong here. Try coins = [1,3,4], amount = 6.",
      "If you knew the answer for every amount smaller than n, could you get the answer for n?",
      "Bottom-up DP over amounts: dp[x] = 1 + min(dp[x - c]) over all coins c.",
      "dp = [INF] * (amount + 1); dp[0] = 0\nfor x in 1..amount:\n    for c in coins:\n        if c <= x: dp[x] = min(dp[x], dp[x - c] + 1)\nreturn dp[amount] if dp[amount] < INF else -1",
    ],
    editorial: {
      approach:
        "Greedy fails because a locally large coin can strand the remainder. Instead build up answers for every amount from 0 to n: the best way to make x is one coin c plus the best way to make x - c. Each of the n subproblems tries each of the k coins, so the work is O(n · k).",
      time: "O(amount · coins)",
      space: "O(amount)",
      code: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let x = 1; x <= amount; x++) {
    for (const c of coins) {
      if (c <= x) dp[x] = Math.min(dp[x], dp[x - c] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    },
    viz: "dp-table",
    starter: genericStarter("coinChange", ["coins", "amount"]),
    tests: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 },
      { args: [[1, 3, 4], 6], expected: 2 },
      { args: [[186, 419, 83, 408], 6249], expected: 20 },
    ],
  },
];

export const problemBySlug = (slug: string) => PROBLEMS.find((p) => p.slug === slug);

export const ALL_TOPICS = Array.from(new Set(PROBLEMS.flatMap((p) => p.topics))).sort();
export const ALL_COMPANIES = Array.from(new Set(PROBLEMS.flatMap((p) => p.companies))).sort();
