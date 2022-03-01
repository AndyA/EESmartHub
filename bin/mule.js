require("../lib/use");

const config = require("config");
const SmartHub = require("ee/smarthub");

async function main() {
  const sh = new SmartHub(config.get("router"));
  const stats = await sh.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
