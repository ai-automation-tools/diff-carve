// The GitHub Action's entry, run by action.yml. Hands the runner's environment to action().
import { action } from "./action.ts";

process.exitCode = await action(process.env, (s) => process.stdout.write(s));
