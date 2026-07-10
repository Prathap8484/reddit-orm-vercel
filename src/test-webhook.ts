import 'dotenv/config';

// TODO: Replace this placeholder with your actual Vercel project domain URL
const VERCEL_URL = "https://YOUR-PROJECT-DOMAIN.vercel.app/api/sweep";

async function testWebhook() {
  console.log(`Starting webhook test against: ${VERCEL_URL}`);

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("❌ CRON_SECRET is missing from your local .env file.");
    process.exit(1);
  }

  try {
    console.log("Sending POST request...");
    const response = await fetch(VERCEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`
      }
    });

    const statusCode = response.status;
    
    let data;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      // Fallback if response isn't JSON
      data = rawText;
    }

    console.log(`\nHTTP Status: ${statusCode}`);
    console.log("Response Body:");
    console.dir(data, { depth: null });

    if (statusCode === 200 && data?.success === true) {
      console.log("\n✅ Webhook test passed! Your Vercel cloud infrastructure is perfectly configured.");
    } else if (statusCode === 401) {
      console.log("\n❌ Authentication failed. Make sure CRON_SECRET matches exactly in both your local .env and Vercel environment variables.");
    } else {
      console.log("\n⚠️ Webhook returned an unexpected status code or response format.");
    }

  } catch (error: any) {
    console.error("\n❌ Network Request Failed:");
    console.error(error.message || error);
  }
}

testWebhook();
