@echo off
REM ============================================
REM 行动安全守护系统 — 一键部署脚本 (Windows)
REM 使用前请先安装 ossutil64.exe 并配置凭证
REM 下载: https://www.alibabacloud.com/help/zh/oss/utilities/ossutil
REM ============================================

set BUCKET=mobility-guardian
set DIST_DIR=dist

echo.
echo [1/3] 正在构建生产包...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo 构建失败，请检查错误日志
    exit /b 1
)
echo 构建完成

echo.
echo [2/3] 正在上传到 OSS...
ossutil64 cp -r %DIST_DIR%/ oss://%BUCKET%/ --update --delete
if %ERRORLEVEL% neq 0 (
    echo 上传失败，请检查 OSS 配置
    echo 或使用网页端手动上传 %DIST_DIR% 目录到 Bucket
    exit /b 1
)
echo 上传完成

echo.
echo [3/3] 部署完成！
echo 访问地址: https://your-domain.com
echo 如果刚绑定域名，请等待 5-10 分钟 DNS 生效
echo.
echo 提示: 可使用 aliyun cdn RefreshObjectCaches 刷新 CDN 缓存
pause
