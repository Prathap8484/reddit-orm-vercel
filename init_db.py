import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment variables.")
    exit(1)

create_table_query = """
CREATE TABLE IF NOT EXISTS pending_leads (
    id SERIAL PRIMARY KEY,
    device_model VARCHAR(50) NOT NULL,
    post_title TEXT NOT NULL,
    post_url TEXT UNIQUE NOT NULL,
    upvotes INTEGER DEFAULT 0,
    num_comments INTEGER DEFAULT 0,
    published_date TIMESTAMP,
    drafted_comment TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def init_db():
    try:
        # Connect to the database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Execute the create table query
        cur.execute(create_table_query)
        conn.commit()
        
        # Close communication with the database
        cur.close()
        conn.close()
        
        print("Database connection secure. Table 'pending_leads' successfully initialized.")
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == "__main__":
    init_db()
