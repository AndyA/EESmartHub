require("../lib/use");

const config = require("config");
const os = require("os");
const client = require("prom-client");
const express = require("express");
require("express-async-errors");

const { SmartHubCache } = require("ee/smarthub");

const app = express();

const prefix = "smarthub_";
const port = config.get("port");

const { register } = client;
client.collectDefaultMetrics();
register.setDefaultLabels({ host: os.hostname });

const sh = new SmartHubCache(config.get("router"), 10000);

new client.Gauge({
  name: `${prefix}bandwidth`,
  help: "SmartHub bandwidth by MAC",
  labelNames: ["ident", "mac", "app", "direction"],
  async collect() {
    const stats = await sh.getStats();
    for (const rec of stats.rate) {
      const { ident, mac, app, rx, tx } = rec;
      this.labels(ident, mac, app, "rx").set(rx);
      this.labels(ident, mac, app, "tx").set(tx);
    }
  }
});

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.get("/metrics/:metric", async (req, res) => {
  const { metric } = req.params;
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.getSingleMetricAsString(metric));
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.get("/status", (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Smarthub Exporter at http://localhost:${port}`);
});
