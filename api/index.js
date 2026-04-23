const { app } = require("../backend/server");
const { connectToDatabase } = require("../backend/config/db");

function normalizePath(url = "") {
  const path = (url.split("?")[0] || "/").trim() || "/";
  if (path === "/api" || path.startsWith("/api/")) {
    return path.slice(4) || "/";
  }
  return path;
}

function isApiRequest(pathname) {
  return (
    pathname.startsWith("/auth")
    || pathname.startsWith("/summary")
    || pathname.startsWith("/athletes")
    || pathname.startsWith("/regions")
    || pathname.startsWith("/analytics")
    || pathname.startsWith("/health")
  );
}

module.exports = async (req, res) => {
  try {
    const pathname = normalizePath(req.url);
    if (isApiRequest(pathname) && !process.env.AUTH_TOKEN_SECRET) {
      return res.status(500).json({ message: "AUTH_TOKEN_SECRET is required." });
    }

    if (isApiRequest(pathname)) {
      await connectToDatabase();
    }

    return app(req, res);
  } catch (error) {
    console.error("Serverless bootstrap error:", error);
    return res.status(500).json({ message: "Failed to initialize server." });
  }
};
