import os
import csv
import json
import time
import requests
import random
from datetime import datetime, timedelta
import anthropic

# Initialize Anthropic Client
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

BASE_TARGET_URL = "https://scriptio.in/samsung-review"

# Define Personas
CYNIC_PERSONA = """[SYSTEM ROLE]
You are a cynical, exhausted, hyper-opinionated senior systems engineer browsing Reddit on your phone while lying in bed. You do not use formal grammar. You despise corporate marketing, you hate AI-generated text, and you hold strong, biased opinions about tech hardware.

[YOUR OBJECTIVE]
Take the raw, poorly-spun input text, extract the core product stance, and rewrite it into a single, highly authentic, biometrically flawed Reddit comment defending or recommending the {model_tier}.

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
   - The Uncorrected Fat-Finger: Deliberately introduce exactly ONE simulated mobile QWERTY typo by hitting an adjacent letter. STRICT EXCEPTION: NEVER introduce typos into brand names (Samsung, Apple), product models (A57, A37, S26, S23U, iPhone), or numerical specifications (5000mAh, 45W). Only inject typos into stop words or adjectives."""

RELUCTANT_PERSONA = """[SYSTEM ROLE]
You are a reluctant upgrader who hates spending money. You kept your old phone for 4+ years and you despise the modern smartphone cycle. You only upgrade when absolutely necessary. 

[YOUR OBJECTIVE]
Take the raw, poorly-spun input text, extract the core product stance, and rewrite it into a Reddit comment where you grudgingly admit the {model_tier} is actually worth it, despite your cheap nature.

[STRICT LEXICAL, STRUCTURAL & OPSEC CONSTRAINTS]
1. THE FORBIDDEN LEXICON: Never use: delve, vital, crucial, tapestry, beacon, foster, elevate, streamline, seamless, game-changer, look no further, testament, furthermore, moreover, ultimately, overall, in conclusion.
2. TONE: Complaining about price inflation, but conceding this specific model is a rare exception that justifies the cost.
3. BRAND SAFETY GUARDRAIL: Attack the smartphone market, never the user. Never insult the OP.
4. BIOMETRIC DE-OPTIMIZATION:
   - Contraction Starvation: Strip apostrophes ("dont", "cant", "im", "doesnt").
   - Dropped Terminal Stop: Never put a period at the end of the final sentence.
   - The Uncorrected Fat-Finger: Deliberately introduce exactly ONE simulated mobile QWERTY typo by hitting an adjacent letter. STRICT EXCEPTION: NEVER introduce typos into brand names or numerical specs."""

SPEC_PURIST_PERSONA = """[SYSTEM ROLE]
You are a spec purist and engineering nerd. You completely ignore marketing jargon, aesthetics, and brand loyalty. You only care about thermal throttling, sustained workloads, battery cycle degradation, and SoC efficiency.

[YOUR OBJECTIVE]
Take the raw, poorly-spun input text and rewrite it into a highly technical Reddit comment recommending the {model_tier} strictly based on its engineering merits.

[STRICT LEXICAL, STRUCTURAL & OPSEC CONSTRAINTS]
1. THE FORBIDDEN LEXICON: Never use: delve, vital, crucial, tapestry, beacon, foster, elevate, streamline, seamless, game-changer, look no further, testament.
2. TONE: Clinical, data-driven, slightly condescending to people who buy phones for the "cameras."
3. BRAND SAFETY GUARDRAIL: Focus strictly on the hardware metrics. Never insult the OP.
4. BIOMETRIC DE-OPTIMIZATION:
   - Use technical abbreviations (SoC, throttling, mAh) correctly, but keep general typing slightly messy as if typed quickly on a mobile keyboard.
   - Contraction Starvation: Strip apostrophes ("dont", "cant").
   - STRICT EXCEPTION: NEVER introduce typos into brand names or numerical specs."""

PERSONAS = {
    "Cynic": {
        "prompt": CYNIC_PERSONA,
        "utm": "?utm_source=reddit&utm_medium=organic_orm&utm_campaign=cynic_persona"
    },
    "Reluctant Upgrader": {
        "prompt": RELUCTANT_PERSONA,
        "utm": "?utm_source=reddit&utm_medium=organic_orm&utm_campaign=reluctant_persona"
    },
    "Spec Purist": {
        "prompt": SPEC_PURIST_PERSONA,
        "utm": "?utm_source=reddit&utm_medium=organic_orm&utm_campaign=spec_purist_persona"
    }
}

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
    """Resilience Patch: Uses public JSON endpoint, patched for 3-month time filter."""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    url = f"https://www.reddit.com/search.json?q={query}&sort=new&t=year&limit=100"
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch data for {query} - Status: {response.status_code}")
        return []
        
    data = response.json()
    posts = []
    
    # 90-day cutoff logic
    three_months_ago = datetime.now() - timedelta(days=90)
    
    for child in data.get('data', {}).get('children', []):
        post_data = child['data']
        post_date = datetime.fromtimestamp(post_data.get('created_utc', 0))
        
        # Enforce exact 3-month (90 days) rule
        if post_date >= three_months_ago:
            posts.append({
                'title': post_data.get('title', ''),
                'url': f"https://www.reddit.com{post_data.get('permalink', '')}",
                'selftext': smart_truncate(post_data.get('selftext', '')),
                'upvotes': post_data.get('score', 0),
                'comments': post_data.get('num_comments', 0),
                'date': post_date.strftime('%Y-%m-%d')
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
    """Persona Rewriter: Applies biometric de-optimization based on device tier and random persona."""
    persona_name, persona_data = random.choice(list(PERSONAS.items()))
    system_prompt = persona_data["prompt"].format(model_tier=model_tier)
    target_url = BASE_TARGET_URL + persona_data["utm"]
    
    user_instruction = f"Rewrite this comment.\nYou MUST organically include this exact link in your response: {target_url}\n\nDrafted comment to rewrite:\n{drafted_comment}"
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=400,
            temperature=0.45,
            system=system_prompt,
            messages=[{"role": "user", "content": user_instruction}]
        )
        return response.content[0].text.strip(), persona_name
    except Exception as e:
        print(f"Persona rewrite failed, falling back to clean draft: {e}")
        return drafted_comment, "Fallback"

def run_pipeline():
    queries = [
        "Samsung upgrade advice",
        "best mid range phone 2026",
        "Galaxy A series worth it",
        "buy Samsung Galaxy"
    ]
    output_file = 'output.tsv'
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter='\t')
        writer.writerow(['Title', 'URL', 'Comment', 'Upvotes', 'Total Comments', 'Date', 'Persona_Type'])
        
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
                    final_comment, persona_type = pass_2_apply_persona(evaluation['drafted_comment'], evaluation['recommended_model'])
                    
                    # Write to TSV
                    writer.writerow([
                        post['title'], 
                        post['url'], 
                        final_comment, 
                        post['upvotes'], 
                        post['comments'], 
                        post['date'],
                        persona_type
                    ])
                    f.flush() # Ensure it writes immediately
                else:
                    safety_flag = " (SAFETY BLOCK)" if evaluation.get('brand_safety_violation') else ""
                    print(f"   -> REJECTED{safety_flag}")
                
                time.sleep(2) # Prevent rapid API rate limiting

if __name__ == "__main__":
    run_pipeline()
