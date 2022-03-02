const dns = require("dns");
const _ = require("lodash");
const { lazyAttr } = require("../../tools/lazy-attr");

async function ip2hostname(ip) {
  try {
    return await dns.promises.reverse(ip);
  } catch (e) {
    if (e.code !== "ENOTFOUND") throw e;
    return [];
  }
}

function groupMulti(recs, iteratee) {
  const idx = {};
  const getter = _.iteratee(iteratee);
  for (const rec of recs)
    for (const val of _.castArray(getter(rec) || []))
      (idx[val] = idx[val] || []).push(rec);
  return idx;
}

const Index = lazyAttr(
  class {
    constructor(trove) {
      this.trove = trove;
    }

    findByMac(mac) {
      return _.first(this.byMac[mac] || []);
    }
  },
  {
    byMac: function () {
      return groupMulti(this.trove, "mac");
    },

    byIP: function () {
      return groupMulti(this.trove, "ip");
    },

    byIPv6: function () {
      return groupMulti(this.trove, "ipv6");
    }
  }
);

class KDL extends Index {}
class ARP extends Index {
  constructor(arp) {
    super(arp.map(([ip, mac, app, port]) => ({ ip, mac, app, port })));
  }
}

const RateInfo = lazyAttr(
  class RateInfo {
    constructor(rec, model) {
      Object.assign(this, rec, { model });
    }

    async getIdent() {
      // Try to resolve hostname(s)
      const hostnames = _(await Promise.all(this.ip.map(ip2hostname)))
        .flatten()
        .uniq()
        .value();

      if (hostnames.length) return hostnames.join("/");

      // Default to SmartHub data
      return (
        this.device?.hostname ||
        this.device?.name ||
        [...this.ip, this.mac].join("/")
      );
    }
  },
  {
    ip: function () {
      return _(this.arp?.ip || this.device?.ip || [])
        .castArray()
        .uniq()
        .value();
    },

    device: function () {
      return this.model.kdl.findByMac(this.mac);
    },

    arp: function () {
      return this.model.arp.findByMac(this.mac);
    }
  }
);

const SmartHubModel = lazyAttr(
  class {
    constructor({ network, config }) {
      this.network = network;
      this.config = config;
    }
  },
  {
    kdl: function () {
      return new KDL(this.network.known_device_list || []);
    },

    arp: function () {
      return new ARP(this.network.arp_entry || []);
    },

    rate: function () {
      return (this.network.rate || []).map(rec => new RateInfo(rec, this));
    }
  }
);

module.exports = { SmartHubModel };
