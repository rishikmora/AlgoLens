export interface InterviewPack {
  id: string;
  name: string;
  accent: string;
  questionCount: number;
  focus: string[];
  /** What the interviewer persona optimises for — feeds the AI system prompt. */
  persona: string;
  signals: string[];
  rounds: string[];
}

export const PACKS: InterviewPack[] = [
  {
    id: "google",
    name: "Google",
    accent: "#5ba8ff",
    questionCount: 120,
    focus: ["Graphs", "Dynamic Programming", "System Design", "Behavioral"],
    persona:
      "A Google L5 engineer. Calm, precise, deeply interested in *why* you chose an approach. Pushes hard on complexity analysis and asks you to justify every data structure. Will interrupt if you start coding before stating an approach.",
    signals: ["Algorithm design", "Complexity rigour", "Code quality", "Googleyness"],
    rounds: ["Introduction", "DSA — Graphs", "DSA — DP follow-up", "Complexity deep dive", "Behavioral"],
  },
  {
    id: "amazon",
    name: "Amazon",
    accent: "#f5a623",
    questionCount: 140,
    focus: ["Arrays", "Trees", "Leadership Principles", "OOD"],
    persona:
      "An Amazon SDE-III and Bar Raiser. Ties everything back to the Leadership Principles. Expects STAR-format answers and will ask 'what was YOUR contribution' repeatedly. Values pragmatism and customer obsession over cleverness.",
    signals: ["Customer Obsession", "Ownership", "Dive Deep", "Bias for Action", "Deliver Results"],
    rounds: ["Introduction", "Leadership Principle #1", "DSA", "Leadership Principle #2", "Behavioral wrap-up"],
  },
  {
    id: "meta",
    name: "Meta",
    accent: "#c9a3ff",
    questionCount: 110,
    focus: ["Arrays", "Strings", "Graphs", "Speed"],
    persona:
      "A Meta E5 engineer. Fast-paced and time-boxed — expects two problems in 45 minutes. Cares about clean, bug-free code on the first pass and will ask you to dry-run your own solution.",
    signals: ["Coding speed", "Correctness first pass", "Communication", "Impact"],
    rounds: ["Introduction", "DSA — problem 1", "DSA — problem 2", "Dry run", "Questions"],
  },
  {
    id: "microsoft",
    name: "Microsoft",
    accent: "#4dd9c0",
    questionCount: 100,
    focus: ["Implementation", "Linked Lists", "OOD", "Debugging"],
    persona:
      "A Microsoft Senior SDE. Heavier on implementation detail and edge cases than on exotic algorithms. Will hand you a half-broken requirement and see whether you ask clarifying questions.",
    signals: ["Edge case handling", "Clarifying questions", "Readable code", "Collaboration"],
    rounds: ["Introduction", "Clarify the spec", "Implementation", "Edge cases", "Behavioral"],
  },
  {
    id: "atlassian",
    name: "Atlassian",
    accent: "#5ba8ff",
    questionCount: 80,
    focus: ["Practical coding", "APIs", "Values", "Collaboration"],
    persona:
      "An Atlassian Senior Engineer. Uses realistic product scenarios rather than puzzles. Strongly values 'Open company, no bullshit' — will probe whether you admit what you do not know.",
    signals: ["Practical judgement", "Values alignment", "Honesty", "Craft"],
    rounds: ["Introduction", "Practical coding", "Extend the design", "Values", "Wrap-up"],
  },
  {
    id: "adobe",
    name: "Adobe",
    accent: "#ff6b47",
    questionCount: 75,
    focus: ["Arrays", "Strings", "Maths", "Puzzles"],
    persona:
      "An Adobe Computer Scientist. Mixes classic DSA with a maths or geometry flavoured twist. Likes seeing you reason on paper before typing.",
    signals: ["Analytical reasoning", "Fundamentals", "Clarity"],
    rounds: ["Introduction", "DSA", "Maths twist", "Project deep dive", "Behavioral"],
  },
  {
    id: "uber",
    name: "Uber",
    accent: "#ece9e3",
    questionCount: 90,
    focus: ["Graphs", "Heaps", "Design", "Scale"],
    persona:
      "An Uber Senior Engineer. Frames problems as real marketplace/routing scenarios and always asks 'now how does this behave at 10 million requests?'",
    signals: ["Scalability thinking", "Trade-off reasoning", "Systems intuition"],
    rounds: ["Introduction", "DSA — routing flavour", "Scale follow-up", "Design sketch", "Behavioral"],
  },
  {
    id: "flipkart",
    name: "Flipkart",
    accent: "#f5a623",
    questionCount: 85,
    focus: ["Arrays", "Hash Map", "LLD", "Machine Coding"],
    persona:
      "A Flipkart SDE-III. Emphasises machine-coding rounds — expects working, extensible code with clean class boundaries inside the time limit.",
    signals: ["Low-level design", "Extensibility", "Working code", "Speed"],
    rounds: ["Introduction", "Machine coding", "Extend the requirement", "DSA", "Behavioral"],
  },
  {
    id: "rubrik",
    name: "Rubrik",
    accent: "#4dd9c0",
    questionCount: 65,
    focus: ["Systems", "Concurrency", "Data Structures", "Debugging"],
    persona:
      "A Rubrik Senior Engineer from the infrastructure side. Interested in how your code behaves under failure and concurrency, not just whether it returns the right answer. Will ask what happens when a node dies mid-operation, and expects you to reason about state consistency rather than hand-wave.",
    signals: ["Systems thinking", "Failure reasoning", "Data structure depth", "Debugging rigour"],
    rounds: ["Introduction", "DSA", "Failure-mode follow-up", "Concurrency question", "Behavioral"],
  },
  {
    id: "goldman-sachs",
    name: "Goldman Sachs",
    accent: "#4dd9c0",
    questionCount: 70,
    focus: ["Arrays", "Maths", "Probability", "Correctness"],
    persona:
      "A Goldman Sachs VP Engineer. Precision-obsessed: off-by-one errors and unhandled overflow are treated as serious. Asks probability and estimation questions alongside DSA.",
    signals: ["Precision", "Risk awareness", "Numeracy", "Communication"],
    rounds: ["Introduction", "DSA", "Correctness grilling", "Probability question", "Behavioral"],
  },
];

export const packById = (id: string) => PACKS.find((p) => p.id === id);

export const BEHAVIORAL_QUESTIONS = [
  "Tell me about yourself.",
  "Describe a conflict you had with a teammate. How did you resolve it?",
  "Tell me about a time you failed. What did you learn?",
  "Describe a project where you took the lead.",
  "Walk me through the project you are most proud of.",
  "Tell me about the hardest technical challenge you have faced.",
  "Describe a time you had to work with someone difficult.",
  "How do you handle a deadline you know you will miss?",
];

export const DSA_FOLLOWUPS = [
  "Why a HashMap here rather than sorting first?",
  "Can this be made O(1) space?",
  "How does this behave when the input does not fit in memory?",
  "What are the edge cases you have not handled yet?",
  "Could this recursion overflow the stack? At what input size?",
  "Why BFS rather than DFS for this one?",
  "If the input were streaming rather than an array, what changes?",
  "What happens if the values can be negative?",
  "How would you test this?",
];

export const RESUME_QUESTIONS = [
  "Walk me through {project} — what problem did it solve?",
  "Why did you pick {tech} for {project}? What else did you consider?",
  "What was the hardest bug you hit in {project}?",
  "What did YOU build in {project}, as opposed to your teammates?",
  "How did you evaluate whether {project} actually worked?",
  "If you rebuilt {project} today, what would you do differently?",
  "How would you scale {project} to 100x the users?",
];
