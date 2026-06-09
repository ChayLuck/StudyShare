import * as dotenv from 'dotenv';
dotenv.config();

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export const generateFlashcardsFromNote = async (fileUrl: string, mimeType: string): Promise<GeneratedFlashcard[]> => {
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

  const prompt = `You are an expert academic assistant.
FIRST, detect the language of the provided study note (e.g., Turkish, English, etc.).
THEN, generate a set of flashcards based on the note.

CRITICAL LANGUAGE INSTRUCTION:
The flashcards MUST be written in the DETECTED LANGUAGE of the study note. 
Do NOT translate the content to English if the original text is in another language.
(ÖNEMLİ UYARI: Eğer yüklenen not Türkçe ise, oluşturacağın bilgi kartlarındaki soru ("front") ve cevaplar ("back") KESİNLİKLE tamamen Türkçe olmalıdır. Metni hiçbir şekilde İngilizceye çevirme!)

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
