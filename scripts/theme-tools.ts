import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const source =
  "https://raw.githubusercontent.com/eugenebokhan/proof-theme/a6a134d88ea0ff7a34dc42f10073ed4e87f762dc/scripts/";
const [mode, ...args] = Bun.argv.slice(2);
if (!["build", "check", "preview"].includes(mode)) {
  throw new Error(
    "Usage: theme-tools.ts build | check | preview /path/to/chromium",
  );
}

const entry = mode === "preview" ? "preview.ts" : "build.ts";
const directory = await mkdtemp(join(tmpdir(), "theme-tools-"));
try {
  await Promise.all(
    ["theme-source.ts", entry].map(async (name) => {
      const response = await fetch(source + name, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(
          "Could not download " + name + ": HTTP " + response.status,
        );
      await Bun.write(join(directory, name), await response.arrayBuffer());
    }),
  );
  process.exitCode = await Bun.spawn(
    [
      process.execPath,
      join(directory, entry),
      ...(mode === "check" ? ["--check"] : args),
    ],
    { stdout: "inherit", stderr: "inherit" },
  ).exited;
} finally {
  await rm(directory, { recursive: true, force: true });
}
