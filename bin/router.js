"use strict";

require("../lib/use");

const config = require("config");
const { SmartHub } = require("ee/smarthub");

(async () => {
  try {
    const sh = new SmartHub(config.router);
    const network = await sh.getMyNetwork();
    console.log(JSON.stringify(network.devices, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

// curl 'http://192.168.1.1/cgi/cgi_myNetwork.js'
