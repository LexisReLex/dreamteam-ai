import { describe, it, expect } from "vitest";
import { describeDbPath } from "./storage";

// De opstartregel is de enige plek waar zichtbaar wordt of de database op een
// persistent volume staat. Zonder DB_PATH gaat dat stil mis (build, healthcheck
// en seed slagen alle drie), dus dit gedrag verdient een test.

describe("describeDbPath", () => {
  it("meldt het pad als DB_PATH expliciet gezet is", () => {
    const notice = describeDbPath("/data/dreamteam.db", true, "production");
    expect(notice?.level).toBe("log");
    expect(notice?.message).toContain("/data/dreamteam.db");
    expect(notice?.message).toContain("DB_PATH");
  });

  it("waarschuwt luid in productie als DB_PATH ontbreekt", () => {
    const notice = describeDbPath("data.db", false, "production");
    expect(notice?.level).toBe("warn");
    expect(notice?.message).toContain("VLUCHTIG");
    expect(notice?.message).toContain("DB_PATH=/data/dreamteam.db");
  });

  it("is buiten productie een gewone logregel, geen waarschuwing", () => {
    const notice = describeDbPath("data.db", false, "development");
    expect(notice?.level).toBe("log");
    expect(notice?.message).not.toContain("VLUCHTIG");
  });

  it("zwijgt bij een in-memory database (tests)", () => {
    expect(describeDbPath(":memory:", true, "test")).toBeNull();
    expect(describeDbPath(":memory:", false, "production")).toBeNull();
  });
});
