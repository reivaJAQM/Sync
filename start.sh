#!/bin/bash

# Navegar a la carpeta del backend
cd "$(dirname "$0")/backend"

echo "🚀 Iniciando servicios de Sync..."

# Detener cualquier instancia previa para evitar conflictos
lsof -ti:3001 | xargs kill -9 2>/dev/null
pkill -f "ngrok" 2>/dev/null

# Iniciar el servidor backend en segundo plano
nohup npm run dev > server.log 2>&1 &
echo "✅ Servidor backend iniciado (Puerto 3001)"

# Iniciar ngrok en segundo plano con tu dominio estático
nohup ngrok http --url=luba-enterologic-jessenia.ngrok-free.dev 3001 > ngrok.log 2>&1 &
echo "✅ Túnel ngrok iniciado (https://luba-enterologic-jessenia.ngrok-free.dev)"

echo "----------------------------------------------------"
echo "¡Todo listo! Los logs están en backend/server.log y backend/ngrok.log"
echo "Ya puedes usar la APK tranquilamente."
echo "----------------------------------------------------"
