import {
  createDefaultSetupDeps,
  runMachineSetup,
} from "../setup/machineSetup";

const usage = `Prepare this machine so an agent can produce videos without a UI.

Usage:
  npm run setup
  npm run setup -- --check-only

Copies missing .env.local from the example (never overwrites an existing file).
Installs Node/FFmpeg via Homebrew and the Dreamina CLI when it is safe to do so.
Prints JSON for the agent. Never prints API keys.

This does not replace make check.
`;

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage.trim());
    return;
  }

  const report = await runMachineSetup(
    createDefaultSetupDeps({
      applyFixes: !args.includes("--check-only"),
    }),
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.status === "failed") {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
