import { describe, it, expect } from "vitest";
import { checkAndUpdateBudget, reconcileBudget, getBudgetStatus } from "./ai";

// DAILY_TOKEN_LIMIT is in test-setup.ts op 1000 gezet. Deze tests delen de
// module-status en draaien daarom als één sequentieel scenario.
describe("token-budget", () => {
  it("start met het geconfigureerde limiet en 0 verbruik", () => {
    const s = getBudgetStatus();
    expect(s.limit).toBe(1000);
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(1000);
  });

  it("reserveert tokens binnen het limiet", () => {
    expect(checkAndUpdateBudget(600)).toBe(true);
    expect(getBudgetStatus().used).toBe(600);
  });

  it("weigert een reservering die het limiet zou overschrijden", () => {
    expect(checkAndUpdateBudget(600)).toBe(false); // 600 + 600 > 1000
    expect(getBudgetStatus().used).toBe(600); // ongewijzigd na weigering
  });

  it("corrigeert het verbruik met de werkelijke tokens", () => {
    reconcileBudget(500, 600); // werkelijk 500, gereserveerd 600 → -100
    expect(getBudgetStatus().used).toBe(500);
    expect(getBudgetStatus().remaining).toBe(500);
  });
});
