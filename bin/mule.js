require("../lib/use");

const config = require("config");
const { SmartHubCache } = require("ee/smarthub");

async function main() {
  const sh = new SmartHubCache(config.get("router"), 10000);
  const stats = await sh.getStats();
  for (const rec of stats.rate) {
    // console.log(rec);
    const info = [
      ["id", rec.ident],
      ["mac", rec.mac],
      ["app", rec.app]
    ];
    if (rec.device) {
      info.push(
        ["hostname", rec.device.hostname],
        ["name", rec.device.name],
        ["os", rec.device.os],
        ["device", rec.device.device]
      );
    }
    console.log(info.map(([k, v]) => `${k}=${v}`).join(" "));
  }
  // console.log(JSON.stringify(stats.rate, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
