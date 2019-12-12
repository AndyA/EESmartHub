"use strict";

const { Observable, asyncScheduler } = require("rxjs");

function cron(period, scheduler = asyncScheduler) {
  if (period <= 0) throw new RangeError("period must be positive");

  return new Observable(subscriber => {
    const schedule = () => {
      const now = scheduler.now();
      const next = Math.floor((now + period - 1) / period) * period;
      scheduler.schedule(despatch, next - now, next);
    };

    const despatch = now => {
      subscriber.next(now);
      schedule();
    };

    schedule();
    return subscriber;
  });
}

module.exports = { cron };
