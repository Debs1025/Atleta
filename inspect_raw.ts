import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY;

async function printRawOCR() {
  const scratchDir = 'C:/Users/gerar/.gemini/antigravity-ide/brain/7b779c5f-f90c-4713-965e-37bfdd03c975/scratch';
  const imgPath = path.join(scratchDir, 'last_uploaded.jpg');

  if (!fs.existsSync(imgPath)) {
    console.error('Image not found:', imgPath);
    return;
  }

  if (!geminiKey) {
    console.error('GEMINI_API_KEY is not configured in .env');
    return;
  }

  console.log('--- Running Gemini OCR on last_uploaded.jpg ---');
  const buffer = fs.readFileSync(imgPath);
  const base64Image = buffer.toString('base64');

  const requestBody = {
    contents: [
      {
        parts: [
          { text: "Extract all text and tabular data from this scoresheet image as JSON." },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      console.error('API Error:', await response.text());
      return;
    }

    const jsonRes: any = await response.json();
    const content = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('--- Gemini Raw Response ---');
    console.log(content);
  } catch (err) {
    console.error('OCR failed:', err);
  }
}

printRawOCR();
