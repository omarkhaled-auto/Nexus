import { r as reactExports, j as jsxRuntimeExports, ad as Terminal, H as Button, T as TriangleAlert, L as LoaderCircle, a as cn } from "./index-BoQyQ-ap.js";
import { H as Header } from "./Header-UVvTDEGF.js";
import { D as Download } from "./download-im9mP9tg.js";
import { T as Trash2 } from "./trash-2-D-vVDL80.js";
import { C as CircleX } from "./circle-x-Di8ZTA2A.js";
import { C as CircleCheckBig } from "./circle-check-big-B_n4a8JE.js";
import "./arrow-left-SdQ-w_nS.js";
function isElectronEnvironment() {
  return typeof window !== "undefined" && typeof window.nexusAPI !== "undefined";
}
function convertLogsToStrings(logs) {
  if (!logs || logs.length === 0) {
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
function LogViewer({ logs, status }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
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
      if (status && status.steps) {
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
      } else {
        setTabs(defaultTabs);
      }
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
  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];
  const handleClearLogs = async () => {
    if (isElectronEnvironment()) {
      try {
        await window.nexusAPI.clearExecutionLogs();
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
        content = await window.nexusAPI.exportExecutionLogs();
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 mt-4 min-h-0 flex flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogViewer, { logs: activeTabData.logs, status: activeTabData.status }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center justify-between mt-4 px-4 py-3 bg-bg-card rounded-lg border border-border-default shrink-0",
          "data-testid": "execution-summary",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-4", children: tabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
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
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-secondary", children: tab.label })
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
    ] })
  ] });
}
export {
  ExecutionPage as default
};
