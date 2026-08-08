import dotenv from 'dotenv';
dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY;

async function testGenerate(model: string) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, what is your model name?' }] }]
        })
      }
    );
    const data: any = await res.json();
    if (data.error) {
      console.log(`[${model}] Error:`, data.error.message);
    } else {
      console.log(`[${model}] Success:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
    }
  } catch (err) {
    console.error(`[${model}] Failed:`, err);
  }
}

async function main() {
  await testGenerate('gemini-3.5-flash');
  await testGenerate('gemini-3.6-flash');
  await testGenerate('gemini-flash-latest');
}

main();
