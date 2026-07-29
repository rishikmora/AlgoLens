export interface TopicNode {
  id: string;
  name: string;
  /** Prerequisite topic ids — the roadmap is a DAG, rendered as a spine. */
  requires: string[];
  problems: number;
  blurb: string;
  keyIdeas: string[];
}

export const LEARNING_PATH: TopicNode[] = [
  { id: "arrays", name: "Arrays", requires: [], problems: 42, blurb: "Indexing, two pointers, prefix sums.", keyIdeas: ["Two pointers", "Prefix sums", "In-place mutation"] },
  { id: "strings", name: "Strings", requires: ["arrays"], problems: 34, blurb: "Immutability, sliding windows, parsing.", keyIdeas: ["Sliding window", "Character counts", "Palindromes"] },
  { id: "hashmap", name: "Hash Map", requires: ["arrays"], problems: 38, blurb: "O(1) lookup — trade space for time.", keyIdeas: ["Frequency maps", "Seen-sets", "Grouping by key"] },
  { id: "stack", name: "Stack", requires: ["arrays"], problems: 22, blurb: "Last-in-first-out; nesting and monotonic tricks.", keyIdeas: ["Bracket matching", "Monotonic stack", "Next greater element"] },
  { id: "queue", name: "Queue", requires: ["stack"], problems: 16, blurb: "First-in-first-out; the engine of BFS.", keyIdeas: ["Deque", "Sliding window max", "Level order"] },
  { id: "linked-list", name: "Linked List", requires: ["arrays"], problems: 24, blurb: "Pointer surgery without index arithmetic.", keyIdeas: ["Fast/slow pointers", "Reversal", "Dummy heads"] },
  { id: "trees", name: "Trees", requires: ["linked-list", "queue"], problems: 40, blurb: "Recursion made visible.", keyIdeas: ["DFS traversals", "BFS levels", "Recursive shape"] },
  { id: "bst", name: "Binary Search Tree", requires: ["trees"], problems: 20, blurb: "Ordering invariant unlocks log-time search.", keyIdeas: ["In-order = sorted", "Insert/delete", "Validation"] },
  { id: "heap", name: "Heap", requires: ["trees"], problems: 18, blurb: "Always know the best element.", keyIdeas: ["Top-K", "Median stream", "Priority queues"] },
  { id: "trie", name: "Trie", requires: ["trees"], problems: 12, blurb: "Prefix trees for string sets.", keyIdeas: ["Prefix search", "Autocomplete", "Word dictionaries"] },
  { id: "graphs", name: "Graphs", requires: ["queue", "trees"], problems: 36, blurb: "Everything is a graph if you squint.", keyIdeas: ["BFS/DFS", "Topological sort", "Union find"] },
  { id: "dp", name: "Dynamic Programming", requires: ["trees", "arrays"], problems: 48, blurb: "Remember what you already solved.", keyIdeas: ["State definition", "Recurrence", "Memo vs tabulation"] },
  { id: "segment-tree", name: "Segment Tree", requires: ["trees", "dp"], problems: 10, blurb: "Range queries in log time.", keyIdeas: ["Range sum/min", "Lazy propagation", "Fenwick alternative"] },
  { id: "advanced-graphs", name: "Advanced Graphs", requires: ["graphs", "heap"], problems: 14, blurb: "Shortest paths, flows, MST.", keyIdeas: ["Dijkstra", "Bellman-Ford", "Kruskal / Prim"] },
];

export const topicById = (id: string) => LEARNING_PATH.find((t) => t.id === id);
