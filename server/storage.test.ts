import { describe, it, expect } from "vitest";
import { describeDbMode } from "./storage";

// De opstartregel is de enige plek waar zichtbaar wordt of de database durable
// is. Zonder DATABASE_URL draait de app op een vluchtige lokale PGlite; dat gaat
// stil mis (build, healthcheck en seed slagen alle drie), dus dit gedrag
// verdient een test.

describe("describeDbMode", () => {
  it("meldt Neon/Postgres als DATABASE_URL gezet is", () => {
    const notice = describeDbMode(true, "data.db", "production");
    expect(notice?.level).toBe("log");
    expect(notice?.message).toContain("DATABASE_URL");
  });

  it("waarschuwt luid in productie als DATABASE_URL ontbreekt", () => {
    const notice = describeDbMode(false, "data.db", "production");
    expect(notice?.level).toBe("warn");
    expect(notice?.message).toContain("VLUCHTIG");
    expect(notice?.message).toContain("DATABASE_URL");
  });

  it("is buiten productie een gewone logregel, geen waarschuwing", () => {
    const notice = describeDbMode(false, "data.db", "development");
    expect(notice?.level).toBe("log");
    expect(notice?.message).not.toContain("VLUCHTIG");
  });

  it("zwijgt bij een in-memory database zonder DATABASE_URL (tests)", () => {
    expect(describeDbMode(false, ":memory:", "test")).toBeNull();
    expect(describeDbMode(false, ":memory:", "production")).toBeNull();
  });
});
