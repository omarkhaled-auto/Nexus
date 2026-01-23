import { k as useNavigate, l as useLocation, r as reactExports, j as jsxRuntimeExports, S as Sparkles, L as LoaderCircle, m as ListTodo, C as CircleAlert, a as cn, R as RefreshCw, n as ChevronRight } from "./index-BoQyQ-ap.js";
import { A as AnimatedPage } from "./AnimatedPage-fTtyTsDw.js";
import { u as usePlanningProgress, a as usePlanningStore } from "./usePlanningProgress-F6S3380Z.js";
import { C as Clock } from "./clock-C_KhMjW-.js";
import { C as CircleCheck } from "./circle-check-hbu4IvA3.js";
import { A as ArrowRight } from "./arrow-right-C8ctKMyK.js";
import { L as Layers } from "./layers-BZmc9_HD.js";
function ProgressBar({ progress, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-2 bg-bg-hover rounded-full overflow-hidden", className), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 ease-out",
      style: { width: `${Math.min(progress, 100)}%` }
    }
  ) });
}
function PlanningSteps({ currentStatus }) {
  const steps = [
    { id: "analyzing", label: "Analyzing", icon: Sparkles },
    { id: "decomposing", label: "Decomposing", icon: Layers },
    { id: "creating-tasks", label: "Creating Tasks", icon: ListTodo },
    { id: "validating", label: "Validating", icon: CircleCheck }
  ];
  const currentIndex = steps.findIndex((s) => s.id === currentStatus);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center gap-2 sm:gap-4", children: steps.map((step, index) => {
    const Icon = step.icon;
    const isActive = step.id === currentStatus;
    const isComplete = index < currentIndex;
    const isPending = index > currentIndex;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300",
            isActive && "bg-accent-primary/20 border border-accent-primary/50",
            isComplete && "bg-accent-success/20 border border-accent-success/50",
            isPending && "bg-bg-card border border-border-default opacity-50"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Icon,
              {
                className: cn(
                  "w-4 h-4",
                  isActive && "text-accent-primary animate-pulse",
                  isComplete && "text-accent-success",
                  isPending && "text-text-tertiary"
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "text-sm font-medium hidden sm:inline",
                  isActive && "text-accent-primary",
                  isComplete && "text-accent-success",
                  isPending && "text-text-tertiary"
                ),
                children: step.label
              }
            )
          ]
        }
      ),
      index < steps.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ChevronRight,
        {
          className: cn(
            "w-4 h-4 mx-1",
            index < currentIndex ? "text-accent-success" : "text-text-tertiary"
          )
        }
      )
    ] }, step.id);
  }) });
}
function TaskPreviewCard({
  task,
  index
}) {
  const priorityColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    normal: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex items-center gap-3 p-3 bg-bg-card rounded-lg border border-border-default",
        "animate-in slide-in-from-left duration-300"
      ),
      style: { animationDelay: `${index * 50}ms` },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ListTodo, { className: "w-4 h-4 text-accent-primary" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-text-primary truncate", children: task.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "text-xs px-2 py-0.5 rounded border",
                  priorityColors[task.priority] ?? priorityColors.normal
                ),
                children: task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-tertiary flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3 h-3" }),
              task.estimatedMinutes,
              "m"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-5 h-5 text-accent-success flex-shrink-0" })
      ]
    }
  );
}
function ErrorState({
  error,
  onRetry
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center gap-6 p-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-8 h-8 text-red-500" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-text-primary mb-2", children: "Planning Failed" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-text-secondary max-w-md", children: error })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: onRetry,
        className: cn(
          "flex items-center gap-2 px-6 py-3 rounded-lg",
          "bg-accent-primary text-white font-medium",
          "hover:bg-accent-primary/90 transition-colors"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4" }),
          "Try Again"
        ]
      }
    )
  ] });
}
function CompleteState({
  taskCount,
  onProceed
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center gap-6 p-8 animate-in fade-in duration-500", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-accent-success/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-8 h-8 text-accent-success" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-text-primary mb-2", children: "Planning Complete!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-text-secondary", children: [
        "Created ",
        taskCount,
        " task",
        taskCount !== 1 ? "s" : "",
        " for your project."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: onProceed,
        className: cn(
          "flex items-center gap-2 px-6 py-3 rounded-lg",
          "bg-accent-primary text-white font-medium",
          "hover:bg-accent-primary/90 hover:shadow-glow-primary transition-all"
        ),
        children: [
          "View Kanban Board",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "w-4 h-4" })
        ]
      }
    )
  ] });
}
function PlanningPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state;
  const {
    status,
    progress,
    currentStep,
    tasksCreated,
    taskCount,
    featureCount,
    estimatedTimeRemaining,
    error,
    isComplete,
    isError,
    isLoading,
    startPlanning,
    retry
  } = usePlanningProgress();
  const [autoNavigateCountdown, setAutoNavigateCountdown] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const requirements = locationState?.requirements;
    const projectId = locationState?.projectId ?? "current";
    if (status === "idle" && requirements && requirements.length > 0) {
      startPlanning(projectId);
      simulatePlanningProgress(requirements);
    }
  }, [locationState, status, startPlanning]);
  reactExports.useEffect(() => {
    if (!isComplete) {
      return;
    }
    setAutoNavigateCountdown(5);
    const interval = setInterval(() => {
      setAutoNavigateCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          navigate("/evolution");
          return null;
        }
        return prev - 1;
      });
    }, 1e3);
    return () => clearInterval(interval);
  }, [isComplete, navigate]);
  const handleProceed = () => {
    navigate("/evolution");
  };
  const handleRetry = () => {
    retry();
    const requirements = locationState?.requirements;
    if (requirements) {
      simulatePlanningProgress(requirements);
    }
  };
  const simulatePlanningProgress = (requirements) => {
    const store = usePlanningStore.getState();
    setTimeout(() => {
      store.updateProgress({
        projectId: "current",
        status: "analyzing",
        progress: 15,
        currentStep: "Analyzing requirements...",
        tasksCreated: 0,
        totalExpected: requirements.length * 3
      });
    }, 500);
    setTimeout(() => {
      store.updateProgress({
        projectId: "current",
        status: "decomposing",
        progress: 35,
        currentStep: "Breaking down into features...",
        tasksCreated: 0,
        totalExpected: requirements.length * 3
      });
      requirements.forEach((req, index) => {
        setTimeout(() => {
          store.addFeature({
            id: `feature-${index + 1}`,
            name: req.summary.slice(0, 50),
            taskCount: 3,
            status: "identified"
          });
        }, index * 300);
      });
    }, 1500);
    setTimeout(() => {
      store.setStatus("creating-tasks");
      const totalTasks = requirements.length * 3;
      let taskIndex = 0;
      requirements.forEach((req, reqIndex) => {
        const taskTypes = ["Setup", "Implementation", "Testing"];
        taskTypes.forEach((type, typeIndex) => {
          const currentIndex = taskIndex++;
          setTimeout(
            () => {
              store.addTask({
                id: `task-${currentIndex + 1}`,
                title: `${type}: ${req.summary.slice(0, 40)}`,
                featureId: `feature-${reqIndex + 1}`,
                priority: req.priority === "must" ? "critical" : req.priority === "should" ? "high" : "normal",
                complexity: typeIndex === 1 ? "moderate" : "simple",
                estimatedMinutes: typeIndex === 1 ? 30 : 15,
                dependsOn: typeIndex > 0 ? [`task-${currentIndex}`] : [],
                status: "created"
              });
              store.updateProgress({
                projectId: "current",
                status: "creating-tasks",
                progress: 50 + (currentIndex + 1) / totalTasks * 40,
                currentStep: `Creating task ${currentIndex + 1} of ${totalTasks}...`,
                tasksCreated: currentIndex + 1,
                totalExpected: totalTasks
              });
            },
            currentIndex * 400
          );
        });
      });
    }, 3e3);
    const totalTime = 3e3 + requirements.length * 3 * 400 + 1e3;
    setTimeout(() => {
      store.updateProgress({
        projectId: "current",
        status: "validating",
        progress: 95,
        currentStep: "Validating dependencies...",
        tasksCreated: requirements.length * 3,
        totalExpected: requirements.length * 3
      });
    }, totalTime);
    setTimeout(() => {
      store.complete();
    }, totalTime + 1500);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatedPage, { className: "min-h-full bg-bg-dark", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto px-6 py-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "text-center mb-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-primary/10 border border-accent-primary/30 mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-4 h-4 text-accent-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-accent-primary", children: "Planning Phase" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold text-text-primary mb-3", children: "Planning Your Project" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-text-secondary max-w-lg mx-auto", children: "Our AI is analyzing your requirements and creating a structured plan with tasks, dependencies, and estimates." })
    ] }),
    isError && error && /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorState, { error, onRetry: handleRetry }),
    isComplete && !isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CompleteState, { taskCount, onProceed: handleProceed }),
      autoNavigateCountdown !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-center text-text-tertiary text-sm mt-4", children: [
        "Redirecting to Kanban in ",
        autoNavigateCountdown,
        "s..."
      ] })
    ] }),
    isLoading && !isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlanningSteps, { currentStatus: status }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-card rounded-xl border border-border-default p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-5 h-5 text-accent-primary animate-spin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-primary font-medium", children: currentStep })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressBar, { progress, className: "mb-4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-secondary", children: [
            Math.round(progress),
            "% complete"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-tertiary", children: [
              featureCount,
              " feature",
              featureCount !== 1 ? "s" : ""
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-tertiary", children: [
              taskCount,
              " task",
              taskCount !== 1 ? "s" : ""
            ] }),
            estimatedTimeRemaining && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-tertiary flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3.5 h-3.5" }),
              estimatedTimeRemaining
            ] })
          ] })
        ] })
      ] }),
      tasksCreated.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-card rounded-xl border border-border-default p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-semibold text-text-primary mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ListTodo, { className: "w-5 h-5 text-accent-primary" }),
          "Tasks Created (",
          taskCount,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 max-h-[400px] overflow-y-auto pr-2", children: tasksCreated.map((task, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(TaskPreviewCard, { task, index }, task.id)) })
      ] })
    ] }),
    status === "idle" && (!locationState?.requirements || locationState.requirements.length === 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-bg-hover mx-auto mb-6 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-8 h-8 text-text-tertiary" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-text-primary mb-2", children: "No Requirements Found" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-text-secondary mb-6", children: "Please complete the interview first to define your project requirements." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => navigate("/genesis"),
          className: cn(
            "px-6 py-3 rounded-lg font-medium",
            "bg-accent-primary text-white",
            "hover:bg-accent-primary/90 transition-colors"
          ),
          children: "Start Interview"
        }
      )
    ] })
  ] }) });
}
export {
  PlanningPage as default
};
