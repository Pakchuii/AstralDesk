import urllib.request
import json

raw_key = 'abk_astraldesk_desktop_client_key'
url = 'http://127.0.0.1:6185/api/v1/chat'
payload = json.dumps({
    'username': 'Commander',
    'message': '你好，请用一句话介绍自己！',
    'enable_streaming': True
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, method='POST', headers={
    'Content-Type': 'application/json',
    'X-API-Key': raw_key
})

try:
    res = urllib.request.urlopen(req, timeout=15)
    print('HTTP Status:', res.status)
    while True:
        line = res.readline().decode('utf-8', errors='ignore')
        if not line: break
        print('Stream:', line.strip())
except urllib.error.HTTPError as e:
    print('HTTPError:', e.code, e.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print('Error:', e)
