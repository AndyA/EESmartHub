"use strict";

const _ = require("lodash");
const moment = require("moment");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function quantise(m, q, offset = 0) {
  return moment.utc(q * (Math.floor(moment.utc(m).valueOf() / q) + offset));
}

class DB {
  constructor(db) {
    this.db = db;
  }

  async getDoc(id) {
    try {
      const doc = await this.db.get(id);
      return doc;
    } catch (e) {
      if (e.error !== "not_found") throw e;
    }
  }

  async stashSample(time, network) {
    const mkid = m => m.format("YYYYMMDD-HH");
    const id = mkid(quantise(time, HOUR));
    const curDoc = await this.getDoc(id);
    const prevDoc =
      curDoc || (await this.getDoc(mkid(quantise(time, HOUR, -1))));

    const doc = curDoc || {
      _id: id,
      kind: "stats",
      stats: {},
      span: HOUR,
      quantum: MINUTE,
      network
    };

    for (let { mac, rate } of network.devices) {
      if (!rate) continue;
      rate = rate.map(r => _.omit(r, "mac"));
      const slot = (doc.stats[mac] = doc.stats[mac] || []);
      const prev = _.last(prevDoc && prevDoc.stats && prevDoc.stats[mac]);
      if (prev && prev.rate) {
        const dt = time.diff(moment.utc(prev.time), "seconds");
        for (const r of rate) {
          const pr = prev.rate.find(
            pr => pr.timestamp === r.timestamp && pr.app === r.app
          );
          if (pr) {
            r.tx_rate = (r.tx - pr.tx) / dt;
            r.rx_rate = (r.rx - pr.rx) / dt;
          }
        }
      }

      slot.push({ time: time.format(), rate });
    }

    const res = await this.db.insert(doc);
  }
}

module.exports = DB;
