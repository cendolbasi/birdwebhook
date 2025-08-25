import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// pakai environment variable untuk AccessKey biar aman
const ACCESS_KEY = process.env.BIRD_ACCESS_KEY;

app.get("/", (req, res) => {
  res.send("✅ Bird Proxy is running!");
});

// endpoint untuk ambil media
app.get("/get-media", async (req, res) => {
  try {
    const { workspaceId, messageId, fileId } = req.query;

    if (!workspaceId || !messageId || !fileId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const url = `https://api.bird.com/workspaces/${workspaceId}/messages/${messageId}/media/${fileId}?redirect=false`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `AccessKey ${ACCESS_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
