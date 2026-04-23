const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const { loadEnvFile } = require("../lib/env");
const { connectToDatabase } = require("../config/db");
const Athlete = require("../models/Athlete");
const Region = require("../models/Region");
const Summary = require("../models/Summary");

loadEnvFile();

const DATA_DIR = path.join(__dirname, "../../data");
const ATHLETES_FILE = path.join(DATA_DIR, "athlete_events.csv");
const REGIONS_FILE = path.join(DATA_DIR, "noc_regions.csv");
const MAX_ATHLETES_TO_IMPORT = (() => {
  const parsed = Number(process.env.MAX_ATHLETES_TO_IMPORT);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.trunc(parsed);
})();

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function createSummaryAccumulator() {
  return {
    totalRecords: 0,
    athleteNames: new Set(),
    countries: new Set(),
    sports: new Set(),
    editions: new Set(),
    years: new Set(),
    medalBreakdown: { Gold: 0, Silver: 0, Bronze: 0, None: 0 },
    sportCounts: new Map(),
    countryCounts: new Map(),
    yearCounts: new Map(),
  };
}

function addAthleteToSummary(accumulator, athlete) {
  accumulator.totalRecords += 1;

  if (athlete.name) {
    accumulator.athleteNames.add(athlete.name);
  }

  if (athlete.sport) {
    accumulator.sports.add(athlete.sport);
    accumulator.sportCounts.set(
      athlete.sport,
      (accumulator.sportCounts.get(athlete.sport) || 0) + 1
    );
  }

  if (athlete.region) {
    accumulator.countries.add(athlete.region);
    accumulator.countryCounts.set(
      athlete.region,
      (accumulator.countryCounts.get(athlete.region) || 0) + 1
    );
  }

  if (Number.isFinite(athlete.year)) {
    accumulator.years.add(athlete.year);
    accumulator.yearCounts.set(
      athlete.year,
      (accumulator.yearCounts.get(athlete.year) || 0) + 1
    );
  }

  if (Number.isFinite(athlete.year) && athlete.season) {
    accumulator.editions.add(`${athlete.year}-${athlete.season}`);
  }

  const medal = accumulator.medalBreakdown[athlete.medal] != null ? athlete.medal : "None";
  accumulator.medalBreakdown[medal] += 1;
}

function buildSummary(accumulator, regionsByNoc) {
  const formatTopEntries = (entries) =>
    entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

  return {
    key: "olympics-dashboard",
    totalRecords: accumulator.totalRecords,
    uniqueAthletes: accumulator.athleteNames.size,
    countriesRepresented: accumulator.countries.size,
    sportsCovered: accumulator.sports.size,
    editionsCovered: accumulator.editions.size,
    medalBreakdown: accumulator.medalBreakdown,
    topSports: formatTopEntries([...accumulator.sportCounts.entries()]),
    topCountries: formatTopEntries([...accumulator.countryCounts.entries()]),
    recentEditions: [...accumulator.yearCounts.entries()]
      .sort((a, b) => b[0] - a[0])
      .slice(0, 6)
      .map(([year, count]) => ({ year, count })),
    filterOptions: {
      sports: [...accumulator.sports].sort(),
      medals: Object.keys(accumulator.medalBreakdown),
      years: [...accumulator.years]
        .sort((a, b) => b - a)
        .slice(0, 30),
      countries: [...new Set(Object.values(regionsByNoc))].filter(Boolean).sort(),
    },
    lastImportedAt: new Date(),
  };
}

async function upsertAthletesFromCsv(filePath, regionsByNoc, importBatchId, onAthlete) {
  const batchSize = 500;
  let sourceRowNumber = 0;
  let importedCount = 0;
  let writeOperations = [];
  let finished = false;

  function finishOnce(resolve) {
    if (finished) {
      return;
    }
    finished = true;
    resolve();
  }

  function failOnce(reject, error) {
    if (finished) {
      return;
    }
    finished = true;
    reject(error);
  }

  async function flushBatch() {
    if (writeOperations.length === 0) {
      return;
    }

    const operations = writeOperations;
    writeOperations = [];

    await Athlete.bulkWrite(operations, { ordered: false });
    importedCount += operations.length;
    console.log(`Imported ${importedCount} athletes`);
  }

  await new Promise((resolve, reject) => {
    const csvStream = fs.createReadStream(filePath).pipe(csv());

    csvStream.on("data", (row) => {
      if (MAX_ATHLETES_TO_IMPORT != null && sourceRowNumber >= MAX_ATHLETES_TO_IMPORT) {
        csvStream.pause();
        flushBatch()
          .then(() => finishOnce(resolve))
          .catch((error) => failOnce(reject, error))
          .finally(() => csvStream.destroy());
        return;
      }

      csvStream.pause();
      sourceRowNumber += 1;

      const athleteDocument = {
        sourceRowNumber,
        athleteId: parseNumber(row.ID),
        name: row.Name,
        sex: row.Sex,
        age: parseNumber(row.Age),
        height: parseNumber(row.Height),
        weight: parseNumber(row.Weight),
        team: row.Team,
        noc: row.NOC,
        region: regionsByNoc[row.NOC] || row.Team,
        games: row.Games,
        year: parseNumber(row.Year),
        season: row.Season,
        city: row.City,
        sport: row.Sport,
        event: row.Event,
        medal: row.Medal && row.Medal !== "NA" ? row.Medal : "None",
        importBatchId,
      };

      onAthlete(athleteDocument);

      writeOperations.push({
        updateOne: {
          filter: { sourceRowNumber: athleteDocument.sourceRowNumber },
          update: { $set: athleteDocument },
          upsert: true,
        },
      });

      const flushPromise = writeOperations.length >= batchSize
        ? flushBatch()
        : Promise.resolve();

      flushPromise
        .then(() => csvStream.resume())
        .catch((error) => failOnce(reject, error));
    });

    csvStream.on("end", () => {
      flushBatch()
        .then(() => finishOnce(resolve))
        .catch((error) => failOnce(reject, error));
    });

    csvStream.on("error", (error) => failOnce(reject, error));
  });

  return importedCount;
}

async function importData() {
  await connectToDatabase();
  const importBatchId = new Date().toISOString();

  console.log("Connected to MongoDB. Reading region CSV...");
  const regionRows = await readCsv(REGIONS_FILE);

  const regionDocuments = regionRows.map((row) => ({
    noc: row.NOC,
    region: row.region || "",
    notes: row.notes || "",
    importBatchId,
  }));

  const regionsByNoc = regionRows.reduce((accumulator, row) => {
    accumulator[row.NOC] = row.region;
    return accumulator;
  }, {});

  console.log("Upserting MongoDB collections with a safe import batch...");

  await Region.bulkWrite(
    regionDocuments.map((document) => ({
      updateOne: {
        filter: { noc: document.noc },
        update: { $set: document },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  console.log("Streaming athlete CSV and importing in batches...");
  const summaryAccumulator = createSummaryAccumulator();
  await upsertAthletesFromCsv(ATHLETES_FILE, regionsByNoc, importBatchId, (athleteDocument) => {
    addAthleteToSummary(summaryAccumulator, athleteDocument);
  });

  const summary = buildSummary(summaryAccumulator, regionsByNoc);

  await Summary.findOneAndUpdate(
    { key: "olympics-dashboard" },
    { $set: summary },
    { upsert: true, returnDocument: "after" }
  );

  await Promise.all([
    Region.deleteMany({ importBatchId: { $ne: importBatchId } }),
    Athlete.deleteMany({ importBatchId: { $ne: importBatchId } }),
  ]);

  console.log("MongoDB import complete.");
  process.exit(0);
}

importData().catch((error) => {
  console.error("MongoDB import failed:", error);
  process.exit(1);
});
