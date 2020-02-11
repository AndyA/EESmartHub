"use strict";

require("../lib/use");

const config = require("config");
const { SmartHub } = require("ee/smarthub");
const DB = require("db/smarthub");
const Promise = require("bluebird");
const nano = require("nano");
const moment = require("moment");
const { BehaviorSubject } = require("rxjs");
const { mergeMap, multicast, refCount, filter } = require("rxjs/operators");
const { cron } = require("rxx");

try {
  const db = new DB(nano(config.db.url));
  const sh = new SmartHub(config.router);

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
} catch (e) {
  console.error(e);
  process.exit(1);
}
