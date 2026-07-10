import type { VercelRequest, VercelResponse } from '@vercel/node';
import { run } from '../src/engine.js';

// Vercel Serverless Function Timeout Config (Free Tier Max: 60s)
export const maxDuration = 60; 

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enforce POST method for the webhook
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed. Please send a POST request.' 
    });
  }

  // Security: Require CRON_SECRET authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[API Security] Unauthorized access attempt blocked.");
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    console.log("[API Trigger] Starting automated Reddit ORM sweep...");
    
    // Await the main execution engine from src/engine.ts
    await run();
    
    // Return typed success response
    return res.status(200).json({ 
      success: true, 
      message: 'Sweep pipeline executed successfully.' 
    });

  } catch (error: any) {
    console.error("[API Error] Pipeline failed:", error);
    
    // Return typed error response
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal Server Error during execution.' 
    });
  }
}
