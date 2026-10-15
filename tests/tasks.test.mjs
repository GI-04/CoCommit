import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Task files on COCOMMIT/BOARD/ for the Tasks screen (PLAN/2026-10-16-tasks-board.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/tasks-text.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const t = {};
vm.runInNewContext(code, { exports: t });
// Values made inside the vm have its own Array/Object prototypes; compare plain copies.
const plain = (x) => JSON.parse(JSON.stringify(x));

const PENDING = "COCOMMIT/BOARD/Pending/2026-10-16-add-dark-mode.md";

const fresh = () =>
  t.newTaskText({
    title: "Add  dark mode\n",
    to: "Trin",
    from: "@tiramisucake0127",
    created: "2026-10-16",
    what: "Add a dark theme toggle to the sidebar.",
    acceptance: ["Toggle in the sidebar", "", "  Remembers the choice "],
  });

// Written by hand in the style of our own CLAUDE/BOARD tasks: extra lines, comments in headings, placeholders.
const HANDWRITTEN = `# Task: Wire the Context screen

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status. -->

**To:** Trin · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
**Status (16:20, Claude-Pattadon):** the screen still uses mock data.
Wire it to \`src/lib/workspace.ts\`.

## Acceptance
- [ ] Tabs load the real files
- Saving makes one commit

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** {{what is in / out}}
- **Progress:** {{where it stands}}
- **Blockers:** {{or "none"}}

## Handoff <!-- filled only when released back to Pending/ -->
{{what's done, what's left, exact next step}}

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** {{test / command / check}}
- **Result:** {{link to the report in OUTPUT/}}
`;

test("only task files count as board entries", () => {
  assert.deepEqual(plain(t.taskLocation(PENDING)), { path: PENDING, status: "pending", file: "2026-10-16-add-dark-mode.md" });
  assert.equal(t.taskLocation("COCOMMIT/BOARD/Taken/x.md").status, "taken");
  assert.equal(t.taskLocation("COCOMMIT/BOARD/Done/x.md").status, "done");
  for (const other of [
    "COCOMMIT/BOARD/_TEMPLATE.md",
    "COCOMMIT/BOARD/Pending/.gitkeep",
    "COCOMMIT/BOARD/Pending/_draft.md",
    "COCOMMIT/BOARD/Pending/sub/x.md",
    "COCOMMIT/BOARD/Later/x.md",
    "COCOMMIT/BOARD/Pending/x.txt",
    "CLAUDE/BOARD/Pending/x.md",
  ])
    assert.equal(t.taskLocation(other), null, other);
  assert.equal(t.taskPath("taken", "a.md"), "COCOMMIT/BOARD/Taken/a.md");
});

test("a new task reads back the same", () => {
  const md = fresh();
  assert.match(md, /^# Task: Add dark mode\n/);
  const task = t.parseTask(md, PENDING);
  assert.deepEqual(plain({ ...task, text: undefined }), {
    path: PENDING,
    file: "2026-10-16-add-dark-mode.md",
    status: "pending",
    title: "Add dark mode",
    to: "Trin",
    from: "@tiramisucake0127",
    created: "2026-10-16",
    what: "Add a dark theme toggle to the sidebar.",
    acceptance: ["Toggle in the sidebar", "Remembers the choice"],
    owner: "",
    progress: "",
    blockers: "none",
    verifiedBy: "",
    handoff: "",
  });
  const empty = t.parseTask(t.newTaskText({ title: "x", to: "", from: "", created: "2026-10-16", what: "", acceptance: [] }), PENDING);
  assert.equal(empty.to, "anyone");
  assert.equal(empty.what, "");
  assert.deepEqual(plain(empty.acceptance), []);
});

test("take, done and release change only their own lines (new-task format)", () => {
  const md = fresh();
  const taken = t.withTaken(md, { owner: "proud", progress: "started", when: "2026-10-16 03:30" });
  assert.equal(
    taken,
    md.replace("- **Owner:** — · **Progress:** — · **Blockers:** none", "- **Owner:** proud · **Progress:** started · **Blockers:** none"),
  );
  assert.equal(t.withTaken(md, { owner: "proud", when: "x" }), md.replace("**Owner:** —", "**Owner:** proud"));

  const done = t.withDone(taken, { verifiedBy: "clicked it in Safari", when: "2026-10-16" });
  assert.equal(done, taken.replace("- **Verified by:** —", "- **Verified by:** clicked it in Safari"));
  assert.equal(t.parseTask(done, PENDING).verifiedBy, "clicked it in Safari");

  const released = t.withHandoff(taken, { note: "toggle done,\nstorage left", by: "proud", when: "2026-10-16" });
  assert.equal(released, taken.replace("## Done\n", "## Handoff\n- 2026-10-16 · proud: toggle done, storage left\n\n## Done\n"));
  assert.equal(t.parseTask(released, PENDING).handoff, "- 2026-10-16 · proud: toggle done, storage left");
  const again = t.withHandoff(released, { note: "storage done too", by: "Kin", when: "2026-10-17" });
  assert.match(again, /## Handoff\n- 2026-10-16 · proud: toggle done, storage left\n- 2026-10-17 · Kin: storage done too\n\n## Done\n/);
});

test("hand-written tasks parse, and edits keep everything else", () => {
  const path = "COCOMMIT/BOARD/Pending/2026-10-15-context-screen.md";
  const task = t.parseTask(HANDWRITTEN, path);
  assert.equal(task.title, "Wire the Context screen");
  assert.equal(task.to, "Trin");
  assert.equal(task.from, "Claude-Pattadon");
  assert.equal(task.created, "2026-10-15");
  assert.match(task.what, /^\*\*Status \(16:20, Claude-Pattadon\):\*\* the screen still uses mock data\.\nWire it/);
  assert.deepEqual(plain(task.acceptance), ["Tabs load the real files", "Saving makes one commit"]);
  assert.equal(task.owner, "");
  assert.equal(task.progress, "");
  assert.equal(task.blockers, "");
  assert.equal(task.verifiedBy, "");
  assert.equal(task.handoff, "");

  const taken = t.withTaken(HANDWRITTEN, { owner: "Claude-Trin", progress: "tabs drafted", when: "2026-10-16 04:00" });
  assert.equal(
    taken,
    HANDWRITTEN.replace("- **Owner:** — · **Taken on:** —", "- **Owner:** Claude-Trin · **Taken on:** 2026-10-16 04:00").replace(
      "- **Progress:** {{where it stands}}",
      "- **Progress:** tabs drafted",
    ),
  );

  const done = t.withDone(taken, { verifiedBy: "npm test", when: "2026-10-16" });
  assert.equal(done, taken.replace("- **Done on:** — · **Verified by:** {{test / command / check}}", "- **Done on:** 2026-10-16 · **Verified by:** npm test"));

  const released = t.withHandoff(taken, { note: "tabs drafted, saving left", by: "Claude-Trin", when: "2026-10-16" });
  assert.equal(
    released,
    taken.replace("{{what's done, what's left, exact next step}}\n", "- 2026-10-16 · Claude-Trin: tabs drafted, saving left\n"),
  );
});

test("fields the file doesn't have are added under their section", () => {
  const bare = "# Task: Fix the logo\n\nThe logo is blurry.\n";
  const path = "COCOMMIT/BOARD/Pending/2026-10-16-fix-the-logo.md";
  assert.equal(t.parseTask(bare, path).created, "2026-10-16"); // from the file name
  const taken = t.withTaken(bare, { owner: "Kin", progress: "on it", when: "x" });
  assert.equal(taken, `${bare}\n## Taken\n- **Owner:** Kin\n- **Progress:** on it\n`);
  const done = t.withDone(taken, { verifiedBy: "looked at it", when: "x" });
  assert.equal(done, `${taken}\n## Done\n- **Verified by:** looked at it\n`);
  assert.equal(t.parseTask(done, path).owner, "Kin");
});

test("titles fall back to the first heading, then the file name", () => {
  assert.equal(t.parseTask("# Fix the build\n", PENDING).title, "Fix the build");
  assert.equal(t.parseTask("no heading at all\n", PENDING).title, "2026-10-16-add-dark-mode");
  assert.equal(t.parseTask("# Task: {{title}}\n", PENDING).title, "2026-10-16-add-dark-mode");
});

test("file names: slug, Thai titles, clashes", () => {
  assert.equal(t.taskFileName("2026-10-16", "Add dark mode!", [], "0305"), "2026-10-16-add-dark-mode.md");
  assert.equal(t.taskFileName("2026-10-16", "Café menu", [], "0305"), "2026-10-16-cafe-menu.md");
  assert.equal(t.taskFileName("2026-10-16", "แก้หน้าแชท", [], "0305"), "2026-10-16-task-0305.md");
  assert.equal(t.taskFileName("2026-10-16", "แก้ login", [], "0305"), "2026-10-16-login.md");
  const taken = ["2026-10-16-Add-Dark-Mode.md", "2026-10-16-add-dark-mode-2.md"];
  assert.equal(t.taskFileName("2026-10-16", "Add dark mode", taken, "0305"), "2026-10-16-add-dark-mode-3.md");
  const long = t.taskFileName("2026-10-16", "a".repeat(49) + " b c", [], "0305");
  assert.equal(long, `2026-10-16-${"a".repeat(49)}.md`); // cut at 50 characters, no dash left at the end
});
