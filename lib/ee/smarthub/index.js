"use strict";

const fetch = require("cross-fetch");
const _ = require("lodash");
const vm = require("vm");

class Network {
  constructor(network) {
    Object.assign(this, network);
  }

  get devices() {
    const safeList = list => (list || []).filter(Boolean);
    const byMAC = list => _.keyBy(safeList(list), d => d.mac.toLowerCase());

    const getDevices = () => {
      const devByMAC = byMAC(this.network.known_device_list);
      const rateByMAC = byMAC(this.network.rate);
      const devices = safeList(this.network.known_device_list).map(d =>
        Object.assign({}, d, { rate: rateByMAC[d.mac.toLowerCase()] })
      );
      return devices;
    };

    return (this._devices = this._devices || getDevices());
  }
}

class SmartHub {
  constructor(uri) {
    this.uri = uri;
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
    return new Network(this.decodeData({ config, network }));
  }
}

module.exports = { SmartHub, Network };
