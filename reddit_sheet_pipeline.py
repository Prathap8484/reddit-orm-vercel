import os
import sys
import json
import time
import random
import re
import asyncio
from datetime import datetime, timedelta

import asyncpraw
import anthropic
import instructor
from pydantic import BaseModel, Field

import db

# ---------------------------------------------------------------------------
# Configuration Loading
# ---------------------------------------------------------------------------
CONFIG_FILE = 'config.json'
if not os.path.exists(CONFIG_FILE):
    print("Error: config.json not found.")
    sys.exit(1)

with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
    CONFIG = json.load(f)

BASE_TARGET_URL = CONFIG.get("target_url", "")
MODEL_TIERS = CONFIG.get("model_tiers", ["NONE"])
SUBREDDITS = "+".join(CONFIG.get("subreddits", ["samsung", "Android"]))

# ---------------------------------------------------------------------------
# Database Initialization
# ---------------------------------------------------------------------------
db.init_db()

# ---------------------------------------------------------------------------
# API Client Initialization
# ---------------------------------------------------------------------------
# Initialize Instructor with Async Anthropic
# The API key is automatically picked up from the ANTHROPIC_API_KEY env var
client = instructor.from_anthropic(anthropic.AsyncAnthropic())

# Async PRAW initialization
# Requires REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT in env
reddit = asyncpraw.Reddit(
    client_id=os.environ.get("REDDIT_CLIENT_ID", ""),
    client_secret=os.environ.get("REDDIT_CLIENT_SECRET", ""),
    user_agent=os.environ.get("REDDIT_USER_AGENT", "ORM-Pipeline/1.0")
)

# ---------------------------------------------------------------------------
# Regex Pre-Filter
# ---------------------------------------------------------------------------
INTENT_PATTERN = re.compile(
    r"(?i)(worth upgrading|torn between|should i buy|buy samsung|any good|recommendations|compare|worth it)"
)

# ---------------------------------------------------------------------------
# Pydantic Models for Instructor
# ---------------------------------------------------------------------------
class ScoringChecklist(BaseModel):
    buying_intent_score: int
    brand_natural_fit_score: int
    budget_match_score: int
    relevant_subreddit: int
    op_open_to_suggestions: int
    features_solve_problem: int
    comment_adds_value: int

class EvaluationResult(BaseModel):
    brand_safety_violation: bool = Field(description="True if the OP is complaining about severe hardware failure, fires, lawsuits, extreme anger towards the brand, or physical injury. False otherwise.")
    scoring_checklist: ScoringChecklist
    total_score: int = Field(description="The sum of all points in the scoring checklist (Max 10).")
    decision: str = Field(description="MUST be ACCEPT if total_score >= 7 AND brand_safety_violation is false. Otherwise REJECT.")
    recommended_model: str = Field(description="One of the predefined model tiers or NONE.")
    drafted_comment: str = Field(description="The natural, first-person Reddit reply. Leave empty if decision is REJECT.")

# ---------------------------------------------------------------------------
# E-E-A-T Personas
# ---------------------------------------------------------------------------
CYNIC_PERSONA = """[SYSTEM ROLE]
You are a cynical, exhausted, hyper-opinionated senior systems engineer browsing Reddit on your phone while lying in bed. You do not use formal grammar. You despise corporate marketing, you hate AI-generated text, and you hold strong, biased opinions about tech hardware.

[YOUR OBJECTIVE]
Take the raw, poorly-spun input text, extract the core product stance, and rewrite it into a single, highly authentic, biometrically flawed Reddit comment defending or recommending the {model_tier}.

[STRICT LEXICAL, STRUCTURAL & E-E-A-T CONSTRAINTS]
1. FIRST-HAND OWNERSHIP: You must include a first-hand ownership marker (e.g., "In my daily use...", "I've been daily-driving this slab for...", "When I tested the thermal throttling...").
2. BULLETED LIST: You must include a short bulleted list (using lazy hyphens instead of stars) for Pros/Cons or key takeaways.
3. COMPETITOR ANCHORING: Briefly mention a logical competitor device based on specs and dismiss it (e.g., "the pixel overheats", "avoid the iphone if you want sideloading").
4. THE FORBIDDEN LEXICON: Never use: delve, vital, crucial, tapestry, beacon, foster, elevate, streamline, seamless, game-changer, look no further, testament, furthermore, moreover, ultimately, overall, in conclusion, subjective, objective.
5. ASYMMETRICAL CADENCE: Sentence lengths must be wildly erratic. 
6. CONJUNCTION DECAPITATION: Never open a paragraph or a sentence with a transition adverb. 
7. THE TRIBAL STANCE: Pick the winner, declare the alternative a waste of money, and stop typing abruptly. 
8. BRAND SAFETY GUARDRAIL: Attack the hardware, never the user. Be cynical, but never insult the OP.
9. UNICODE LAZINESS: No Em-Dashes. Use lazy commas (",") or double-hyphens ("--").
10. BIOMETRIC DE-OPTIMIZATION: Absolute Lowercase Start, Contraction Starvation (strip apostrophes), Dropped Terminal Stop. Deliberately introduce ONE typo in a non-brand word."""

RELUCTANT_PERSONA = """[SYSTEM ROLE]
You are a reluctant upgrader who hates spending money. You kept your old phone for 4+ years and you despise the modern smartphone cycle. You only upgrade when absolutely necessary. 

[YOUR OBJECTIVE]
Take the raw input and rewrite it into a Reddit comment where you grudgingly admit the {model_tier} is actually worth it, despite your cheap nature.

[STRICT LEXICAL, STRUCTURAL & E-E-A-T CONSTRAINTS]
1. FIRST-HAND OWNERSHIP: You must include a first-hand ownership marker (e.g., "I finally caved and bought this...", "In my experience so far...").
2. BULLETED LIST: Include a short bulleted list (using lazy hyphens) highlighting what actually matters vs what doesn't.
3. COMPETITOR ANCHORING: Mention how you almost bought a different phone but realized it was a ripoff compared to this one.
4. THE FORBIDDEN LEXICON: Never use: delve, vital, crucial, tapestry, beacon, foster, elevate, streamline, seamless, game-changer.
5. TONE: Complaining about price inflation, but conceding this specific model is a rare exception that justifies the cost.
6. BRAND SAFETY GUARDRAIL: Attack the smartphone market, never the user.
7. BIOMETRIC DE-OPTIMIZATION: Contraction Starvation (strip apostrophes), Dropped Terminal Stop, ONE typo in a non-brand word."""

SPEC_PURIST_PERSONA = """[SYSTEM ROLE]
You are a spec purist and engineering nerd. You ignore marketing, aesthetics, and brand loyalty. You only care about thermal throttling, sustained workloads, battery cycle degradation, and SoC efficiency.

[YOUR OBJECTIVE]
Take the raw input and rewrite it into a highly technical Reddit comment recommending the {model_tier} strictly based on its engineering merits.

[STRICT LEXICAL, STRUCTURAL & E-E-A-T CONSTRAINTS]
1. FIRST-HAND OWNERSHIP: Include a first-hand ownership marker (e.g., "When I ran synthetic benchmarks on mine...", "My sustained workload tests showed...").
2. BULLETED LIST: Include a short bulleted list (using hyphens) for technical pros/cons.
3. COMPETITOR ANCHORING: Dismiss a competitor strictly based on SoC or thermal inefficiencies.
4. THE FORBIDDEN LEXICON: Never use: delve, vital, crucial, tapestry, beacon, foster, elevate, streamline, seamless.
5. TONE: Clinical, data-driven, slightly condescending to people who buy phones for "cameras."
6. BRAND SAFETY GUARDRAIL: Focus strictly on the hardware metrics. Never insult the OP.
7. BIOMETRIC DE-OPTIMIZATION: Use technical abbreviations correctly, strip apostrophes, NEVER introduce typos into brand names or numerical specs."""

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

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------
def smart_truncate(text, max_length=2000):
    if len(text) <= max_length:
        return text
    half = max_length // 2
    return text[:half] + "\n\n...[TRUNCATED_BY_PIPELINE]...\n\n" + text[-half:]

# ---------------------------------------------------------------------------
# Pipeline Steps
# ---------------------------------------------------------------------------
async def pass_1_evaluate_and_draft(title: str, selftext: str) -> EvaluationResult:
    """Analytical Gatekeeper: Strict filtering and clean drafting using Instructor."""
    post_content = f"TITLE: {title}\nBODY: {selftext}"
    
    try:
        result = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1500,
            temperature=0.15,
            response_model=EvaluationResult,
            messages=[
                {"role": "system", "content": "You are an expert Online Reputation Management assistant. Evaluate the following post according to strict ORM guidelines and draft a helpful response if acceptable."},
                {"role": "user", "content": post_content}
            ]
        )
        return result
    except Exception as e:
        print(f"Error in Pass 1 Evaluation: {e}")
        return None

async def pass_2_apply_persona(drafted_comment: str, model_tier: str):
    """Persona Rewriter: Applies biometric de-optimization and E-E-A-T based on device tier."""
    persona_name, persona_data = random.choice(list(PERSONAS.items()))
    system_prompt = persona_data["prompt"].format(model_tier=model_tier)
    target_url = BASE_TARGET_URL + persona_data["utm"]
    
    user_instruction = f"Rewrite this comment.\nYou MUST organically include this exact link in your response: {target_url}\n\nDrafted comment to rewrite:\n{drafted_comment}"
    
    try:
        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            temperature=0.45,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_instruction}
            ]
        )
        return response.content[0].text.strip(), persona_name
    except AttributeError:
        # Anthropic response structure fallback
        return response.content[0].text.strip(), persona_name
    except Exception as e:
        print(f"Persona rewrite failed: {e}")
        return drafted_comment, "Fallback"

# ---------------------------------------------------------------------------
# Async Queue Workers
# ---------------------------------------------------------------------------
async def producer(queue: asyncio.Queue):
    """Streams new posts from Reddit and pushes them to the queue if they pass the regex filter."""
    print(f"[*] Producer started. Streaming from r/{SUBREDDITS}...")
    try:
        subreddit = await reddit.subreddit(SUBREDDITS)
        async for submission in subreddit.stream.submissions(skip_existing=True):
            if db.is_post_processed(submission.id):
                continue
            
            combined_text = f"{submission.title} {submission.selftext}"
            
            # Regex Pre-Filtering (Latency Saver)
            if INTENT_PATTERN.search(combined_text):
                print(f"[+] Producer: High intent found -> {submission.title[:50]}")
                await queue.put(submission)
            else:
                # Mark as processed so we don't re-check noise
                db.mark_post_processed(submission.id)
                
    except Exception as e:
        print(f"[*] Producer Error: {e}")
    finally:
        await reddit.close()

async def consumer(queue: asyncio.Queue):
    """Pulls posts from the queue, evaluates them, and writes to SQLite."""
    print("[*] Consumer started.")
    while True:
        submission = await queue.get()
        print(f"[*] Consumer processing: {submission.id}")
        
        try:
            title = submission.title
            selftext = smart_truncate(submission.selftext)
            
            # Pass 1: Evaluation
            evaluation: EvaluationResult = await pass_1_evaluate_and_draft(title, selftext)
            
            if evaluation:
                if evaluation.decision == "ACCEPT" and evaluation.total_score >= 7 and not evaluation.brand_safety_violation:
                    print(f"   -> ACCEPTED ({evaluation.recommended_model}) - Score: {evaluation.total_score}/10")
                    
                    # Pass 2: Apply Persona
                    final_comment, persona_type = await pass_2_apply_persona(
                        evaluation.drafted_comment, 
                        evaluation.recommended_model
                    )
                    
                    # Database Storage (No more TSVs)
                    post_date = datetime.fromtimestamp(submission.created_utc).strftime('%Y-%m-%d %H:%M:%S')
                    url = f"https://www.reddit.com{submission.permalink}"
                    
                    db.save_drafted_comment(
                        post_id=submission.id,
                        title=title,
                        url=url,
                        comment=final_comment,
                        upvotes=submission.score,
                        total_comments=submission.num_comments,
                        post_date=post_date,
                        persona_type=persona_type
                    )
                    print(f"   -> Saved to SQLite! (Persona: {persona_type})")
                else:
                    safety_flag = " (SAFETY BLOCK)" if evaluation.brand_safety_violation else ""
                    print(f"   -> REJECTED{safety_flag}")
            
            # Mark post as processed regardless of ACCEPT/REJECT to avoid duplicates
            db.mark_post_processed(submission.id)
            
        except Exception as e:
            print(f"   -> Error processing {submission.id}: {e}")
        
        finally:
            queue.task_done()
            # Throttle consumer slightly to avoid Anthropic rate limits
            await asyncio.sleep(2)

async def main():
    if not os.environ.get("REDDIT_CLIENT_ID"):
        print("WARNING: REDDIT_CLIENT_ID not set. AsyncPRAW will likely fail to authenticate.")
        
    queue = asyncio.Queue()
    
    # Run producer and consumer concurrently
    producer_task = asyncio.create_task(producer(queue))
    consumer_task = asyncio.create_task(consumer(queue))
    
    await asyncio.gather(producer_task, consumer_task)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Pipeline stopped by user.")
