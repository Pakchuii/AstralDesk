import os
import re

backend_dir = r'E:\AstrBot\backend'
for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = re.findall(r'@(?:router|app)\.(?:get|post|websocket)\([\'\"]([^\'\"]+)[\'\"]', content)
                    if matches:
                        rel = os.path.relpath(path, backend_dir)
                        print(f"{rel}: {matches}")
            except Exception as e:
                pass
