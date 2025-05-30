import { Progress } from "@/components/ui/progress";

interface Phase {
  name: string;
  icon: string;
  tasks: {
    name: string;
    progress: "done" | "in-progress" | "not-started";
  }[];
}

const phases: Phase[] = [
  {
    name: "Foundation",
    icon: "🎯",
    tasks: [
      {
        name: "GitHub data processing with skill progression",
        progress: "done",
      },
      {
        name: "AI-powered daily/weekly/monthly summaries",
        progress: "done",
      },
      {
        name: "Contributor profiles showing expertise levels",
        progress: "in-progress",
      },
    ],
  },
  {
    name: "Identity",
    icon: "🔐",
    tasks: [
      {
        name: "GitHub OAuth for user authentication",
        progress: "in-progress",
      },
      {
        name: "Wallet linking (ETH/SOL) bridging Web2/Web3",
        progress: "not-started",
      },
      {
        name: "Public API for reputation queries",
        progress: "not-started",
      },
    ],
  },
  {
    name: "Achievements",
    icon: "🏆",
    tasks: [
      {
        name: "Character Studio integration - unlock 3D wearables based on your skill levels",
        progress: "not-started",
      },
      {
        name: "Achievement NFTs for reaching milestones (Level 99 TypeScript!)",
        progress: "not-started",
      },
      {
        name: "Cross-platform reputation portability",
        progress: "not-started",
      },
    ],
  },
  {
    name: "The Great Online Game",
    icon: "🌍",
    tasks: [
      {
        name: "Quest systems for coordinated development",
        progress: "not-started",
      },
      {
        name: "Guild formation around shared expertise",
        progress: "not-started",
      },
      {
        name: "Internet-scale achievement system",
        progress: "not-started",
      },
    ],
  },
];

// Helper function to calculate progress percentage
const calculateProgress = (tasks: Phase["tasks"]): number => {
  const doneCount = tasks.filter((task) => task.progress === "done").length;
  const inProgressCount = tasks.filter(
    (task) => task.progress === "in-progress",
  ).length;
  const totalTasks = tasks.length;

  // Give full weight to done tasks, half weight to in-progress tasks
  const weightedProgress = doneCount + inProgressCount * 0.5;
  return Math.round((weightedProgress / totalTasks) * 100);
};

// Helper function to get task icon
const getTaskIcon = (
  progress: "done" | "in-progress" | "not-started",
): string => {
  switch (progress) {
    case "done":
      return "✅";
    case "in-progress":
      return "🔄";
    case "not-started":
      return "📋";
    default:
      return "📋";
  }
};

export default function ProgressSection() {
  return (
    <section className="mb-12">
      <h2>Progress Bar</h2>
      <div className="space-y-4">
        {phases.map((phase, index) => (
          <div key={phase.name} className="rounded-lg border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-3 text-2xl">{phase.icon}</span>
                <h3 className="text-xl font-semibold">
                  {`Phase ${index + 1}: ${phase.name}`}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <Progress
                  value={calculateProgress(phase.tasks)}
                  className="h-2 w-24 bg-muted"
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {calculateProgress(phase.tasks)}%
                </span>
              </div>
            </div>
            <ul className="space-y-1 text-muted-foreground">
              {phase.tasks.map((task) => (
                <li key={task.name}>
                  {getTaskIcon(task.progress)} {task.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
