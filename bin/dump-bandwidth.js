"use strict";

require("../lib/use");
const config = require("config");
const { Network } = require("ee/smarthub");
const Promise = require("bluebird");
const path = require("path");
const fs = Promise.promisifyAll(require("fs"));
const moment = require("moment");
const _ = require("lodash");
//const { BehaviorSubject } = require("rxjs");
//const { mergeMap, multicast, refCount, filter } = require("rxjs/operators");
//const { cron } = require("rxx");

async function loadJSON(file) {
  return JSON.parse(await fs.readFileAsync(file, "utf8"));
}

async function timeSeries(samples) {
  const inventory = {};
  const series = [];

  let prev;
  for (const { file, ts } of samples) {
    console.error(ts);
    const network = new Network(await loadJSON(file));
    const hosts = network.indexByMAC;
    if (prev && prev.network.uptime < network.uptime) {
      const dt = ts.diff(prev.ts, "seconds");
      const stats = {};
      for (const [mac, info] of Object.entries(hosts)) {
        const prevInfo = prev.network.indexByMAC[mac];
        if (!prevInfo || !prevInfo.rate || !info.rate) continue;
        stats[mac] = {
          rx: (info.rate[0].rx - prevInfo.rate[0].rx) / dt,
          tx: (info.rate[0].tx - prevInfo.rate[0].tx) / dt
        };
      }
      series.push({ ts, stats });
    }
    prev = { file, ts, network };
    _.merge(inventory, hosts);
  }
  return { inventory, series };
}

function mergeSeries(series, quantum = "hour") {
  const qt = ts => moment.utc(ts).startOf(quantum);
  return Object.entries(
    _.groupBy(
      series.map(({ ts, stats }) => ({ ts, stats, qts: qt(ts) })),
      ({ qts }) => qts.format()
    )
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(s => s[1])
    .map(s => {
      const count = s.length;
      return _.cloneDeepWith(
        _.mergeWith({}, ...s, (obj, src) => {
          if (_.isNumber(obj) && _.isNumber(src)) return obj + src;
        }),
        v => {
          if (_.isNumber(v)) return v / count;
        }
      );
    })
    .map(({ qts, stats }) => ({ ts: qts, stats }));
}

function report({ inventory, series }, channel = "rx") {
  const getName = info => info.name || info.hostname || info.ip || info.mac;
  // B/s -> Mb/s
  const scale = bs => (bs * 8) / 1024 / 1024;

  const rows = [];
  const cols = Object.values(inventory)
    .map(info => ({ ...info, tag: getName(info) }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
  // Header rows
  rows.push(["", ...cols.map(info => info.tag)]);
  rows.push(["", ...cols.map(info => info.ip || info.mac)]);

  for (const { ts, stats } of series) {
    rows.push([
      ts.format(),
      ...cols
        .map(c => c.mac)
        .map(mac => (stats[mac] && scale(stats[mac][channel])) || "")
    ]);
  }

  return rows;
}

(async () => {
  try {
    const dataDir = path.join(config.state, "network");
    const samples = (await fs.readdirAsync(dataDir))
      .filter(n => /\.json$/.test(n))
      .sort()
      .map(name => ({
        file: path.join(dataDir, name),
        ts: moment.utc(name.replace(/\.json$/, ""))
      }));

    const ts = await timeSeries(samples);
    ts.series = mergeSeries(ts.series, "hour");
    const rows = report(ts);
    for (const row of rows) {
      console.log(row.join(","));
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
