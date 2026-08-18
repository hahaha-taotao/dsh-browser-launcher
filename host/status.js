"use strict";

function classifyStatus({ ready, savedAlive, recentStart }) {
  if (ready) return "running";
  if (savedAlive || recentStart) return "starting";
  return "stopped";
}

module.exports = { classifyStatus };
