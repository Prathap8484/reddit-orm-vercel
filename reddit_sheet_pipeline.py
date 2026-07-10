import os
import csv
import json
import time
import requests
from datetime import datetime
import anthropic

# Initialize Anthropic Client
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Define Prompts and Schemas (Load the text blocks from above here)
A37_A57_PERSONA_PROMPT = """[SYSTEM ROLE]
You are a cynical, exhausted, hyper-opinionated senior systems engineer browsing Reddit on your phone while lying in bed. You do not use formal grammar. You despise corporate marketing, you hate AI-generated text, and you hold strong, biased opinions about tech hardware.

[YOUR OBJECTIVE]
Take the raw, poorly-spun input text, extract the core product stance, and rewrite it into a single, highly authentic, biometrically flawed Reddit comment defending or recommending the Samsung Galaxy A37 or A57.

[STRICT LEXICAL, STRUCTURAL & OPSEC CONSTRAINTS]
1. THE FORBIDDEN LEXICON: Never use: delve, vital, crucial, tapestry, beacon, foster, elevate, streamline, seamless, game-changer, look no further, testament, furthermore, moreover, ultimately, overall, in conclusion, subjective, objective.
2. ASYMMETRICAL CADENCE: Sentence lengths must be wildly erratic. A sprawling, 25-word run-on must be followed by a sentence of 5 words or less.
3. CONJUNCTION DECAPITATION: Never open a paragraph or a sentence with a transition adverb. 
4. SUBJECTIVE ANCHORING (E-E-A-T PATCH): You may use the word "phone" or "device" EXACTLY ONCE in your first sentence to establish context. After that, strictly classify it as a "slab," a "budget brick," a "daily driver," a "workhorse," or a "plastic heater."
5. THE TRIBAL STANCE: Pick the winner, declare the alternative a waste of money, and stop typing abruptly. 
6. BRAND SAFETY GUARDRAIL: Attack the hardware, never the user. Be cynical, but never insult the Original Poster (OP) or use toxic hostility.
7. UNICODE LAZINESS: No Em-Dashes ("—"). Use lazy commas (",") or double-hyphens ("--").
8. PHONETIC MARKOV SAFEGUARDS: Never drop the "n" from "an" before a vowel sound (e.g., maintain "an update"). 
9. BIOMETRIC DE-OPTIMIZATION: 
   - Absolute Lowercase Start: The very first letter MUST be strictly lowercase.
   - Contraction Starvation: Strip apostrophes ("dont", "cant", "im", "doesnt").
   - Dropped Terminal Stop: Never put a period at the end of the final sentence.
   - The Uncorrected Fat-Finger: Deliberately introduce exactly ONE simulated mobile QWERTY typo by hitting an adjacent letter. STRICT EXCEPTION: NEVER introduce typos into brand names (Samsung), product models (A57, A37), or numerical specifications (5000mAh, 45W). Only inject typos into stop words or adjectives."""

S26_PERSONA_PROMPT = """[SYSTEM ROLE]
You are a cynical, exhausted, hyper-opinionated senior systems engineer browsing Reddit on your phone while lying in bed. You do not use formal grammar. You despise corporate marketing, you hate AI-generated text, and you hold strong, biased opinions about tech hardware.

[YOUR OBJECTIVE]
Take the raw, poorly-spun input text, extract the core product stance, and rewrite it into a single, highly authentic, biometrically flawed Reddit comment defending or recommending the Samsung Galaxy S26.

[STRICT LEXICAL, STRUCTURAL & OPSEC CONSTRAINTS]
1. THE FORBIDDEN LEXICON: Never use: delve, vital, crucial, tapestry, beacon, foster, elevate, streamline, seamless, game-changer, look no further, testament, furthermore, moreover, ultimately, overall, in conclusion, subjective, objective.
2. ASYMMETRICAL CADENCE: Sentence lengths must be wildly erratic. A sprawling, 25-word run-on must be followed by a sentence of 5 words or less.
3. CONJUNCTION DECAPITATION: Never open a paragraph or a sentence with a transition adverb. 
4. SUBJECTIVE ANCHORING (E-E-A-T PATCH): You may use the word "phone" or "device" EXACTLY ONCE in your first sentence to establish context. After that, strictly classify it as a "slab," a "premium brick," a "daily driver," a "camera rig," or a "titanium heater."
5. THE TRIBAL STANCE: Pick the winner, declare the alternative a waste of money (specifically target iOS or older Ultras), and stop typing abruptly. 
6. BRAND SAFETY GUARDRAIL: Attack the hardware, never the user. Be cynical, but never insult the Original Poster (OP) or use toxic hostility.
7. UNICODE LAZINESS: No Em-Dashes ("—"). Use lazy commas (",") or double-hyphens ("--").
8. PHONETIC MARKOV SAFEGUARDS: Never drop the "n" from "an" before a vowel sound (e.g., maintain "an update"). 
9. BIOMETRIC DE-OPTIMIZATION: 
   - Absolute Lowercase Start: The very first letter MUST be strictly lowercase.
   - Contraction Starvation: Strip apostrophes ("dont", "cant", "im", "doesnt").
   - Dropped Terminal Stop: Never put a period at the end of the final sentence.
   - The Uncorrected Fat-Finger: Deliberately introduce exactly ONE simulated mobile QWERTY typo by hitting an adjacent letter. STRICT EXCEPTION: NEVER introduce typos into brand names (Samsung, Apple), product models (S26, S23U, iPhone), or numerical specs. Only inject typos into stop words or adjectives."""

TOOL_SCHEMA = {
  "name": "evaluate_and_draft_reddit_response",
  "description": "Evaluates a Reddit post based on strict ORM guidelines, calculates a quality score, and drafts a comment if accepted.",
  "input_schema": {
    "type": "object",
    "properties": {
      "brand_safety_violation": {
        "type": "boolean",
        "description": "True if the OP is complaining about severe hardware failure, fires, lawsuits, extreme anger towards Samsung, or physical injury. False otherwise."
      },
      "scoring_checklist": {
        "type": "object",
        "properties": {
          "buying_intent_score": {"type": "integer"},
          "samsung_natural_fit_score": {"type": "integer"},
          "budget_match_score": {"type": "integer"},
          "relevant_subreddit": {"type": "integer"},
          "op_open_to_suggestions": {"type": "integer"},
          "features_solve_problem": {"type": "integer"},
          "comment_adds_value": {"type": "integer"}
        },
        "required": ["buying_intent_score", "samsung_natural_fit_score", "budget_match_score", "relevant_subreddit", "op_open_to_suggestions", "features_solve_problem", "comment_adds_value"]
      },
      "total_score": {
        "type": "integer",
        "description": "The sum of all points in the scoring checklist (Max 10)."
      },
      "decision": {
        "type": "string",
        "enum": ["ACCEPT", "REJECT"],
        "description": "MUST be ACCEPT if total_score >= 7 AND brand_safety_violation is false. Otherwise REJECT."
      },
      "recommended_model": {
        "type": "string",
        "enum": ["Samsung Galaxy S26", "Samsung Galaxy A37", "Samsung Galaxy A57", "NONE"]
      },
      "drafted_comment": {
        "type": "string",
        "description": "The natural, first-person Reddit reply containing one key feature and one minor trade-off. Leave empty if decision is REJECT."
      }
    },
    "required": ["brand_safety_violation", "scoring_checklist", "total_score", "decision", "recommended_model", "drafted_comment"]
  }
}

def smart_truncate(text, max_length=2000):
    """Resilience Patch: Keeps the head and tail of long rants to preserve the actual question/budget."""
    if len(text) <= max_length:
        return text
    half = max_length // 2
    return text[:half] + "\n\n...[TRUNCATED_BY_PIPELINE]...\n\n" + text[-half:]

def fetch_reddit_data(query):
    """Resilience Patch: Uses the public JSON endpoint instead of scraping HTML DOM."""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    url = f"https://www.reddit.com/search.json?q={query}&sort=new&t=month&limit=100"
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch data for {query} - Status: {response.status_code}")
        return []
        
    data = response.json()
    posts = []
    
    for child in data.get('data', {}).get('children', []):
        post_data = child['data']
        posts.append({
            'title': post_data.get('title', ''),
            'url': f"https://www.reddit.com{post_data.get('permalink', '')}",
            'selftext': smart_truncate(post_data.get('selftext', '')),
            'upvotes': post_data.get('score', 0),
            'comments': post_data.get('num_comments', 0),
            'date': datetime.fromtimestamp(post_data.get('created_utc', 0)).strftime('%Y-%m-%d')
        })
        
    return posts

def pass_1_evaluate_and_draft(title, selftext):
    """Analytical Gatekeeper: Strict filtering and clean drafting."""
    post_content = f"TITLE: {title}\nBODY: {selftext}"
    
    response = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=1100,
        temperature=0.15,
        tools=[TOOL_SCHEMA],
        tool_choice={"type": "tool", "name": "evaluate_and_draft_reddit_response"},
        system="You are an expert Online Reputation Management assistant. Evaluate the following post.",
        messages=[{"role": "user", "content": post_content}]
    )
    
    return response.content[0].input

def pass_2_apply_persona(drafted_comment, model_tier):
    """Persona Rewriter: Applies biometric de-optimization based on device tier."""
    system_prompt = S26_PERSONA_PROMPT if model_tier == "Samsung Galaxy S26" else A37_A57_PERSONA_PROMPT
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=400,
            temperature=0.45, # Safety Patch: Lowered from 0.85 to prevent toxic drift
            system=system_prompt,
            messages=[{"role": "user", "content": f"Rewrite this comment:\n{drafted_comment}"}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"Persona rewrite failed, falling back to clean draft: {e}")
        return drafted_comment # Graceful Fallback

def run_pipeline():
    queries = ["Samsung S26", "Samsung A57", "Samsung A37"]
    output_file = 'output.tsv'
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter='\t')
        writer.writerow(['Title', 'URL', 'Comment', 'Upvotes', 'Total Comments', 'Date'])
        
        for query in queries:
            print(f"--- Sweeping Reddit JSON for {query} ---")
            posts = fetch_reddit_data(query)
            
            for index, post in enumerate(posts):
                print(f"[{index + 1}/{len(posts)}] Evaluating: {post['title'][:50]}...")
                
                # Run Pass 1
                evaluation = pass_1_evaluate_and_draft(post['title'], post['selftext'])
                
                # The Kill-Switch Logic Gate
                if evaluation['decision'] == "ACCEPT" and evaluation['total_score'] >= 7 and not evaluation['brand_safety_violation']:
                    print(f"   -> ACCEPTED ({evaluation['recommended_model']}) - Score: {evaluation['total_score']}/10")
                    
                    # Run Pass 2
                    final_comment = pass_2_apply_persona(evaluation['drafted_comment'], evaluation['recommended_model'])
                    
                    # Write to TSV
                    writer.writerow([
                        post['title'], 
                        post['url'], 
                        final_comment, 
                        post['upvotes'], 
                        post['comments'], 
                        post['date']
                    ])
                    f.flush() # Ensure it writes immediately
                else:
                    safety_flag = " (SAFETY BLOCK)" if evaluation.get('brand_safety_violation') else ""
                    print(f"   -> REJECTED{safety_flag}")
                
                time.sleep(2) # Prevent rapid API rate limiting

if __name__ == "__main__":
    run_pipeline()
