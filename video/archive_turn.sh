#!/bin/bash
# archive_turn.sh <turn> — snapshot latest frame into archive for the /replay scrubber
cp -f frames/latest.jpg "frames/archive/t$(printf %04d "$1")_$(date +%H%M%S).jpg"
# mirror civ6-mcp map capture for the state replay
cp -f /mnt/c/Users/danie/.civ6-mcp/mapturns_china_-401507495_solar-amber-chariot-09.jsonl frames/state/turns.jsonl 2>/dev/null
