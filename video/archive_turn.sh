#!/bin/bash
# archive_turn.sh <turn> — snapshot latest frame into archive for the /replay scrubber
cp -f frames/latest.jpg "frames/archive/t$(printf %04d "$1")_$(date +%H%M%S).jpg"
