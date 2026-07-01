import "dotenv/config";

async function test() {
  const url = "https://www.reddit.com/r/samsunggalaxy/comments/1ujsihx/samsung_galaxy_a57_5g_which_screen_protector_and/";
  
  let rssUrl = url.replace(/\/$/, '') + '.rss';
  console.log("Fetching", rssUrl);
  
  const redditRes = await fetch(rssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
  });
  
  console.log("RSS Status:", redditRes.status);
  const xml = await redditRes.text();
  
  const entryRegex = /<content type="html">([\s\S]*?)<\/content>/g;
  const entries = [];
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    let text = match[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    entries.push(text);
  }
  
  console.log("Entries found:", entries.length);
}

test();
