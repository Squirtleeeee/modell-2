# 行动安全守护系统 — 移动端

> 完整项目文档请查看外层 [README.md](../README.md)

React 19 + Capacitor 8 Android App。

## 快速构建 APK

```bash
npm install
npm run build
cd android
./gradlew assembleDebug --init-script init.gradle
```

APK 生成在 `android/app/build/outputs/apk/debug/app-debug.apk`。

详细教程：[快速启动教程](../快速启动教程.md)
