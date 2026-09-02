import sys
import os
import json
import sqlite3

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    action = sys.argv[1] if len(sys.argv) > 1 else 'max_id'
    db_path = os.path.expanduser('~/.astrbot/data/data_v4.db')
    
    if not os.path.exists(db_path):
        if action == 'max_id':
            print('0')
        else:
            print('[]')
        return

    try:
        conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
        cur = conn.cursor()
        
        if action == 'max_id':
            cur.execute("SELECT MAX(id) FROM platform_message_history WHERE platform_id='webchat'")
            row = cur.fetchone()
            m = row[0] if (row and row[0] is not None) else 0
            print(m)
        elif action == 'query_new':
            last_id = int(sys.argv[2]) if len(sys.argv) > 2 else 0
            cur.execute("""
                SELECT id, user_id, sender_name, content, created_at 
                FROM platform_message_history 
                WHERE platform_id='webchat' AND sender_name='bot' AND id > ?
                ORDER BY id ASC
            """, (last_id,))
            rows = cur.fetchall()
            res = []
            for r in rows:
                raw = r[3]
                text = ''
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict) and 'message' in parsed:
                        for part in parsed['message']:
                            if isinstance(part, dict) and part.get('type') == 'plain':
                                text += part.get('text', '')
                    elif isinstance(parsed, dict) and 'content' in parsed:
                        text = str(parsed['content'])
                    else:
                        text = str(raw)
                except Exception:
                    text = str(raw)
                res.append({'id': r[0], 'session_id': r[1], 'sender': r[2], 'text': text, 'created_at': r[4]})
            print(json.dumps(res, ensure_ascii=False))
        elif action == 'fetch_missed':
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            cur.execute("""
                SELECT id, user_id, sender_name, content, created_at 
                FROM platform_message_history 
                WHERE platform_id='webchat' AND sender_name='bot'
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            rows = cur.fetchall()
            res = []
            for r in reversed(rows):
                raw = r[3]
                text = ''
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict) and 'message' in parsed:
                        for part in parsed['message']:
                            if isinstance(part, dict) and part.get('type') == 'plain':
                                text += part.get('text', '')
                    elif isinstance(parsed, dict) and 'content' in parsed:
                        text = str(parsed['content'])
                    else:
                        text = str(raw)
                except Exception:
                    text = str(raw)
                res.append({'id': r[0], 'session_id': r[1], 'sender': r[2], 'text': text, 'created_at': r[4]})
            print(json.dumps(res, ensure_ascii=False))
        conn.close()
    except Exception:
        if action == 'max_id':
            print('0')
        else:
            print('[]')

if __name__ == '__main__':
    main()
