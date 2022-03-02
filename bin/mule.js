const config = require("config");

const { SmartHubCache } = require("../lib/ee/smarthub");

const router = config.get("router");
const sh = new SmartHubCache(`http://${router}`, 1000);

async function main() {
  const stats = await sh.getStats();
  for (const stat of stats.rate) {
    const name = await stat.getIdent();
    console.log(`${stat.mac} ${stat.ip.join(", ")} ${name}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
