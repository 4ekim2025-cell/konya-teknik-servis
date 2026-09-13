import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("/api/instagram-feed", async (_req, res) => {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;
    if (!token || !userId) return res.json({ data: [] });
    try {
      const fields = "id,media_type,media_url,thumbnail_url,permalink,timestamp";
      const apiUrl = new URL(`https://graph.facebook.com/v24.0/${userId}/media`);
      apiUrl.searchParams.set("fields", fields);
      apiUrl.searchParams.set("limit", "6");
      apiUrl.searchParams.set("access_token", token);
      const response = await fetch(apiUrl);
      if (!response.ok) return res.status(502).json({ data: [] });
      const payload = await response.json();
      return res.json({ data: Array.isArray(payload.data) ? payload.data.slice(0, 6) : [] });
    } catch {
      return res.status(502).json({ data: [] });
    }
  });


  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
