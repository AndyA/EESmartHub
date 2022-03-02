const config = require("config");

const { SmartHubCache } = require("../lib/ee/smarthub");

const router = config.get("router");
const sh = new SmartHubCache(`http://${router}`, 1000);

async function main() {
  const stats = await sh.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
