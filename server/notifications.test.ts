import { describe, it, expect } from "vitest";
import {
  priorityBucket,
  priorityForVerdict,
  buildLoopNotification,
  isNotifyTokenValid,
} from "./notifications";

describe("priorityBucket", () => {
  it("mapt de gotify-schaal 0–10 op de juiste buckets", () => {
    expect(priorityBucket(0)).toBe("min");
    expect(priorityBucket(1)).toBe("min");
    expect(priorityBucket(2)).toBe("low");
    expect(priorityBucket(3)).toBe("low");
    expect(priorityBucket(4)).toBe("normal");
    expect(priorityBucket(7)).toBe("normal");
    expect(priorityBucket(8)).toBe("high");
    expect(priorityBucket(10)).toBe("high");
  });

  it("klemt buiten bereik en rondt af", () => {
    expect(priorityBucket(-5)).toBe("min");
    expect(priorityBucket(99)).toBe("high");
    expect(priorityBucket(7.6)).toBe("high"); // rondt naar 8
  });
});

describe("priorityForVerdict", () => {
  it("geeft ESCALATE en ERROR de hoogste urgentie (Human gate)", () => {
    expect(priorityForVerdict("ESCALATE")).toBe(8);
    expect(priorityBucket(priorityForVerdict("ESCALATE"))).toBe("high");
    expect(priorityForVerdict("ERROR")).toBe(7);
  });

  it("geeft REJECT normaal en APPROVE low", () => {
    expect(priorityBucket(priorityForVerdict("REJECT"))).toBe("normal");
    expect(priorityBucket(priorityForVerdict("APPROVE"))).toBe("low");
  });

  it("valt terug op normaal bij een onbekend verdict", () => {
    expect(priorityForVerdict("ONZIN")).toBe(5);
  });
});

describe("buildLoopNotification", () => {
  const loop = { id: 3, name: "SEO quick wins" };

  it("bouwt een melding met bron, titel, prioriteit en link", () => {
    const n = buildLoopNotification(
      loop,
      { verdict: "ESCALATE", score: 40, critique: "Vereist menselijk oordeel." },
      "Kai",
    );
    expect(n.source).toBe("loop:Kai");
    expect(n.title).toContain("SEO quick wins");
    expect(n.title).toContain("ESCALATE");
    expect(n.priority).toBe(8);
    expect(n.message).toContain("Vereist menselijk oordeel.");
    expect(n.message).toContain("40");
    expect(n.link).toBe("/loops");
  });

  it("valt terug op een generieke tekst zonder critique", () => {
    const n = buildLoopNotification(loop, { verdict: "APPROVE", score: 88, critique: "" }, "Nova");
    expect(n.message).toContain("88");
    expect(n.priority).toBe(2);
  });

  it("gebruikt een default agentnaam", () => {
    const n = buildLoopNotification(loop, { verdict: "REJECT", score: 20, critique: "" });
    expect(n.source).toBe("loop:Agent");
  });
});

describe("isNotifyTokenValid", () => {
  it("staat alles toe als er geen token is geconfigureerd (default uit)", () => {
    expect(isNotifyTokenValid("", "")).toBe(true);
    expect(isNotifyTokenValid("wat-dan-ook", "")).toBe(true);
  });

  it("vereist een exacte match als er wél een token is", () => {
    expect(isNotifyTokenValid("geheim", "geheim")).toBe(true);
    expect(isNotifyTokenValid("fout", "geheim")).toBe(false);
    expect(isNotifyTokenValid("", "geheim")).toBe(false);
    expect(isNotifyTokenValid("verschillende-lengte", "geheim")).toBe(false);
  });
});
