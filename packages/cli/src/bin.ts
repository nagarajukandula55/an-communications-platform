#!/usr/bin/env node
import { runCli, UsageError } from './cli.js';
import { FileSessionStore } from './session-store.js';

runCli(process.argv.slice(2), { store: new FileSessionStore() })
  .then((result) => {
    // eslint-disable-next-line no-console -- this is the CLI's actual output
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    if (error instanceof UsageError) {
      console.error(error.message);
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  });
