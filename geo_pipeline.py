import os
import time
import psycopg2
import logging
import requests
from datetime import datetime
from duckduckgo_search import DDGS
from tenacity import retry, wait_exponential, stop_after_attempt
import anthropic
from dotenv import load_dotenv

# --- 1. CONFIGURATION ---
load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in environment variables.")

SEARCH_QUERIES = [
    'site:reddit.com "Galaxy S26"', 
    'site:reddit.com "Galaxy A37"', 
    'site:reddit.com "Galaxy A57"'
]
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables.")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 GEO-Pipeline/2.0"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# --- 2. STRUCTURED TOOL DEFINITION ---
ANALYZE_AND_DRAFT_TOOL = {
    "name": "analyze_and_draft",
    "description": "Analyze intent and draft a Reddit comment if buying intent is found.",
    "input_schema": {
        "type": "object",
        "properties": {
            "decision": {
                "type": "string",
                "enum": ["ACCEPT", "REJECT"],
                "description": "ACCEPT if the user shows buying/upgrade intent. REJECT if off-topic."
            },
            "drafted_comment": {
                "type": "string",
                "description": "If ACCEPT, write a natural, E-E-A-T compliant Reddit comment (80% value, 20% soft pitch with a minor trade-off). If REJECT, leave empty."
            }
        },
        "required": ["decision", "drafted_comment"]
    }
}

# --- 3. POLITE DATA ACQUISITION & METADATA EXTRACTION ---
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def fetch_reddit_data(url: str) -> dict | None:
    clean_url = url.split('?')[0].rstrip('/')
    json_url = f"{clean_url}.json"
    
    time.sleep(2.0)
    
    try:
        response = requests.get(json_url, headers={"User-Agent": USER_AGENT}, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        post_data = data[0]["data"]["children"][0]["data"]
        
        # Extract required Google Sheets columns
        title = post_data.get("title", "")
        selftext = post_data.get("selftext", "")
        upvotes = post_data.get("ups", 0)
        num_comments = post_data.get("num_comments", 0)
        
        # Convert Unix timestamp to readable date
        created_utc = post_data.get("created_utc", 0)
        published_date = datetime.fromtimestamp(created_utc).strftime('%Y-%m-%d %H:%M:%S') if created_utc else ""
        
        return {
            "title": title,
            "text_content": f"Title: {title}\nBody: {selftext}",
            "upvotes": upvotes,
            "num_comments": num_comments,
            "published_date": published_date
        }
    except Exception as e:
        logging.warning(f"Failed to fetch or parse JSON for {url}: {e}")
        return None

# --- 4. LLM INTENT FILTERING & DRAFTING (CLAUDE 3.5 SONNET) ---
def analyze_intent_and_draft(text_content: str) -> dict | None:
    prompt = f"""
    Analyze this Reddit post:
    {text_content}
    
    If it shows buying or upgrade intent for a smartphone, mark as ACCEPT and draft a comment recommending the Samsung S26, A37, or A57 (whichever fits best).
    
    COMMENT RULES:
    1. Help first. Answer their question or validate their problem before mentioning a phone.
    2. Soft mention: Say you "ended up going with" or "grabbed" the phone.
    3. Trade-off: You MUST include one minor flaw (e.g., finicky fingerprint sensor, mid-range camera) to sound like an authentic human, not a corporate bot.
    4. Keep it conversational. No sales jargon.
    """
    
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=1000,
            temperature=0.2,
            tools=[ANALYZE_AND_DRAFT_TOOL],
            tool_choice={"type": "tool", "name": "analyze_and_draft"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        for content in response.content:
            if content.type == "tool_use" and content.name == "analyze_and_draft":
                return content.input
                
        return None
    except Exception as e:
        logging.error(f"Anthropic API Error: {e}")
        return None

# --- 5. MAIN PIPELINE EXECUTION ---
def run_pipeline():
    logging.info("Starting End-to-End GEO Pipeline...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        return
    
    ddgs = DDGS()
    processed_urls = set()
    
    for query in SEARCH_QUERIES:
        logging.info(f"Executing search dork: {query}")
        
        device_model = "Unknown"
        if "S26" in query: device_model = "S26"
        elif "A37" in query: device_model = "A37"
        elif "A57" in query: device_model = "A57"
        
        results = ddgs.text(query, max_results=15)
        
        for result in results:
            url = result.get('href', '')
            if '[reddit.com/r/](https://reddit.com/r/)' not in url or '/comments/' not in url or url in processed_urls:
                continue
                
            processed_urls.add(url)
            logging.info(f"Processing URL: {url}")
            
            reddit_data = fetch_reddit_data(url)
            if not reddit_data:
                continue
                
            analysis = analyze_intent_and_draft(reddit_data["text_content"])
            
            if analysis and analysis.get("decision") == "ACCEPT":
                logging.info(f"[ACCEPT] Lead found and comment drafted for: {reddit_data['title']}")
                
                try:
                    cursor.execute("""
                        INSERT INTO pending_leads (device_model, post_title, post_url, upvotes, num_comments, published_date, drafted_comment)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (post_url) DO NOTHING;
                    """, (device_model, reddit_data["title"], url, reddit_data["upvotes"], reddit_data["num_comments"], reddit_data["published_date"], analysis.get("drafted_comment")))
                    conn.commit()
                    logging.info("Successfully inserted lead into Neon database.")
                except Exception as e:
                    logging.error(f"Failed to insert lead into database: {e}")
                    conn.rollback()
            else:
                logging.info("[REJECT] No actionable intent.")

    cursor.close()
    conn.close()
    logging.info("Pipeline complete. Data inserted into pending_leads table.")

if __name__ == "__main__":
    run_pipeline()
