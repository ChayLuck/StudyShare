import * as dotenv from 'dotenv';
dotenv.config();

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export const generateFlashcardsFromNote = async (fileUrl: string, mimeType: string, language: string = 'en'): Promise<GeneratedFlashcard[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
  }

  console.log(`[Flashcard Service] Fetching note file from: ${fileUrl}`);

  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to download note file from Cloudinary. Status: ${fileResponse.statusText}`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  const isTr = language.toLowerCase() === 'tr';
  const prompt = `You are an expert academic assistant.
Please generate a set of flashcards based on the provided study note.

CRITICAL LANGUAGE INSTRUCTION:
The flashcards MUST be written in ${isTr ? 'TURKISH (Türkçe)' : 'ENGLISH'}.
(ÖNEMLİ UYARI: Oluşturacağın bilgi kartlarındaki soru ("front") ve cevaplar ("back") KESİNLİKLE tamamen ${isTr ? 'Türkçe' : 'İngilizce'} olmalıdır. Metni başka bir dile çevirme!)

Each flashcard should have a 'front' (the question, term, or concept) and a 'back' (the answer, definition, or explanation).
Generate between 5 to 15 flashcards depending on the note's length and complexity. Keep the text concise and easy to read.

Return the result STRICTLY as a JSON array of objects, where each object has a "front" and "back" string property.
Do NOT wrap the JSON in Markdown formatting like \`\`\`json. Just return the raw JSON array.`;

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
  };

  const response = await fetch(geminiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Flashcard Service] API Error details:`, errorBody);
    throw new Error(`Gemini API returned status ${response.status}: ${response.statusText}`);
  }

  const result = await response.json() as any;
  let generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error('Failed to extract generated text from Gemini API response.');
  }

  // Clean up potential markdown formatting if Gemini still includes it despite the prompt
  generatedText = generatedText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const flashcards: GeneratedFlashcard[] = JSON.parse(generatedText);
    if (!Array.isArray(flashcards)) {
      throw new Error("Parsed JSON is not an array");
    }
    return flashcards;
  } catch (error) {
    console.error('[Flashcard Service] Failed to parse JSON from Gemini:', generatedText);
    throw new Error('Failed to parse the generated flashcards as JSON.');
  }
};
