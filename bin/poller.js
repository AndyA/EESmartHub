"use strict";

require("../lib/use");

const config = require("config");
const { SmartHub } = require("ee/smarthub");
const Promise = require("bluebird");
const mkdirp = Promise.promisify(require("mkdirp"));
const path = require("path");
const writeFileAtomic = Promise.promisify(require("write-file-atomic"));
const moment = require("moment");

async function saveJSON(file, data) {
  const dir = path.dirname(file);
  await mkdirp(dir);
  await writeFileAtomic(file, JSON.stringify(data, null, 2));
}

async function pollSmartHub(sh, outFile) {
  const network = await sh.getMyNetwork();
  console.log(`Saving ${outFile}`);
  await saveJSON(outFile, network);
}

async function poller(sh, interval, outDir) {
  while (true) {
    const now = new Date().getTime();
    const next = Math.floor((now + interval - 1) / interval) * interval;
    await Promise.delay(next - now);
    const name = moment.utc(next).format() + ".json";
    await pollSmartHub(sh, path.join(outDir, name));
  }
}

(async () => {
  try {
    const sh = new SmartHub(config.router);
    await poller(sh, config.interval, path.join(config.state, "network"));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

// curl 'http://192.168.1.1/cgi/cgi_myNetwork.js'
