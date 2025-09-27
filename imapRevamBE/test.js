const express = require("express");
const app = express();

app.get("/", (req, res) => {
  console.log("⚡ Root route hit");
  res.send("✅ Minimal backend is working");
});

app.listen(4000, () => {
  console.log("🚀 Listening on 4000");
});
