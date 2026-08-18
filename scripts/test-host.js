"use strict";

const { spawn } = require("child_process");
const path = require("path");

const host = path.join(__dirname, "..", "host", "native-host.js");
const child = spawn(process.execPath, [host], { stdio: ["pipe", "pipe", "inherit"] });

const payload = Buffer.from(JSON.stringify({ action: process.argv[2] || "status" }), "utf8");
const header = Buffer.alloc(4);
header.writeUInt32LE(payload.length, 0);
child.stdin.write(header);
child.stdin.write(payload);
child.stdin.end();

let buf = Buffer.alloc(0);
child.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
});
child.on("close", (code) => {
  if (buf.length < 4) {
    console.error("no response, exit", code);
    process.exit(1);
  }
  const len = buf.readUInt32LE(0);
  const json = buf.subarray(4, 4 + len).toString("utf8");
  console.log(json);
  process.exit(0);
});
