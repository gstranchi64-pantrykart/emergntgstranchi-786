#!/bin/bash
# Guarded starter: if something already serves :3000 (e.g. the platform's own
# `node server.js` boot process), exit quietly instead of crash-looping on
# EADDRINUSE. Otherwise start the app via the root server.js entry point.
if curl -s -o /dev/null --max-time 2 http://localhost:3000/ ; then
  echo "[pantrykart] port 3000 already served by another process — nothing to do."
  exit 0
fi
cd /app
exec node server.js
