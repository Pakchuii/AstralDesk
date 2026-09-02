@echo off
chcp 65001 >nul
title AstralDesk - 星轨 AI 二次元终端

cd /d "%~dp0"
if exist "release\win-unpacked\AstralDesk.exe" (
    start "" "release\win-unpacked\AstralDesk.exe"
) else (
    echo 正在首次打包生成 AstralDesk.exe，请稍候...
    npm run build:dir
    start "" "release\win-unpacked\AstralDesk.exe"
)
exit
