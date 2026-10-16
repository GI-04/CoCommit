import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Team list as people with their agents (PLAN/2026-10-16-glass-buttons-spines.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/team.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const t = {};
vm.runInNewContext(code, { exports: t });

const member = (title, name = title) => ({ title, name, role: "", capability: "", availability: "", writeScope: "" });
// Plain local objects, so deepEqual doesn't trip over the other realm's Array and Object.
const shape = (groups) => Array.from(groups, (g) => ({ person: g.person.title, agents: Array.from(g.agents, (a) => a.title), tone: g.tone }));

test("agents go under their person, in COLLAB order", () => {
  const groups = t.groupTeam([
    member("Pattadon"),
    member("Claude-Pattadon", "Claude Opus 5.5, Pattadon's agent (runs on Pattadon's machine)"),
    member("proud"),
    member("Claude-proud"),
    member("Codex-Pattadon"),
  ]);
  assert.deepEqual(shape(groups), [
    { person: "Pattadon", agents: ["Claude-Pattadon", "Codex-Pattadon"], tone: "pink" },
    { person: "proud", agents: ["Claude-proud"], tone: "cyan" },
  ]);
});

test("an agent listed before its person still hangs under that person", () => {
  const groups = t.groupTeam([member("Claude-Kin"), member("Kin"), member("Trin")]);
  assert.deepEqual(shape(groups), [
    { person: "Kin", agents: ["Claude-Kin"], tone: "pink" },
    { person: "Trin", agents: [], tone: "cyan" },
  ]);
});

test("one tone per person, cycling pink, cyan, mustard, green, shared by their agents", () => {
  const people = ["A", "B", "C", "D", "E"].map((n) => member(n));
  const groups = t.groupTeam([...people, member("Claude-C"), member("Claude-E")]);
  assert.deepEqual(
    Array.from(groups, (g) => g.tone),
    ["pink", "cyan", "mustard", "green", "pink"],
  );
  assert.deepEqual(shape(groups).map((g) => g.agents), [[], [], ["Claude-C"], [], ["Claude-E"]]);
});

test("the owner matches case-insensitively, on the title or the name", () => {
  const groups = t.groupTeam([member("Pattadon"), member("claude-PATTADON"), member("Tm", "Trin"), member("Codex-trin")]);
  assert.deepEqual(shape(groups), [
    { person: "Pattadon", agents: ["claude-PATTADON"], tone: "pink" },
    { person: "Tm", agents: ["Codex-trin"], tone: "cyan" },
  ]);
});

test("an agent whose owner isn't listed stands alone, as a person", () => {
  const groups = t.groupTeam([member("Pattadon"), member("Claude-Ghost")]);
  assert.deepEqual(shape(groups), [
    { person: "Pattadon", agents: [], tone: "pink" },
    { person: "Claude-Ghost", agents: [], tone: "cyan" },
  ]);
});

test("owners with a dash in their name are found; a loop or a chain loses nobody", () => {
  assert.deepEqual(shape(t.groupTeam([member("Mary-Jane"), member("Claude-Mary-Jane")])), [
    { person: "Mary-Jane", agents: ["Claude-Mary-Jane"], tone: "pink" },
  ]);
  assert.deepEqual(shape(t.groupTeam([member("Claude-Opus-Pattadon"), member("Pattadon")])), [
    { person: "Pattadon", agents: ["Claude-Opus-Pattadon"], tone: "pink" },
  ]);
  // A real loop: each one's owner text matches the other's name, so neither counts as an agent and both stay listed.
  const loop = t.groupTeam([member("Foo-Bar", "Foo"), member("Bar-Foo", "Bar")]);
  assert.deepEqual(shape(loop).map((g) => g.person), ["Foo-Bar", "Bar-Foo"]);
  const chain = t.groupTeam([member("Pattadon"), member("Claude-Pattadon"), member("Helper-Claude-Pattadon")]);
  assert.equal(shape(chain).flatMap((g) => [g.person, ...g.agents]).length, 3);
});

test("agentLabel with the owner uses the dash that matched", () => {
  const pattadon = member("Pattadon");
  assert.equal(t.agentLabel(member("Claude-Opus-Pattadon"), pattadon), "Claude-Opus · Pattadon's agent");
  assert.equal(t.agentLabel(member("Claude-pattadon"), pattadon), "Claude · Pattadon's agent");
  assert.equal(t.agentLabel(member("Claude-Mary-Jane"), member("Mary-Jane")), "Claude · Mary-Jane's agent");
  assert.equal(t.agentLabel(member("Claude-Tm"), member("Tm", "Trin")), "Claude · Tm's agent");
  assert.equal(t.agentLabel(member("Codex-Trin"), member("Tm", "Trin")), "Codex · Tm's agent");
  assert.equal(t.agentLabel(member("Claude-Nobody"), pattadon), "Claude · Nobody's agent");
});

test("a typical roster: people with one or two agents each, and one person alone", () => {
  const roster = ["Mina", "Claude-Mina", "Ben", "Claude-Ben", "Codex-Ben", "Sam"].map((n) => member(n));
  assert.deepEqual(shape(t.groupTeam(roster)), [
    { person: "Mina", agents: ["Claude-Mina"], tone: "pink" },
    { person: "Ben", agents: ["Claude-Ben", "Codex-Ben"], tone: "cyan" },
    { person: "Sam", agents: [], tone: "mustard" },
  ]);
});

test("an empty list gives no groups, and people with no agents are fine", () => {
  assert.equal(t.groupTeam([]).length, 0);
  assert.deepEqual(shape(t.groupTeam([member("Trin")])), [{ person: "Trin", agents: [], tone: "pink" }]);
});

test("agentLabel is the agent type and the owner; titles without a dash stay as they are", () => {
  assert.equal(t.agentLabel(member("Claude-Pattadon")), "Claude · Pattadon's agent");
  assert.equal(t.agentLabel(member("  Codex-proud ")), "Codex · proud's agent");
  assert.equal(t.agentLabel(member("Claude-Mary-Jane")), "Claude · Mary-Jane's agent");
  assert.equal(t.agentLabel(member("Trin")), "Trin");
  assert.equal(t.agentLabel(member("Claude-")), "Claude-");
  assert.equal(t.agentLabel(member("", "Someone")), "Someone");
});
