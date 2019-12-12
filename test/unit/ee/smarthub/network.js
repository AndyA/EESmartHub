"use strict";

const chai = require("chai");
const expect = chai.expect;

require("../../../../lib/use");

const { Network } = require("ee/smarthub");
const testData = require("../../../data/network");

describe("Network", () => {
  it("should get devices", () => {
    const nw = new Network(testData);
    expect(nw.devices.length).to.equal(4);
  });

  it("should get indexByMAC", () => {
    const nw = new Network(testData);

    expect(nw.indexByMAC["74:d4:35:4d:88:64"]).to.deep.equal({
      mac: "74:d4:35:4d:88:64",
      hostname: "",
      ip: "192.168.1.128",
      ipv6: "",
      name: "bee",
      activity: "1",
      os: "Unknown",
      device: "Server",
      time_first_seen: "2019/12/05 10:14:34",
      time_last_active: "1970/01/01 00:01:07",
      dhcp_option: "NA",
      port: "eth0_5",
      ipv6_ll: "::",
      activity_ip: "1",
      activity_ipv6_ll: "0",
      activity_ipv6: "0",
      device_oui: "NA",
      device_serial: "NA",
      device_class: "NA",
      reconnected: "0",
      rate: {
        timestamp: "0",
        app: "0",
        mac: "74:d4:35:4d:88:64",
        tx: "4804485",
        rx: "12588336"
      }
    });
  });
});
