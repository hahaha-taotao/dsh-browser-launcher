"use strict";

const assert = require("assert");
const { classifyStatus } = require("../host/status.js");

assert.strictEqual(classifyStatus({ ready: true, savedAlive: false }), "running");
assert.strictEqual(classifyStatus({ ready: true, savedAlive: true }), "running");
assert.strictEqual(classifyStatus({ ready: false, savedAlive: true }), "starting");
assert.strictEqual(classifyStatus({ ready: false, savedAlive: false }), "stopped");
assert.strictEqual(classifyStatus({ ready: false, savedAlive: false, recentStart: true }), "starting");
assert.strictEqual(classifyStatus({ ready: true, savedAlive: false, recentStart: true }), "running");
console.log("status classify ok");
