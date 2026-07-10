import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.environ.get("SQLITE_DB_PATH", "reddit_posts.db")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # Table to track processed posts to avoid duplicates
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS processed_posts (
                post_id TEXT PRIMARY KEY,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Table to store final drafted comments
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS drafted_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id TEXT,
                title TEXT,
                url TEXT,
                comment TEXT,
                upvotes INTEGER,
                total_comments INTEGER,
                post_date TEXT,
                persona_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()

def is_post_processed(post_id: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM processed_posts WHERE post_id = ?", (post_id,))
        return cursor.fetchone() is not None

def mark_post_processed(post_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO processed_posts (post_id) VALUES (?)", (post_id,))
        conn.commit()

def save_drafted_comment(post_id, title, url, comment, upvotes, total_comments, post_date, persona_type):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO drafted_comments (
                post_id, title, url, comment, upvotes, total_comments, post_date, persona_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (post_id, title, url, comment, upvotes, total_comments, post_date, persona_type))
        conn.commit()
