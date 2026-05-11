#!/bin/bash
cd "$(dirname "$0")"
./stop.sh
osascript -e 'display notification "Servidor detenido" with title "Sync"'
sleep 2
osascript -e 'tell application "Terminal" to close first window' & exit
