const test = require("node:test");
const assert = require("node:assert/strict");

process.env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "unit-test-secret";

const {
  createPasswordHash,
  verifyPassword,
  resolveAthletesLimit,
  resolveAthletesPage,
  buildAthleteQuery,
  normalizeSearchTerm,
} = require("../server");

test("verifyPassword returns true for correct password and false for incorrect", async () => {
  const hash = await createPasswordHash("Str0ngPass!");
  assert.equal(await verifyPassword("Str0ngPass!", hash), true);
  assert.equal(await verifyPassword("wrong-pass", hash), false);
});

test("verifyPassword handles malformed hash safely", async () => {
  assert.equal(await verifyPassword("anything", null), false);
  assert.equal(await verifyPassword("anything", "invalid"), false);
  assert.equal(await verifyPassword("anything", "salt:not-hex-value"), false);
});

test("resolveAthletesLimit clamps invalid, negative, and large values", () => {
  assert.equal(resolveAthletesLimit(undefined), 25);
  assert.equal(resolveAthletesLimit("0"), 1);
  assert.equal(resolveAthletesLimit("-3"), 1);
  assert.equal(resolveAthletesLimit("27.9"), 27);
  assert.equal(resolveAthletesLimit("150"), 100);
});

test("resolveAthletesPage clamps invalid, negative, and large values", () => {
  assert.equal(resolveAthletesPage(undefined), 1);
  assert.equal(resolveAthletesPage("0"), 1);
  assert.equal(resolveAthletesPage("-9"), 1);
  assert.equal(resolveAthletesPage("3.8"), 3);
  assert.equal(resolveAthletesPage("12000"), 10000);
});

test("buildAthleteQuery normalizes search and filters", () => {
  const filters = buildAthleteQuery({
    search: "  Phelps*** ",
    sport: "Swimming",
    medal: "Gold",
    year: "2012",
    country: "USA",
  });

  assert.deepEqual(filters, {
    $text: { $search: "Phelps" },
    sport: "Swimming",
    medal: "Gold",
    year: 2012,
    region: "USA",
  });
});

test("normalizeSearchTerm strips punctuation and collapses spaces", () => {
  assert.equal(normalizeSearchTerm("  ab@@  cd   ef  "), "ab cd ef");
});
