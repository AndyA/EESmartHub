"use strict";

require("../lib/use");

const config = require("config");
const { SmartHub } = require("ee/smarthub");
const DB = require("db/smarthub");
const Promise = require("bluebird");
const mkdirp = Promise.promisify(require("mkdirp"));
const path = require("path");
const writeFileAtomic = Promise.promisify(require("write-file-atomic"));
const nano = require("nano");
const moment = require("moment");
const _ = require("lodash");
const { BehaviorSubject } = require("rxjs");
const { mergeMap, multicast, refCount, filter } = require("rxjs/operators");
const { cron } = require("rxx");

async function saveJSON(file, data) {
  console.log(`Saving ${file}`);
  const dir = path.dirname(file);
  await mkdirp(dir);
  await writeFileAtomic(file, JSON.stringify(data, null, 2));
}

try {
  const db = new DB(nano(config.db.url));
  const sh = new SmartHub(config.router);
  const outDir = path.join(config.state, "network");

  const feed$ = cron(config.interval).pipe(
    mergeMap(now => Promise.props({ now, network: sh.getMyNetwork() })),
    multicast(new BehaviorSubject()),
    refCount(),
    filter(Boolean)
  );

  feed$
    .pipe(
      mergeMap(({ now, network }) => db.stashSample(moment.utc(now), network))
    )
    .subscribe();

  feed$
    .pipe(
      mergeMap(({ now, network }) => {
        const name = moment.utc(now).format() + ".json";
        return saveJSON(path.join(outDir, name), network);
      })
    )
    .subscribe();
} catch (e) {
  console.error(e);
  process.exit(1);
}
