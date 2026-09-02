import os
import shutil
import subprocess

# 1. Kill old running instance if any
subprocess.run(['taskkill', '/F', '/IM', 'AstralDesk.exe'], capture_output=True)
subprocess.run(['taskkill', '/F', '/IM', 'electron.exe'], capture_output=True)

# Remove stale app.asar so Electron runs unpacked resources/app
asar_path = r'D:\AICONVESTAINO\release\win-unpacked\resources\app.asar'
if os.path.exists(asar_path):
    try:
        os.remove(asar_path)
        print('Removed stale app.asar successfully!')
    except Exception as e:
        print('Error removing app.asar:', e)

app_dir = r'D:\AICONVESTAINO\release\win-unpacked\resources\app'
os.makedirs(app_dir, exist_ok=True)

# Copy package.json
shutil.copy2(r'D:\AICONVESTAINO\package.json', os.path.join(app_dir, 'package.json'))

# Copy dist
if os.path.exists(os.path.join(app_dir, 'dist')):
    shutil.rmtree(os.path.join(app_dir, 'dist'))
shutil.copytree(r'D:\AICONVESTAINO\dist', os.path.join(app_dir, 'dist'))

# Copy dist-electron
if os.path.exists(os.path.join(app_dir, 'dist-electron')):
    shutil.rmtree(os.path.join(app_dir, 'dist-electron'))
shutil.copytree(r'D:\AICONVESTAINO\dist-electron', os.path.join(app_dir, 'dist-electron'))

# Copy helper scripts
shutil.copy2(r'D:\AICONVESTAINO\electron\astrbot_query.py', r'D:\AICONVESTAINO\dist-electron\astrbot_query.py')
shutil.copy2(r'D:\AICONVESTAINO\electron\astrbot_query.py', os.path.join(app_dir, 'dist-electron', 'astrbot_query.py'))

# Copy icon
shutil.copy2(r'D:\AICONVESTAINO\src\assets\icon.png', os.path.join(app_dir, 'icon.png'))
shutil.copy2(r'D:\AICONVESTAINO\src\assets\icon.ico', os.path.join(app_dir, 'icon.ico'))
shutil.copy2(r'D:\AICONVESTAINO\src\assets\icon.ico', r'D:\AICONVESTAINO\release\win-unpacked\icon.ico')

# 2. Pack asar
resources_dir = r'D:\AICONVESTAINO\release\win-unpacked\resources'
asar_target = os.path.join(resources_dir, 'app.asar')
print('Packing fresh app.asar with npx asar pack...')
subprocess.run(['cmd', '/c', f'npx --yes asar pack "{app_dir}" "{asar_target}"'], cwd=r'D:\AICONVESTAINO', capture_output=True)
print('Packed fresh app.asar successfully!')

# 3. Update Desktop shortcuts with custom .ico icon
desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
ps_script = f"""
$WshShell = New-Object -comObject WScript.Shell

$s1 = $WshShell.CreateShortcut("{desktop}\\AstralDesk.lnk")
$s1.TargetPath = "D:\\AICONVESTAINO\\release\\win-unpacked\\AstralDesk.exe"
$s1.WorkingDirectory = "D:\\AICONVESTAINO\\release\\win-unpacked"
$s1.IconLocation = "D:\\AICONVESTAINO\\release\\win-unpacked\\icon.ico,0"
$s1.Description = "AstralDesk 星轨 AI 桌面终端"
$s1.Save()

$s2 = $WshShell.CreateShortcut("{desktop}\\AstralDesk 星轨AI.lnk")
$s2.TargetPath = "D:\\AICONVESTAINO\\release\\win-unpacked\\AstralDesk.exe"
$s2.WorkingDirectory = "D:\\AICONVESTAINO\\release\\win-unpacked"
$s2.IconLocation = "D:\\AICONVESTAINO\\release\\win-unpacked\\icon.ico,0"
$s2.Description = "AstralDesk 星轨 AI 桌面终端"
$s2.Save()
"""
with open('d:/AICONVESTAINO/update_shortcut.ps1', 'w', encoding='utf-8-sig') as f:
    f.write(ps_script)

subprocess.run(['powershell', '-ExecutionPolicy', 'Bypass', '-File', 'd:/AICONVESTAINO/update_shortcut.ps1'])
print('Deployed fresh resources/app and updated desktop shortcuts successfully!')

# 4. Launch the freshly updated app
subprocess.Popen([r'D:\AICONVESTAINO\release\win-unpacked\AstralDesk.exe'])
print('Started fresh AstralDesk.exe!')
