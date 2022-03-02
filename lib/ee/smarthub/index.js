const vm = require("vm");
const _ = require("lodash");
const fetch = require("cross-fetch");
const lifter = require("jsonpath-lifter");

const { SmartHubModel } = require("./model");

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const decode = v => (v && typeof v === "string" ? decodeURIComponent(v) : v);
const cleanArray = v => (Array.isArray(v) ? v.filter(vv => !_.isNil(vv)) : v);
const numify = v => (String(v).length && !isNaN(v) ? Number(v) : v);
const lowerCase = s => String(s).toLowerCase();
const splitList = v =>
  _(v.split(/[,;]/))
    .map(lowerCase)
    .filter(s => s !== "")
    .uniq()
    .value();

const kdlExpand = [
  ["$.mac", "$.ip", "$.ipv6", "$.port", "$.ipv6_ll"],
  ["$.activity_ip", "$.activity_ipv6_ll", "$.activity_ipv6"]
];

const lift = lifter.pipe(
  lifter({ src: "$..*", via: decode, leaf: true }),
  lifter({ src: "$..*", via: cleanArray }),
  lifter(
    { src: "$..*" },
    {
      src: "$.network.known_device_list[*]",
      via: [{ src: "$.*" }, { src: kdlExpand.flat(), via: splitList }]
    },
    {
      src: "$.network.known_device_list",
      via: kdl => kdl.sort((a, b) => cmp(b.time_first_seen, a.time_first_seen))
    },
    { src: "$.network.arp_entry[*][1]", via: lowerCase }
  ),
  lifter({ src: "$..*", via: numify, leaf: true })
);

class SmartHub {
  constructor(uri) {
    this.uri = uri.replace(/\/$/, "");
  }

  async fetch(path) {
    const res = await fetch(this.uri + path);
    return res.text();
  }

  async getRawStats() {
    const data = await this.fetch("/cgi/cgi_myNetwork.js");
    const config = {};
    const network = {
      addCfg: (key, iv, sv) => {
        if (sv.length) config[key] = sv;
      }
    };
    vm.createContext(network);
    vm.runInContext(data, network);
    delete network.addCfg;
    return { config, network };
  }

  async getStats() {
    return new SmartHubModel(lift(await this.getRawStats()));
  }
}

class SmartHubCache extends SmartHub {
  constructor(uri, ttl = 10000) {
    super(uri);
    this.ttl = ttl;
    this._cache = null;
  }

  async getStats() {
    const { _cache } = this;
    const now = new Date().getTime();
    if (_cache && _cache.expires > now) return _cache.stats;
    const stats = await super.getStats();
    this._cache = { expires: now + this.ttl, stats };
    return stats;
  }
}

module.exports = { SmartHub, SmartHubCache };
