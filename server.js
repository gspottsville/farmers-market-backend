const express = require("express");
const fetch = require("node-fetch");
const app = express();

const USDA_BASE = "https://search.ams.usda.gov/farmersmarkets/v1/data.svc";
const PORT = process.env.PORT || 3000;

// distance in miles
function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

app.get("/api/markets", async (req, res) => {
  const { zip, lat, lng, radius = 25 } = req.query;
  if (!zip || !lat || !lng) return res.json([]);

  try {
    const listRes = await fetch(`${USDA_BASE}/zipSearch?zip=${zip}`);
    const listData = await listRes.json();

    const markets = [];

    for (const m of listData.results) {
      const dRes = await fetch(`${USDA_BASE}/mktDetail?id=${m.id}`);
      const dData = await dRes.json();
      const d = dData.marketdetails;

      if (!d.Latitude || !d.Longitude) continue;

      const dist = distanceMiles(
        Number(lat),
        Number(lng),
        Number(d.Latitude),
        Number(d.Longitude)
      );

      if (dist <= radius) {
        markets.push({
          name: m.marketname.replace(/^\d+(\.\d+)?\s*/, ""),
          address: d.Address,
          city: d.City,
          state: d.State,
          hours: d.Schedule,
          lat: d.Latitude,
          lng: d.Longitude,
          distance: dist.toFixed(1)
        });
      }
    }

    res.json(markets.sort((a, b) => a.distance - b.distance));
  } catch (e) {
    res.status(500).json({ error: "USDA error" });
  }
});

app.listen(PORT, () => {
  console.log("Server running");
});
