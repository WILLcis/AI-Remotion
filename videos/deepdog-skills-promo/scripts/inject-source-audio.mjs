import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectDir = resolve(new URL("..", import.meta.url).pathname);
const indexPath = resolve(projectDir, "index.html");
const marker = "      <!-- captions -->";
const audioId = 'id="el-source-narration"';
const audio = [
  "      <!-- approved source narration: one continuous track -->",
  "      <audio",
  '        id="el-source-narration"',
  '        src="audio/narration.mp3"',
  '        data-start="0"',
  '        data-duration="51.984"',
  '        data-track-index="10"',
  '        data-volume="1"',
  "      ></audio>",
  "",
].join("\n");

const html = readFileSync(indexPath, "utf8");
if (html.includes(audioId)) {
  console.log("source narration already injected");
  process.exit(0);
}
if (!html.includes(marker)) {
  throw new Error("caption marker not found in assembled index");
}

writeFileSync(indexPath, html.replace(marker, `${audio}${marker}`));
console.log("injected continuous source narration");
