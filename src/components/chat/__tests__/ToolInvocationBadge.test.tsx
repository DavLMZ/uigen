import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { ToolInvocationBadge } from "../ToolInvocationBadge";

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: string = "result",
  result: unknown = "Success"
) {
  return { toolName, args, state, result };
}

// str_replace_editor labels

test("shows 'Creating' for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "str_replace",
        path: "/components/Card.jsx",
      })}
    />
  );
  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "insert",
        path: "/components/Card.jsx",
      })}
    />
  );
  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("shows 'Viewing' for str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "view",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Viewing /App.jsx")).toBeDefined();
});

// file_manager labels

test("shows 'Deleting' for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "delete",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("shows 'Renaming' for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "rename",
        path: "/App.jsx",
        new_path: "/NewApp.jsx",
      })}
    />
  );
  expect(screen.getByText("Renaming /App.jsx")).toBeDefined();
});

// Fallback

test("falls back to tool name for unknown tool", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("unknown_tool", { command: "run" })}
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("falls back to tool name when path is missing", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
      })}
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

// State-based icon rendering

test("renders green dot when state is result with a result value", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result",
        "Success"
      )}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("renders spinner when state is not result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "call",
        undefined
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("renders spinner when result is null", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result",
        null
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});
