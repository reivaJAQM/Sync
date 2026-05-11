#!/bin/bash
cd "$(dirname "$0")"
./start.sh
osascript -e 'display notification "Servidor iniciado" with title "Sync"'
sleep 2
osascript -e 'tell application "Terminal" to close first window' & exit
