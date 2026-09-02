
$WshShell = New-Object -comObject WScript.Shell

$s1 = $WshShell.CreateShortcut("C:\Users\Administrator\Desktop\AstralDesk.lnk")
$s1.TargetPath = "D:\AICONVESTAINO\release\win-unpacked\AstralDesk.exe"
$s1.WorkingDirectory = "D:\AICONVESTAINO\release\win-unpacked"
$s1.IconLocation = "D:\AICONVESTAINO\release\win-unpacked\icon.ico,0"
$s1.Description = "AstralDesk 星轨 AI 桌面终端"
$s1.Save()

$s2 = $WshShell.CreateShortcut("C:\Users\Administrator\Desktop\AstralDesk 星轨AI.lnk")
$s2.TargetPath = "D:\AICONVESTAINO\release\win-unpacked\AstralDesk.exe"
$s2.WorkingDirectory = "D:\AICONVESTAINO\release\win-unpacked"
$s2.IconLocation = "D:\AICONVESTAINO\release\win-unpacked\icon.ico,0"
$s2.Description = "AstralDesk 星轨 AI 桌面终端"
$s2.Save()
