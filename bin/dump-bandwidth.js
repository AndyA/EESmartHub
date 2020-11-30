"use strict";

require("../lib/use");

const _ = require("lodash");
const config = require("config");
const nano = require("nano");
const printf = require("printf");

const invertIndex = index => {
  const out = {};
  for (const [k0, i1] of Object.entries(index))
    for (const [k1, info] of Object.entries(i1))
      (out[k1] = out[k1] || {})[k0] = info;
  return out;
};

const makeIndex = stats => ({
  stats: stats.stats,
  known: _(stats.network.network.known_device_list)
    .filter(Boolean)
    .flatMap(dev => dev.mac.split(/,/).map(mac => ({ ...dev, mac })))
    .groupBy("mac")
    .value(),
  rate: _(stats.network.network.rate).filter(Boolean).groupBy("mac").value(),
  arp: _(stats.network.network.arp_entry)
    .filter(Boolean)
    .map(([ip, mac, idx, nif]) => ({
      ip,
      mac: mac.toLowerCase(),
      idx,
      nif
    }))
    .groupBy("mac")
    .value()
});

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function analyse(stats) {
  const index = makeIndex(stats);
  const macs = _(index)
    .mapValues(Object.keys)
    .values()
    .flatten()
    .uniq()
    .sort()
    .value();

  const rep = [];
  for (const mac of macs) {
    const found = Object.entries(index)
      .flatMap(([kind, idx]) => (idx[mac] ? [kind] : []))
      .join(", ");
    const info = _.head(index.known[mac] || [{}]);
    const hostname = info.hostname || info.ip || "unknown";
    rep.push({ mac, hostname, found });
  }
  rep.sort(
    (a, b) =>
      cmp(a.hostname.toLowerCase(), b.hostname.toLowerCase()) ||
      cmp(a.mac || b.mac)
  );
  for (const { mac, hostname, found } of rep)
    console.log(printf("%s %-30s %s", mac, hostname, found));
}

function report(stats) {
  const index = invertIndex(makeIndex(stats));
  console.log(index);
}

(async () => {
  try {
    const db = nano(config.db.url);
    const stats = await db.get("20201130-14");
    report(stats);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
