import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import afs from "fs/promises";
import assert from "assert";

function fdDefaultIgnoreFile(): string {
  const ignorePaths = [
    "/nix/",
    "/System/",
    "/Library/",
    "/private/",
    "/usr/",
    path.join(os.homedir(), "Library/*"),
    path.join(os.homedir(), "!/Library/CloudStorage/"),
    path.join(os.homedir(), "**", "*.photoslibrary/"),
  ];
  return ignorePaths.join("\n");
}

export async function ensureFdIgnoreFileExists() {
  const ignoreFile = path.join(os.homedir(), ".config", "fd", "ignore");
  if (!fs.existsSync(ignoreFile)) {
    console.info(`creating missing default .fdignore file in: ${ignoreFile}`);
    // Create directories
    afs.mkdir(path.dirname(ignoreFile), { recursive: true });
    await afs.writeFile(ignoreFile, fdDefaultIgnoreFile());
  }
}

export async function runFd(
  fdPath: string,
  args: {
    searchDirs: string[];
    outputFilename: string;
    includeOnlyFiles: boolean;
    includeHidden: boolean;
    followSymlinks: boolean;
    noIgnore: boolean;
    abortController: React.RefObject<AbortController>;
  },
) {
  assert(args.searchDirs !== null);
  assert(args.searchDirs.length > 0);
  assert(fdPath !== undefined);
  assert(args.outputFilename !== undefined);

  console.log("runFd: starting with args:", args);

  let optionalArgs: string[] = [];
  if (args.includeOnlyFiles) {
    optionalArgs = [...optionalArgs, "--type", "file"];
  }
  if (args.includeHidden) {
    optionalArgs = [...optionalArgs, "--hidden"];
  }
  if (args.followSymlinks) {
    optionalArgs = [...optionalArgs, "--follow"];
  }
  if (args.noIgnore) {
    optionalArgs = [...optionalArgs, "--no-ignore"];
  }

  const out = fs.createWriteStream(args.outputFilename, { flags: "wx", signal: args.abortController.current.signal });

  const fdChild = spawn(fdPath, [...optionalArgs, "--print0", ".", ...args.searchDirs], {
    stdio: ["ignore", "pipe", "pipe"],
    signal: args.abortController.current.signal,
  });

  fdChild.stdout.pipe(out);
  let stderr = "";
  fdChild.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });

  await new Promise<void>((resolve, reject) => {
    out.on("error", (err) => {
      fdChild.kill();
      reject(err);
    });

    fdChild.on("error", (err) => {
      fs.rmSync(args.outputFilename, { force: true });
      reject(err);
    });

    fdChild.on("close", (code, signal) => {
      console.log(`runFd: closing fd, code: ${code}, signal: ${signal}`);
      if (code === 0) {
        return resolve();
      }
      fs.rmSync(args.outputFilename, { force: true });

      if (signal) {
        reject(`fd terminated by the signal: ${signal}`);
      }
      reject(`Exit code of 'fd' = ${code}:\n${stderr}`);
    });
  });
  out.end();
}
