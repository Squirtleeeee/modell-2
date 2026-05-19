@echo off
REM ============================================
REM 启动完整服务（前端 + 后端） + 公网隧道
REM 关闭本窗口后隧道断开
REM ============================================

echo [1/3] 构建前端...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo 构建失败，请检查错误日志
    pause
    exit /b 1
)

echo [2/3] 启动服务端 (端口 3001)...
start "Server" cmd /c "node server/index.cjs"

echo 等待服务就绪...
timeout /t 2 /nobreak >nul

echo [3/3] 启动 Serveo SSH 隧道...
echo.
echo 公网地址会显示在下方:
echo ========================================
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:3001 serveo.net
echo ========================================

pause
