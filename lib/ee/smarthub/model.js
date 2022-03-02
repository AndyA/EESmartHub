const _ = require("lodash");
const { lazyAttr } = require("tools/lazy-attr");

function groupMulti(recs, key) {
  const idx = {};
  for (const rec of recs)
    for (const val of _.castArray(rec[key] || []))
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
    constructor(rec) {
      Object.assign(this, rec);
    }
  },
  {
    ip: function () {
      return _.castArray(this.device?.ip || this.arp?.ip || []);
    },

    ident: function () {
      if (this.device) return this.device.hostname || this.device.name;
      return [...this.ip, this.mac].join("/");
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
      return (this.network.rate || []).map(
        rec =>
          new RateInfo({
            ...rec,
            device: this.kdl.findByMac(rec.mac),
            arp: this.arp.findByMac(rec.mac)
          })
      );
    }
  }
);

module.exports = { SmartHubModel };
