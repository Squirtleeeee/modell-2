#!/bin/bash
# 启动预览 + 公网隧道

echo "[1/2] 启动本地预览服务器..."
npx vite preview --host 0.0.0.0 --port 4173 &
sleep 3

echo "[2/2] 启动 Serveo SSH 隧道..."
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:4173 serveo.net
