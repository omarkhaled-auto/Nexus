import { r as reactExports, j as jsxRuntimeExports, N as Dialog, O as DialogContent, Q as DialogHeader, U as DialogTitle, V as DialogDescription, Y as DialogFooter, D as Button, t as toast, a as cn, L as LoaderCircle, af as Terminal, T as TriangleAlert, C as CircleAlert, F as Search } from "./index-D6zknste.js";
import { H as Header } from "./Header-CUxpwrTf.js";
import { u as useCheckpoint, C as CircleCheckBig } from "./useCheckpoint-DVitJsuZ.js";
import { T as Trash2 } from "./trash-2-DsUKbn2O.js";
import { D as Download } from "./download-Dtg0Wiov.js";
import { C as CircleX } from "./circle-x-C5fFko4H.js";
import "./arrow-left-OjicJZKL.js";
function ReviewModal({ review, onApprove, onReject, onClose }) {
  const [feedback, setFeedback] = reactExports.useState("");
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  if (!review) return null;
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(review.id, feedback || void 0);
      setFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleReject = async () => {
    if (!feedback.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(review.id, feedback);
      setFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleFeedbackChange = (e) => {
    setFeedback(e.target.value);
  };
  const handleOpenChange = (open) => {
    if (!open && onClose) {
      onClose();
    }
  };
  const getReasonDescription = (reason) => {
    switch (reason) {
      case "qa_exhausted":
        return `QA loop exhausted after ${String(review.context.qaIterations ?? "unknown")} iterations`;
      case "merge_conflict":
        return "Merge conflict detected";
      case "manual_request":
        return "Manual review requested";
      default:
        return "Review required";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!review, onOpenChange: handleOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[500px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Human Review Required" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: getReasonDescription(review.reason) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 py-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Task ID" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground font-mono", children: review.taskId })
      ] }),
      review.context.escalationReason && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Reason" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: review.context.escalationReason })
      ] }),
      review.context.suggestedAction && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Suggested Action" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: review.context.suggestedAction })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", htmlFor: "review-feedback", children: "Feedback (required for rejection)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            id: "review-feedback",
            value: feedback,
            onChange: handleFeedbackChange,
            placeholder: "Enter feedback or resolution notes...",
            className: "mt-2 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            rows: 4
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outline",
          onClick: () => void handleReject(),
          disabled: isSubmitting || !feedback.trim(),
          children: "Reject"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void handleApprove(), disabled: isSubmitting, children: "Approve" })
    ] })
  ] }) });
}
function isElectronEnvironment$1() {
  return typeof window !== "undefined" && typeof window.nexusAPI !== "undefined";
}
function formatLogEntry(log) {
  const timestamp = new Date(log.timestamp).toLocaleTimeString();
  const prefix = log.type === "error" ? "ERROR" : log.type === "warning" ? "WARN" : log.type.toUpperCase();
  const details = log.details ? `
  ${log.details}` : "";
  return `[${timestamp}] ${prefix} ${log.message}${details}`;
}
function downloadLogFile(content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nexus-execution-logs-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function ExecutionLogViewer({ stepType, isOpen, onClose }) {
  const [logs, setLogs] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const logContainerRef = reactExports.useRef(null);
  const loadLogs = reactExports.useCallback(async () => {
    if (!isElectronEnvironment$1()) {
      setError("Execution logs are only available in the desktop app.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const rawLogs = await window.nexusAPI.getExecutionLogs(stepType);
      const entries = Array.isArray(rawLogs) ? rawLogs : [];
      setLogs(entries.map(formatLogEntry));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load execution logs.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [stepType]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    void loadLogs();
  }, [isOpen, loadLogs]);
  reactExports.useEffect(() => {
    if (!isOpen || !isElectronEnvironment$1()) return;
    const unsubscribe = window.nexusAPI.onExecutionLogUpdate((data) => {
      if (data.stepType !== stepType) return;
      const logEntry = data.log;
      setLogs((prev) => [...prev, formatLogEntry(logEntry)]);
    });
    return () => {
      unsubscribe();
    };
  }, [isOpen, stepType]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const container = logContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, isOpen]);
  const handleExportLogs = reactExports.useCallback(async () => {
    if (!isElectronEnvironment$1()) {
      toast.error("Exporting logs requires the desktop app.");
      return;
    }
    try {
      const content = await window.nexusAPI.exportExecutionLogs();
      downloadLogFile(content);
      toast.success("Execution logs exported.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export execution logs.";
      toast.error(message);
    }
  }, []);
  const handleClearLogs = reactExports.useCallback(async () => {
    if (!isElectronEnvironment$1()) {
      toast.error("Clearing logs requires the desktop app.");
      return;
    }
    try {
      await window.nexusAPI.clearExecutionLogs();
      setLogs([]);
      toast.success("Execution logs cleared.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear execution logs.";
      toast.error(message);
    }
  }, []);
  const stepLabel = stepType.charAt(0).toUpperCase() + stepType.slice(1);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: isOpen, onOpenChange: (open) => {
    if (!open) onClose();
  }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[760px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
      stepLabel,
      " Logs"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-md border border-accent-error/40 bg-accent-error/10 px-3 py-2 text-sm text-accent-error", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          ref: logContainerRef,
          className: cn(
            "max-h-[420px] overflow-auto rounded-lg border border-border-default",
            "bg-bg-dark px-4 py-3 font-mono text-xs text-text-secondary"
          ),
          children: [
            isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-text-secondary", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Loading logs..." })
            ] }),
            !isLoading && logs.length === 0 && !error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-text-tertiary", children: "No logs available for this step." }),
            !isLoading && logs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: logs.map((line, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "whitespace-pre-wrap leading-relaxed", children: line }, `${stepType}-log-${index}`)) })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => void handleClearLogs(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-2 h-4 w-4" }),
        "Clear Logs"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => void handleExportLogs(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-2 h-4 w-4" }),
        "Export Logs"
      ] })
    ] })
  ] }) });
}
function isElectronEnvironment() {
  return typeof window !== "undefined" && typeof window.nexusAPI !== "undefined";
}
function convertLogsToStrings(logs) {
  if (logs.length === 0) {
    return [];
  }
  return logs.map((log) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const prefix = log.type === "error" ? "✗" : log.type === "warning" ? "⚠" : "•";
    const details = log.details ? `
  ${log.details}` : "";
    return `[${timestamp}] ${prefix} ${log.message}${details}`;
  });
}
const defaultTabs = [
  { id: "build", label: "Build", status: "pending", logs: [] },
  { id: "lint", label: "Lint", status: "pending", logs: [] },
  { id: "test", label: "Test", status: "pending", logs: [] },
  { id: "review", label: "Review", status: "pending", logs: [] }
];
function TabButton({ tab, isActive, onClick }) {
  const getStatusIcon = () => {
    switch (tab.status) {
      case "success":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-4 h-4 text-accent-success" });
      case "error":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "w-4 h-4 text-accent-error" });
      case "running":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 text-accent-primary animate-spin" });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 rounded-full bg-bg-hover" });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      className: cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg",
        "transition-colors border-b-2",
        isActive ? "text-text-primary border-accent-primary bg-bg-card" : "text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-hover"
      ),
      "data-testid": `execution-tab-${tab.id}`,
      children: [
        getStatusIcon(),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: tab.label }),
        tab.count !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "px-1.5 py-0.5 text-xs rounded",
              tab.status === "error" ? "bg-accent-error/20 text-accent-error" : "bg-bg-hover text-text-secondary"
            ),
            children: tab.count
          }
        ),
        tab.duration && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-tertiary", children: [
          (tab.duration / 1e3).toFixed(1),
          "s"
        ] })
      ]
    }
  );
}
function LogViewer({ logs, status, autoScroll = true }) {
  const containerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref: containerRef,
      className: cn(
        "flex-1 bg-bg-dark rounded-lg border border-border-default overflow-auto",
        "font-mono text-sm"
      ),
      "data-testid": "log-viewer",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-0.5", children: [
        logs.map((line, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "flex items-start gap-3 leading-relaxed",
              line.startsWith("$") && "text-accent-secondary font-semibold",
              line.includes("error") && "text-accent-error",
              line.includes("warning") && "text-accent-warning",
              (line.includes("") || line.includes("passed") || line.includes("success")) && "text-accent-success",
              !line.startsWith("$") && !line.includes("error") && !line.includes("warning") && !line.includes("") && !line.includes("passed") && !line.includes("success") && "text-text-secondary"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-8 text-right text-text-tertiary shrink-0 select-none", children: index + 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "whitespace-pre-wrap", children: line || " " })
            ]
          },
          index
        )),
        status === "running" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-4 text-accent-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-8" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "animate-pulse", children: "Running..." })
        ] })
      ] })
    }
  );
}
function ExecutionPage() {
  const [activeTab, setActiveTab] = reactExports.useState("build");
  const [tabs, setTabs] = reactExports.useState(defaultTabs);
  const [currentTaskName, setCurrentTaskName] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [logViewerStep, setLogViewerStep] = reactExports.useState(null);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [showErrorsOnly, setShowErrorsOnly] = reactExports.useState(false);
  const {
    pendingReviews,
    activeReview,
    loadPendingReviews,
    selectReview,
    approveReview,
    rejectReview
  } = useCheckpoint();
  const loadRealData = reactExports.useCallback(async () => {
    if (!isElectronEnvironment()) {
      setError("Backend not available. Please run in Electron.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const status = await window.nexusAPI.getExecutionStatus();
      const newTabs = status.steps.map((step) => ({
        id: step.type,
        label: step.type.charAt(0).toUpperCase() + step.type.slice(1),
        status: step.status,
        count: step.count,
        duration: step.duration,
        logs: convertLogsToStrings(step.logs)
      }));
      setTabs(newTabs);
      setCurrentTaskName(status.currentTaskName);
    } catch (err) {
      console.error("Failed to load execution status:", err);
      setError(err instanceof Error ? err.message : "Failed to load execution status");
    } finally {
      setLoading(false);
    }
  }, []);
  const subscribeToEvents = reactExports.useCallback(() => {
    if (!isElectronEnvironment()) return () => {
    };
    if (!window.nexusAPI) return () => {
    };
    const unsubscribeLog = window.nexusAPI.onExecutionLogUpdate((data) => {
      setTabs((prevTabs) => prevTabs.map((tab) => {
        if (tab.id === data.stepType) {
          const logEntry = data.log;
          const newLogLine = `[${new Date(logEntry.timestamp).toLocaleTimeString()}] ${logEntry.message}`;
          return { ...tab, logs: [...tab.logs, newLogLine] };
        }
        return tab;
      }));
    });
    const unsubscribeStatus = window.nexusAPI.onExecutionStatusChange((data) => {
      setTabs((prevTabs) => prevTabs.map((tab) => {
        if (tab.id === data.stepType) {
          return { ...tab, status: data.status };
        }
        return tab;
      }));
    });
    return () => {
      unsubscribeLog();
      unsubscribeStatus();
    };
  }, []);
  reactExports.useEffect(() => {
    void loadRealData();
    const unsubscribe = subscribeToEvents();
    let interval = null;
    if (isElectronEnvironment()) {
      interval = setInterval(() => void loadRealData(), 5e3);
    }
    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [loadRealData, subscribeToEvents]);
  reactExports.useEffect(() => {
    if (!isElectronEnvironment()) return;
    void loadPendingReviews();
    const reviewInterval = setInterval(() => void loadPendingReviews(), 5e3);
    return () => {
      clearInterval(reviewInterval);
    };
  }, [loadPendingReviews]);
  reactExports.useEffect(() => {
    if (!isElectronEnvironment()) return;
    if (!window.nexusAPI) return;
    const unsubscribe = window.nexusAPI.onNexusEvent((event) => {
      if (event.type === "review:requested" || event.type === "task:escalated") {
        void loadPendingReviews();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadPendingReviews]);
  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];
  const filteredLogs = reactExports.useMemo(() => {
    let logs = activeTabData.logs;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter((line) => line.toLowerCase().includes(query));
    }
    if (showErrorsOnly) {
      logs = logs.filter(
        (line) => line.toLowerCase().includes("error") || line.includes("✗") || line.toLowerCase().includes("failed") || line.toLowerCase().includes("failure")
      );
    }
    return logs;
  }, [activeTabData.logs, searchQuery, showErrorsOnly]);
  const handleClearLogs = async () => {
    if (isElectronEnvironment()) {
      try {
        await window.nexusAPI?.clearExecutionLogs();
      } catch (err) {
        console.error("Failed to clear logs:", err);
      }
    }
    setTabs(tabs.map((tab) => ({ ...tab, status: "pending", count: void 0, duration: void 0, logs: [] })));
  };
  const handleExportLogs = async () => {
    let content = "";
    if (isElectronEnvironment()) {
      try {
        content = await window.nexusAPI?.exportExecutionLogs() ?? "";
      } catch (err) {
        console.error("Failed to export logs:", err);
        return;
      }
    } else {
      content = `Nexus Execution Logs
Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
${"=".repeat(60)}

`;
      for (const tab of tabs) {
        content += `## ${tab.label.toUpperCase()} [${tab.status.toUpperCase()}]
`;
        if (tab.duration) content += `Duration: ${(tab.duration / 1e3).toFixed(2)}s
`;
        content += `${"-".repeat(40)}
${tab.logs.length > 0 ? tab.logs.join("\n") : "No logs available"}

`;
      }
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-execution-logs-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-screen", "data-testid": "execution-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Header,
      {
        title: "Execution Logs",
        subtitle: currentTaskName ? `Current task: ${currentTaskName}` : "No active task",
        icon: Terminal,
        showBack: true,
        actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          pendingReviews.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                selectReview(pendingReviews[0]);
              },
              className: "flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-2 w-2 rounded-full bg-amber-400" }),
                pendingReviews.length,
                " Review",
                pendingReviews.length === 1 ? "" : "s"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => void handleExportLogs(),
              "data-testid": "export-logs-button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-2" }),
                "Export"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => void handleClearLogs(),
              "data-testid": "clear-logs-button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4 mr-2" }),
                "Clear"
              ]
            }
          )
        ] })
      }
    ),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-6 mt-4 px-4 py-3 bg-accent-error/10 border border-accent-error/30 rounded-lg flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-5 h-5 text-accent-error" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-accent-error", children: error })
    ] }),
    pendingReviews.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-6 mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-5 h-5 text-amber-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-amber-200", children: [
          pendingReviews.length,
          " task",
          pendingReviews.length > 1 ? "s" : "",
          " need",
          pendingReviews.length === 1 ? "s" : "",
          " human review"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          variant: "outline",
          onClick: () => {
            selectReview(pendingReviews[0]);
          },
          className: "border-amber-500/50 text-amber-200 hover:bg-amber-500/20",
          children: "Review Now"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ReviewModal,
      {
        review: activeReview,
        onApprove: approveReview,
        onReject: rejectReview,
        onClose: () => {
          selectReview(null);
        }
      }
    ),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 text-accent-primary animate-spin" }) }),
    !loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col p-6 min-h-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex items-center gap-1 border-b border-border-default shrink-0",
          role: "tablist",
          "data-testid": "execution-tabs",
          children: tabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            TabButton,
            {
              tab,
              isActive: activeTab === tab.id,
              onClick: () => {
                setActiveTab(tab.id);
              }
            },
            tab.id
          ))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-4 shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 max-w-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              placeholder: "Search logs...",
              value: searchQuery,
              onChange: (e) => {
                setSearchQuery(e.target.value);
              },
              className: cn(
                "w-full pl-10 pr-3 py-2 rounded-md border border-border-default bg-bg-card",
                "text-sm text-text-primary placeholder:text-text-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              ),
              "data-testid": "log-search-input"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-text-secondary cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: showErrorsOnly,
              onChange: (e) => {
                setShowErrorsOnly(e.target.checked);
              },
              className: "w-4 h-4 rounded border-border-default bg-bg-card text-accent-primary focus:ring-accent-primary",
              "data-testid": "errors-only-checkbox"
            }
          ),
          "Errors only"
        ] }),
        (searchQuery || showErrorsOnly) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-tertiary", children: [
          "Showing ",
          filteredLogs.length,
          " of ",
          activeTabData.logs.length,
          " lines"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 mt-4 min-h-0 flex flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogViewer, { logs: filteredLogs, status: activeTabData.status, autoScroll: !searchQuery && !showErrorsOnly }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center justify-between mt-4 px-4 py-3 bg-bg-card rounded-lg border border-border-default shrink-0",
          "data-testid": "execution-summary",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-4", children: tabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "w-2 h-2 rounded-full",
                    tab.status === "success" && "bg-accent-success",
                    tab.status === "error" && "bg-accent-error",
                    tab.status === "running" && "bg-accent-primary animate-pulse",
                    tab.status === "pending" && "bg-text-tertiary"
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-secondary", children: tab.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  className: "h-6 px-2 text-xs",
                  onClick: () => {
                    setLogViewerStep(tab.id);
                  },
                  children: "View Logs"
                }
              )
            ] }, tab.id)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-text-tertiary", children: [
              "Total Duration:",
              " ",
              (tabs.reduce((acc, t) => acc + (t.duration || 0), 0) / 1e3).toFixed(1),
              "s"
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExecutionLogViewer,
      {
        stepType: logViewerStep ?? "build",
        isOpen: logViewerStep !== null,
        onClose: () => {
          setLogViewerStep(null);
        }
      }
    )
  ] });
}
export {
  ExecutionPage as default
};
