"use strict";

require("../lib/use");
const config = require("config");
const { Network } = require("ee/smarthub");
const DB = require("db/smarthub");
const Promise = require("bluebird");
const path = require("path");
const fs = Promise.promisifyAll(require("fs"));
const moment = require("moment");
const _ = require("lodash");
const nano = require("nano");

async function loadJSON(file) {
  return JSON.parse(await fs.readFileAsync(file, "utf8"));
}

async function loadSeries(db, samples) {
  for (const { file, ts } of samples) {
    console.log(file);
    const network = new Network(await loadJSON(file));
    await db.stashSample(ts, network);
  }
}

function unique() {
  const seen = new Set();
  return n => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  };
}

(async () => {
  try {
    const db = new DB(nano(config.db.url));
    const dataDir = path.join(config.state, "network");
    const u = unique();

    while (true) {
      const samples = (await fs.readdirAsync(dataDir))
        .filter(n => /\.json$/.test(n))
        .filter(u)
        .sort()
        .map(name => ({
          file: path.join(dataDir, name),
          ts: moment.utc(name.replace(/\.json$/, ""))
        }));

      if (!samples.length) break;
      console.log(`Found ${samples.length} new samples`);

      await loadSeries(db, samples);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
