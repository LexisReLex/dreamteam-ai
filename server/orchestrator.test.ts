import { describe, it, expect } from "vitest";
import {
  parsePlan,
  buildPlannerSystem,
  buildSpecialistUser,
  buildSynthesisUser,
  MAX_STEPS,
} from "./orchestrator";
import type { Agent } from "@shared/schema";

const agent = (id: number, name: string): Agent => ({
  id,
  name,
  role: `${name} rol`,
  description: "",
  avatarColor: "#000",
  avatarIcon: "Users",
  specialty: `${name} specialisme`,
  status: "idle",
  tasksCompleted: 0,
  category: "test",
});

const ROSTER = [agent(1, "Nova"), agent(2, "Rex"), agent(3, "Mira")];

describe("parsePlan", () => {
  it("parseert een schoon plan met geldige agent-id's", () => {
    const raw = '{"rationale":"verdeeld","steps":[{"agentId":1,"task":"maak campagne"},{"agentId":3,"task":"schrijf content"}]}';
    const plan = parsePlan(raw, [1, 2, 3]);
    expect(plan.rationale).toBe("verdeeld");
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toEqual({ agentId: 1, task: "maak campagne" });
  });

  it("pakt JSON uit tekst eromheen", () => {
    const raw = 'Hier is mijn plan: {"rationale":"ok","steps":[{"agentId":2,"task":"sales"}]} — klaar.';
    const plan = parsePlan(raw, [1, 2, 3]);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].agentId).toBe(2);
  });

  it("filtert onbekende agent-id's weg", () => {
    const raw = '{"rationale":"x","steps":[{"agentId":99,"task":"onbekend"},{"agentId":1,"task":"geldig"}]}';
    const plan = parsePlan(raw, [1, 2, 3]);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].agentId).toBe(1);
  });

  it("negeert stappen zonder taak", () => {
    const raw = '{"steps":[{"agentId":1,"task":""},{"agentId":2}]}';
    const plan = parsePlan(raw, [1, 2, 3]);
    expect(plan.steps).toHaveLength(0);
  });

  it("begrenst het aantal stappen op maxSteps", () => {
    const steps = Array.from({ length: 10 }, () => ({ agentId: 1, task: "taak" }));
    const raw = JSON.stringify({ rationale: "veel", steps });
    const plan = parsePlan(raw, [1], 3);
    expect(plan.steps).toHaveLength(3);
  });

  it("gebruikt MAX_STEPS als default plafond", () => {
    const steps = Array.from({ length: 20 }, () => ({ agentId: 1, task: "taak" }));
    const raw = JSON.stringify({ steps });
    const plan = parsePlan(raw, [1]);
    expect(plan.steps.length).toBeLessThanOrEqual(MAX_STEPS);
  });

  it("geeft een leeg plan bij ongeldige JSON", () => {
    const plan = parsePlan("geen json hier", [1, 2, 3]);
    expect(plan.steps).toHaveLength(0);
    expect(plan.rationale).toBe("");
  });

  it("kapt een te lange taak af", () => {
    const longTask = "a".repeat(1000);
    const raw = JSON.stringify({ steps: [{ agentId: 1, task: longTask }] });
    const plan = parsePlan(raw, [1]);
    expect(plan.steps[0].task.length).toBeLessThanOrEqual(500);
  });
});

describe("buildPlannerSystem", () => {
  it("bevat elke agent met id, naam en specialisme", () => {
    const sys = buildPlannerSystem(ROSTER);
    expect(sys).toContain("id 1: Nova");
    expect(sys).toContain("id 2: Rex");
    expect(sys).toContain("id 3: Mira");
    expect(sys).toContain("Nova specialisme");
  });

  it("noemt het maximale aantal deelopdrachten", () => {
    const sys = buildPlannerSystem(ROSTER);
    expect(sys).toContain(String(MAX_STEPS));
  });
});

describe("buildSpecialistUser", () => {
  it("bevat zowel de volledige opdracht als de deelopdracht", () => {
    const out = buildSpecialistUser("lanceer campagne", "maak de doelgroepanalyse");
    expect(out).toContain("lanceer campagne");
    expect(out).toContain("maak de doelgroepanalyse");
  });
});

describe("buildSynthesisUser", () => {
  it("nummert de bijdragen en bevat naam, taak en output", () => {
    const out = buildSynthesisUser("opdracht", [
      { agentName: "Nova", task: "strategie", output: "de strategie is X" },
      { agentName: "Mira", task: "content", output: "de content is Y" },
    ]);
    expect(out).toContain("opdracht");
    expect(out).toContain("1. Nova");
    expect(out).toContain("2. Mira");
    expect(out).toContain("de strategie is X");
    expect(out).toContain("de content is Y");
  });
});
