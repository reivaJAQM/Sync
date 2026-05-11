#!/bin/bash

# Navegar al directorio donde está el script
cd "$(dirname "$0")"

# Verificar si el servidor está corriendo (puerto 3001)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "🛑 Deteniendo servicios de Sync..."
    ./stop.sh
    osascript -e 'display notification "Servidor detenido correctamente" with title "Sync Control" subtitle "Estado: OFF"'
else
    echo "🚀 Iniciando servicios de Sync..."
    ./start.sh
    osascript -e 'display notification "Servidor iniciado y túnel ngrok activo" with title "Sync Control" subtitle "Estado: ON"'
fi

# Cerrar la ventana de la terminal automáticamente después de 2 segundos
sleep 2
osascript -e 'tell application "Terminal" to close first window' & exit
