import * as Sentry from "@sentry/node";
import process from "process";
import { hideBin } from "yargs/helpers";

import { main } from ".";
import * as pkj from "../package.json";

Sentry.init({
  release: `${pkj.name}@${pkj.version}`,
  initialScope: {
    tags: { Wrangler2: pkj.version },
  },
  dsn: "https://16a2bd8e7c3a42e8bc3bcc8277d179f4@sentry10.cfdata.org/354",
  tracesSampleRate: 1.0,
  integrations: [new Sentry.Integrations.Http({ tracing: true })],
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  const transaction = Sentry.startTransaction({
    name: "uncaughtExceptionMonitor",
    op: origin,
  });
  Sentry.captureException(err);
  transaction.finish();
});

main(hideBin(process.argv)).catch(() => {
  // The logging of any error that was thrown from `main()` is handled in the `yargs.fail()` handler.
  // Here we just want to ensure that the process exits with a non-zero code.
  // We don't want to do this inside the `main()` function, since that would kill the process when running our tests.
  process.exit(1);
});
