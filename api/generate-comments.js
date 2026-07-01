import { S26_PROMPT, DEFAULT_PROMPT } from "../prompts/managerPrompts.js";

function cleanText(value, limit = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured." });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON payload in request body." });
  }
  const topic = String(body.topic || "").toLowerCase();
  const rawBody = cleanText(body.body, 1500);
  const rawTitle = cleanText(body.title, 300);
  const rawContext = cleanText(body.context || (body.topComments ? body.topComments.join(" ") : ""), 2000);

  // Determine which prompt to use
  let selectedPrompt = DEFAULT_PROMPT;
  if (topic.includes("s26") || topic.includes("s 26")) {
    selectedPrompt = S26_PROMPT;
  }

  // Construct the raw input exactly as the manager requested
  const inputData = `[INPUT DATA TO REWRITE]
Topic/Query: ${topic}
Title: ${rawTitle}
Post Body: ${rawBody}
Context/Comments: ${rawContext}
`;

  try {
    const apiEndpoint = `https://api.anthropic.com/v1/messages`;
    
    const payload = {
      model: "claude-sonnet-4-6",
      max_tokens: 250,
      system: selectedPrompt,
      temperature: 0.9,
      messages: [
        { role: "user", content: inputData }
      ]
    };

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-comments] API Error:", errText);
      return res.status(500).json({ error: "AI API Error", details: errText });
    }

    const data = await response.json();
    const generatedText = data?.content?.[0]?.text || "";

    if (!generatedText) {
      return res.status(500).json({ error: "Empty response from AI." });
    }

    // Return it in the array format app.js expects so we don't break the frontend logic
    return res.status(200).json({ comments: [generatedText.trim()] });

  } catch (error) {
    console.error("[generate-comments] Exception:", error.message);
    return res.status(500).json({ error: "Server error during generation." });
  }
}
