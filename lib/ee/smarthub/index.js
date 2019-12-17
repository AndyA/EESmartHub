"use strict";

const fetch = require("cross-fetch");
const _ = require("lodash");
const vm = require("vm");

const safeList = list => (list || []).filter(Boolean);
const byMAC = list => _.keyBy(safeList(list), "mac");

class Network {
  constructor(network) {
    Object.assign(
      this,
      _.cloneDeepWith(network, (val, key) => {
        if (_.isString(val)) {
          // Convert all mac addresses to lowercase
          if (key === "mac") return val.toLowerCase();
          if (val.length && !isNaN(val)) return Number(val);
        }
      })
    );
    Object.freeze(this.network);
    Object.freeze(this.config);
  }

  get devices() {
    const getDevices = () => {
      const rateByMAC = _.groupBy(safeList(this.network.rate), "mac");
      return safeList(this.network.known_device_list).map(d =>
        Object.assign({}, d, { rate: rateByMAC[d.mac] })
      );
    };

    return (this._devices = this._devices || getDevices());
  }

  get indexByMAC() {
    return (this._indexByMAC = this._indexByMAC || byMAC(this.devices));
  }

  get uptime() {
    return Number(this.network.sys_up_time);
  }

  toJSON() {
    return _.pick(this, "network", "config");
  }
}

class SmartHub {
  constructor(uri) {
    this.uri = uri.replace(/\/$/, "");
  }

  async fetch(path) {
    const res = await fetch(this.uri + path);
    return res.text();
  }

  decodeData(obj) {
    return _.cloneDeepWith(obj, v => {
      if (_.isString(v)) return decodeURIComponent(v);
    });
  }

  async getMyNetwork() {
    const cgi = await this.fetch("/cgi/cgi_myNetwork.js");
    const config = {};
    const network = {
      addCfg: (key, iv, sv) => (config[key] = { iv, sv })
    };
    vm.createContext(network);
    vm.runInContext(cgi, network);
    delete network.addCfg;
    return new Network(this.decodeData({ config, network }));
  }
}

module.exports = { SmartHub, Network };
