const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { promisify } = require("util");

const { loadEnvFile } = require("./lib/env");
const { connectToDatabase } = require("./config/db");
const User = require("./models/User");
const Athlete = require("./models/Athlete");
const Region = require("./models/Region");
const Summary = require("./models/Summary");

loadEnvFile();

const app = express();
const PORT = process.env.PORT || 5000;
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET;
const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const AUTH_COOKIE_NAME = "olympics_session";
const DEFAULT_FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const FRONTEND_ORIGINS = [
  ...new Set([
    ...((process.env.FRONTEND_ORIGIN || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)),
    ...((process.env.FRONTEND_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)),
    ...DEFAULT_FRONTEND_ORIGINS,
  ]),
];
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_MAX_KEYS = 5000;
const authAttemptStore = new Map();
const scryptAsync = promisify(crypto.scrypt);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || FRONTEND_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

async function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)).toString("hex");
  return `${salt}:${hash}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }

  const [salt, savedHash] = storedHash.split(":");

  if (!salt || !savedHash) {
    return false;
  }

  if (!/^[0-9a-f]+$/i.test(savedHash)) {
    return false;
  }

  try {
    const derivedHash = (await scryptAsync(password, salt, 64)).toString("hex");
    if (
      !/^[0-9a-f]+$/i.test(derivedHash)
      || savedHash.length !== derivedHash.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(savedHash, "hex"),
      Buffer.from(derivedHash, "hex")
    );
  } catch {
    return false;
  }
}

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signToken(payload) {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    throw new Error("Invalid token");
  }

  const expectedSignature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(decodeBase64Url(body));

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

function issueAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);

  return signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    tokenVersion: user.tokenVersion || 0,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function getCookieValue(req, cookieName) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const target = cookies.find((entry) => entry.startsWith(`${cookieName}=`));

  if (!target) {
    return "";
  }

  return decodeURIComponent(target.slice(cookieName.length + 1));
}

function buildCookie(value, expiresAt) {
  const isProduction = process.env.NODE_ENV === "production";

  return [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    isProduction ? "Secure" : "",
    expiresAt ? `Expires=${expiresAt.toUTCString()}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function setAuthCookie(res, token) {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  res.setHeader("Set-Cookie", buildCookie(token, expiresAt));
}

function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", buildCookie("", new Date(0)));
}

function getRateLimitKey(req) {
  const email = ((req.body && req.body.email) || "").trim().toLowerCase();
  const userIdentity = req.user ? (req.user.id || req.user.email || "") : "";
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  const identity = userIdentity || email || "anonymous";
  return `${req.path}:${ip}:${identity}`;
}

function cleanupRateLimitBucket(bucket, now) {
  bucket.attempts = bucket.attempts.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
}

function cleanupRateLimitStore(now) {
  for (const [key, bucket] of authAttemptStore.entries()) {
    cleanupRateLimitBucket(bucket, now);
    if (bucket.attempts.length === 0) {
      authAttemptStore.delete(key);
    }
  }

  if (authAttemptStore.size <= RATE_LIMIT_MAX_KEYS) {
    return;
  }

  const entriesByLastSeen = [...authAttemptStore.entries()].sort(
    (a, b) => (a[1].lastSeen || 0) - (b[1].lastSeen || 0)
  );
  const overflow = authAttemptStore.size - RATE_LIMIT_MAX_KEYS;
  for (let index = 0; index < overflow; index += 1) {
    authAttemptStore.delete(entriesByLastSeen[index][0]);
  }
}

function authRateLimiter(req, res, next) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const key = getRateLimitKey(req);
  const bucket = authAttemptStore.get(key) || { attempts: [], lastSeen: now };

  cleanupRateLimitBucket(bucket, now);
  bucket.lastSeen = now;

  if (bucket.attempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    return res.status(429).json({
      message: "Too many authentication attempts. Please wait a few minutes and try again.",
    });
  }

  req.rateLimitKey = key;
  req.rateLimitBucket = bucket;
  authAttemptStore.set(key, bucket);
  return next();
}

function recordFailedAttempt(req) {
  if (!req.rateLimitBucket || !req.rateLimitKey) {
    return;
  }

  req.rateLimitBucket.attempts.push(Date.now());
  authAttemptStore.set(req.rateLimitKey, req.rateLimitBucket);
}

function clearFailedAttempts(req) {
  if (!req.rateLimitKey) {
    return;
  }

  authAttemptStore.delete(req.rateLimitKey);
}

function validateRegistrationInput(body) {
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (name.length < 2) {
    return "Name must be at least 2 characters long.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return null;
}

async function requireAuth(req, res, next) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);

    if (!user || (user.tokenVersion || 0) !== payload.tokenVersion) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveAthletesLimit(value) {
  const parsedLimit = parseNumber(value);
  const candidate = Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : 25;
  return Math.min(Math.max(candidate, 1), 100);
}

function resolveAthletesPage(value) {
  const parsedPage = parseNumber(value);
  const candidate = Number.isFinite(parsedPage) ? Math.trunc(parsedPage) : 1;
  return Math.min(Math.max(candidate, 1), 10000);
}

function normalizeSearchTerm(value) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAthleteQuery(query) {
  const filters = {};
  const search = normalizeSearchTerm(query.search || "");
  const sport = query.sport || "";
  const medal = query.medal || "";
  const year = parseNumber(query.year);
  const country = query.country || "";

  if (search) {
    filters.$text = { $search: search };
  }

  if (sport) {
    filters.sport = sport;
  }

  if (medal) {
    filters.medal = medal;
  }

  if (year) {
    filters.year = year;
  }

  if (country) {
    filters.region = country;
  }

  return filters;
}

app.post("/auth/register", authRateLimiter, async (req, res) => {
  try {
    const validationMessage = validateRegistrationInput(req.body);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      recordFailedAttempt(req);
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: await createPasswordHash(password),
    });

    clearFailedAttempts(req);
    setAuthCookie(res, issueAuthToken(user));

    return res.status(201).json({
      message: "Account created successfully.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error(error);
    if (error && error.code === 11000) {
      recordFailedAttempt(req);
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    return res.status(500).json({ message: "Unable to create account right now." });
  }
});

app.post("/auth/login", authRateLimiter, async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      recordFailedAttempt(req);
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    clearFailedAttempts(req);
    setAuthCookie(res, issueAuthToken(user));

    return res.json({
      message: "Login successful.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to log in right now." });
  }
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    clearAuthCookie(res);

    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to log out right now." });
  }
});

app.post("/auth/change-password", requireAuth, authRateLimiter, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || "";
    const newPassword = req.body.newPassword || "";

    if (!(await verifyPassword(currentPassword, req.user.passwordHash))) {
      recordFailedAttempt(req);
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const validationMessage = validateRegistrationInput({
      name: req.user.name,
      email: req.user.email,
      password: newPassword,
    });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    req.user.passwordHash = await createPasswordHash(newPassword);
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    clearFailedAttempts(req);
    clearAuthCookie(res);

    return res.json({
      message: "Password updated successfully. Please log in again.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to change password right now." });
  }
});

app.get("/summary", requireAuth, async (req, res) => {
  try {
    const summary = await Summary.findOne({ key: "olympics-dashboard" }).lean();

    if (!summary) {
      return res.status(404).json({
        message: "Olympics summary is missing. Run the MongoDB import script first.",
      });
    }

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error building Olympics summary" });
  }
});

app.get("/athletes", requireAuth, async (req, res) => {
  try {
    const limit = resolveAthletesLimit(req.query.limit);
    const page = resolveAthletesPage(req.query.page);
    const skip = (page - 1) * limit;
    const filters = buildAthleteQuery(req.query);
    const useTextScore = Boolean(filters.$text);
    const projection = useTextScore
      ? { __v: 0, score: { $meta: "textScore" } }
      : { __v: 0 };
    const sort = useTextScore
      ? { score: { $meta: "textScore" }, year: -1, name: 1 }
      : { year: -1, name: 1 };

    const [total, records] = await Promise.all([
      Athlete.countDocuments(filters),
      Athlete.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(projection)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({ total, page, limit, totalPages, records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error reading athlete data" });
  }
});

app.get("/regions", requireAuth, async (req, res) => {
  try {
    const records = await Region.find({}).sort({ region: 1 }).select("-__v").lean();
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error reading regions data" });
  }
});

app.get("/analytics/medal-trends", requireAuth, async (req, res) => {
  try {
    const trends = await Athlete.aggregate([
      {
        $group: {
          _id: { year: "$year", medal: "$medal" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.medal": 1 },
      },
    ]);

    const formatted = {};
    trends.forEach((item) => {
      if (!formatted[item._id.year]) {
        formatted[item._id.year] = {};
      }
      formatted[item._id.year][item._id.medal] = item.count;
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching medal trends" });
  }
});

app.get("/analytics/gender-distribution", requireAuth, async (req, res) => {
  try {
    const distribution = await Athlete.aggregate([
      {
        $group: {
          _id: "$sex",
          count: { $sum: 1 },
        },
      },
    ]);

    const formatted = distribution.reduce((acc, item) => {
      acc[item._id || "Unknown"] = item.count;
      return acc;
    }, {});

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching gender distribution" });
  }
});

app.get("/analytics/events-by-season", requireAuth, async (req, res) => {
  try {
    const seasons = await Athlete.aggregate([
      {
        $group: {
          _id: { year: "$year", season: "$season" },
          eventCount: { $sum: 1 },
          uniqueAthletes: { $addToSet: "$athleteId" },
        },
      },
      {
        $project: {
          _id: 1,
          eventCount: 1,
          athleteCount: { $size: "$uniqueAthletes" },
        },
      },
      {
        $sort: { "_id.year": 1 },
      },
    ]);

    res.json(seasons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching events by season" });
  }
});

app.get("/analytics/athlete-participation", requireAuth, async (req, res) => {
  try {
    const participation = await Athlete.aggregate([
      {
        $group: {
          _id: "$year",
          totalRecords: { $sum: 1 },
          uniqueAthletes: { $addToSet: "$athleteId" },
          countries: { $addToSet: "$region" },
        },
      },
      {
        $project: {
          _id: 1,
          totalRecords: 1,
          athleteCount: { $size: "$uniqueAthletes" },
          countryCount: { $size: "$countries" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json(participation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching participation data" });
  }
});

app.get("/analytics/top-sports-by-year", requireAuth, async (req, res) => {
  try {
    const sports = await Athlete.aggregate([
      {
        $group: {
          _id: { year: "$year", sport: "$sport" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, count: -1 },
      },
      {
        $group: {
          _id: "$_id.year",
          sports: {
            $push: {
              name: "$_id.sport",
              value: "$count",
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json(sports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching sports data" });
  }
});

app.get("/analytics/medal-leaders", requireAuth, async (req, res) => {
  try {
    const leaders = await Athlete.aggregate([
      {
        $match: { medal: { $ne: "None" } },
      },
      {
        $group: {
          _id: "$region",
          gold: {
            $sum: {
              $cond: [{ $eq: ["$medal", "Gold"] }, 1, 0],
            },
          },
          silver: {
            $sum: {
              $cond: [{ $eq: ["$medal", "Silver"] }, 1, 0],
            },
          },
          bronze: {
            $sum: {
              $cond: [{ $eq: ["$medal", "Bronze"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          country: "$_id",
          _id: 0,
          gold: 1,
          silver: 1,
          bronze: 1,
          total: { $add: ["$gold", "$silver", "$bronze"] },
        },
      },
      {
        $sort: { total: -1 },
      },
      {
        $limit: 15,
      },
    ]);

    res.json(leaders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching medal leaders" });
  }
});

app.get("/analytics/event-distribution", requireAuth, async (req, res) => {
  try {
    const distribution = await Athlete.aggregate([
      {
        $group: {
          _id: "$event",
          count: { $sum: 1 },
          medals: {
            $push: "$medal",
          },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 20,
      },
    ]);

    const formatted = distribution.map((item) => ({
      name: item._id,
      value: item.count,
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching event distribution" });
  }
});

app.get("/health", async (req, res) => {
  const readyStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const databaseState = readyStates[mongoose.connection.readyState] || "unknown";

  res.json({
    ok: databaseState === "connected",
    database: databaseState,
    service: "olympics-api",
  });
});

app.get("/", (req, res) => {
  res.send("Olympics API running with MongoDB");
});

async function startServer() {
  try {
    if (!TOKEN_SECRET) {
      throw new Error("AUTH_TOKEN_SECRET is required.");
    }

    await connectToDatabase();
    console.log("MongoDB connected.");

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  createPasswordHash,
  verifyPassword,
  parseNumber,
  resolveAthletesLimit,
  resolveAthletesPage,
  normalizeSearchTerm,
  buildAthleteQuery,
  getRateLimitKey,
  cleanupRateLimitBucket,
};
