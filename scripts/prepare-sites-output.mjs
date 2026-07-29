import { cp, mkdir, rm } from "node:fs/promises";

const vinextOutput = new URL("../apps/web/dist/", import.meta.url);
const sitesOutput = new URL("../dist/", import.meta.url);
const hostingConfig = new URL("../.openai/hosting.json", import.meta.url);
const packagedHostingDirectory = new URL(".openai/", sitesOutput);
const packagedHostingConfig = new URL("hosting.json", packagedHostingDirectory);

await rm(sitesOutput, { recursive: true, force: true });
await cp(vinextOutput, sitesOutput, { recursive: true });
await mkdir(packagedHostingDirectory, { recursive: true });
await cp(hostingConfig, packagedHostingConfig);
