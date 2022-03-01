require("../lib/use");

const config = require("config");
const _ = require("lodash");
const lifter = require("jsonpath-lifter");

const { SmartHub } = require("ee/smarthub");

const decode = v => (v && typeof v === "string" ? decodeURIComponent(v) : v);
const cleanArray = v => (Array.isArray(v) ? v.filter(Boolean) : v);
const numify = v => (String(v).length && !isNaN(v) ? Number(v) : v);
const lowerCase = s => String(s).toLowerCase();
const splitList = v =>
  _(v.split(/[,;]/))
    .map(lowerCase)
    .filter(s => s !== "")
    .uniq()
    .value();

const lift = lifter.pipe(
  lifter({ src: "$..*", via: decode }),
  lifter({ src: "$..*", via: cleanArray }),
  lifter(
    { src: "$..*" },
    {
      src: "$.network.known_device_list[*]",
      via: [
        { src: "$.*" },
        {
          src: [
            "$.mac",
            "$.ip",
            "$.ipv6",
            "$.port",
            "$.ipv6_ll",
            "$.activity_ip",
            "$.activity_ipv6_ll",
            "$.activity_ipv6"
          ],
          via: splitList
        }
      ]
    }
  ),
  lifter({ src: "$..*", via: numify })
);

async function main() {
  const sh = new SmartHub(config.get("router"));
  const stats = await sh.getRawStats();
  const clean = lift(stats);
  // const clean = stats;
  console.log(JSON.stringify(clean, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
