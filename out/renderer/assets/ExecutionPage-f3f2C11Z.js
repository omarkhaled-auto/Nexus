import { r as reactExports, j as jsxRuntimeExports, T as Terminal, n as Button, a as cn, L as LoaderCircle } from "./index-xnK5wLuD.js";
import { H as Header } from "./Header-B6Pu_07z.js";
import { D as Download } from "./download-3kURp0-F.js";
import { T as Trash2 } from "./trash-2-DG-6S5M4.js";
import { C as CircleX } from "./circle-x-BDPGfBfa.js";
import { C as CircleCheckBig } from "./circle-check-big-BGG7AhUM.js";
import "./arrow-left-CgFeZlyf.js";
const mockTabs = [
  {
    id: "build",
    label: "Build",
    status: "success",
    duration: 2300,
    logs: [
      "$ tsc --noEmit",
      "",
      "Compiling 47 files...",
      "  src/auth/middleware.ts",
      "  src/auth/jwt.ts",
      "  src/auth/oauth.ts",
      "  src/api/routes.ts",
      "  src/api/handlers/userHandler.ts",
      "  src/api/handlers/teamHandler.ts",
      "  src/database/schema.ts",
      "  src/database/migrations/001_init.ts",
      "  ... and 39 more files",
      "",
      "Compilation complete. 0 errors.",
      "Duration: 2.3s"
    ]
  },
  {
    id: "lint",
    label: "Lint",
    status: "success",
    count: 0,
    duration: 1100,
    logs: [
      "$ eslint src/ --ext .ts,.tsx",
      "",
      "Checking 47 files...",
      "",
      "All files passed linting",
      "Checked 47 files in 1.1s"
    ]
  },
  {
    id: "test",
    label: "Test",
    status: "running",
    count: 47,
    logs: [
      "$ vitest run",
      "",
      " DEV  v1.6.0 /project",
      "",
      " auth/middleware.test.ts (8 tests) 234ms",
      "   verifyToken",
      "     verifies valid tokens",
      "     rejects expired tokens",
      "     rejects invalid signatures",
      "   refreshToken",
      "     rotates refresh tokens",
      "     invalidates old refresh tokens",
      "   validateSession",
      "     validates active sessions",
      "     rejects expired sessions",
      "     handles concurrent sessions",
      "",
      " auth/jwt.test.ts (10 tests) 156ms",
      "   signToken",
      "     creates valid JWT tokens",
      "     includes correct claims",
      "     sets expiration correctly",
      "   verifyToken",
      "     verifies valid tokens",
      "     handles malformed tokens",
      "   ...",
      "",
      " auth/oauth.test.ts (5 tests) 312ms",
      "   GoogleOAuth",
      "     handles authorization code",
      "     exchanges tokens correctly",
      "   GitHubOAuth",
      "     handles authorization code",
      "     exchanges tokens correctly",
      "     handles organization access",
      "",
      " Running 24 more tests..."
    ]
  },
  {
    id: "review",
    label: "Review",
    status: "pending",
    logs: ["Waiting for tests to complete..."]
  }
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
  const [activeTab, setActiveTab] = reactExports.useState("test");
  const activeTabData = mockTabs.find((t) => t.id === activeTab) || mockTabs[0];
  const handleClearLogs = () => {
  };
  const handleExportLogs = () => {
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-screen", "data-testid": "execution-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Header,
      {
        title: "Execution Logs",
        subtitle: `Current task: Auth System`,
        icon: Terminal,
        showBack: true,
        actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: handleExportLogs,
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
              onClick: handleClearLogs,
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col p-6 min-h-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex items-center gap-1 border-b border-border-default shrink-0",
          role: "tablist",
          "data-testid": "execution-tabs",
          children: mockTabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            TabButton,
            {
              tab,
              isActive: activeTab === tab.id,
              onClick: () => setActiveTab(tab.id)
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
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-4", children: mockTabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
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
              (mockTabs.reduce((acc, t) => acc + (t.duration || 0), 0) / 1e3).toFixed(1),
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
