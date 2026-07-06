import { routeRevisionRequest } from "../agent/workflows";

const main = (): void => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printHelp();
    return;
  }

  const request = args.join(" ");
  const route = routeRevisionRequest(request);

  console.log(JSON.stringify(route, null, 2));
};

const printHelp = (): void => {
  console.log(`Route a natural-language revision to the smallest artifact set.

Usage:
  npm run episode:route -- "第 4 段不要卡片，改成时间轴"
`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
