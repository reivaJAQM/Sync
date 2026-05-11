#!/bin/bash

echo "🛑 Deteniendo servicios de Sync..."

# Matar procesos de node que usen el puerto 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Matar cualquier proceso de nodemon o node del backend
pkill -f "nodemon src/index.js" 2>/dev/null
pkill -f "node src/index.js" 2>/dev/null

# Matar ngrok
pkill -f "ngrok" 2>/dev/null

echo "✅ Servicios detenidos y puerto 3001 liberado."
