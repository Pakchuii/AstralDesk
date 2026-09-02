@echo off
chcp 65001 >nul
title 创建 AstralDesk 桌面快捷方式

set "TARGET_EXE=%~dp0release\win-unpacked\AstralDesk.exe"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\AstralDesk 星轨AI.lnk"

echo 正在为 AstralDesk 创建桌面快捷方式...

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%TARGET_EXE%'; $Shortcut.WorkingDirectory = '%~dp0release\win-unpacked'; $Shortcut.Description = 'AstralDesk - 星轨 AI 二次元终端 (AstrBot + DeepSeek)'; $Shortcut.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] 快捷方式已成功创建到你的桌面: "%SHORTCUT_PATH%"
) else (
    echo [!] 快捷方式创建失败，你可以直接打开: "%TARGET_EXE%"
)

pause
