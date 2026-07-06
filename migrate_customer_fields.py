import sqlite3, os
for db_name in ['pos.db', 'restaurant.db']:
    if not os.path.exists(db_name):
        continue
    conn = sqlite3.connect(db_name)
    cur = conn.execute('PRAGMA table_info(customers)')
    cols = [r[1] for r in cur.fetchall()]
    for col_name in ['password_hash', 'auth_token']:
        if col_name not in cols:
            conn.execute('ALTER TABLE customers ADD COLUMN %s TEXT DEFAULT ""' % col_name)
            print('Added', col_name, 'to', db_name)
    conn.commit()
    conn.close()
print('Migration done')
