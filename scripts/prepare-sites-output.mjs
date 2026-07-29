import { cp, rm } from "node:fs/promises";

const exportedSite = new URL("../apps/web/out/", import.meta.url);
const sitesOutput = new URL("../dist/", import.meta.url);

await rm(sitesOutput, { recursive: true, force: true });
await cp(exportedSite, sitesOutput, { recursive: true });
