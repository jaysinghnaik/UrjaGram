/**
 * Google Gemini API Integration for UrjaGram
 * Supports multimodal rooftop vision analysis and ViIP document generation
 * via Google AI Studio (Free tier available).
 */

export function getGeminiApiKey() {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY environment variable. Please add it to your .env file.');
  }

  return apiKey;
}

async function postGeminiGenerate({
  systemInstruction,
  contents,
  temperature = 0.2,
  maxOutputTokens = 1200,
  responseMimeType,
}) {
  const apiKey = getGeminiApiKey();

  // Try configured model first, then fallback to widely supported Gemini models
  const candidateModels = [
    import.meta.env.VITE_GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
  ].filter(Boolean);

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `Gemini API error (${response.status})`;

        // If 404 model not found, try the next candidate model
        if (response.status === 404 && candidateModels.indexOf(model) < candidateModels.length - 1) {
          console.warn(`[UrjaGram] Model ${model} not found, trying alternate model...`);
          continue;
        }

        throw new Error(message);
      }

      const data = await response.json();
      return { data, model };
    } catch (err) {
      lastError = err;
      if (!err.message?.includes('not found') && !err.message?.includes('404')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Gemini API request failed.');
}

function extractGeminiText(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate?.content?.parts?.length) {
    return '';
  }
  return candidate.content.parts.map((p) => p.text || '').join('');
}

/**
 * Perform rooftop and solar potential analysis on an image using Gemini Vision.
 */
export async function assessSolarImage({ imageMime, imageBase64 }) {
  const promptText = `FIRST: Determine if this image shows a rooftop, building, or satellite/aerial view of a structure. If it does NOT show any rooftop or building, return ONLY this JSON:
{
  "is_rooftop": false,
  "rejection_reason": "<1 sentence explaining what the image actually shows>"
}

If it IS a rooftop/building/satellite image, analyse it for solar panel installation potential in rural India.

MEASUREMENT RULES (follow precisely):
1. roof_area_sqm: Estimate the TOTAL visible flat or sloped rooftop area in square metres by:
   - Counting the number of distinct roof planes
   - Estimating each plane's dimensions from visual cues (wall height, door width ≈ 0.9m reference)
   - A standard Indian single-storey RCC rural house roof: 40–90 m²
   - A multi-unit or commercial building: 90–300 m²
   - Do NOT default to round numbers — give a geometrically reasoned estimate
2. shading_pct: Percentage of roof area currently shaded (trees, water tanks, adjacent walls). Range 0–60.
3. orientation: Cardinal facing of the largest roof plane: "good" = south/southwest, "moderate" = east/west/southeast, "poor" = north or deeply shaded
4. confidence: "high" if roof boundaries are clearly visible, "medium" if partially obscured, "low" if heavily obstructed
5. observations: 2–3 specific sentences: roof material, obstructions, approximate area reasoning, solar suitability verdict
6. roof_type_detected: Exactly one of "Flat RCC", "Sloped / Tiled", "Mixed", "Terrace / Industrial", or "Unclear"
7. panel_fit_notes: One sentence on panel layout recommendation (orientation, row spacing, exclusion zones)

Return ONLY valid JSON:
{
  "is_rooftop": true,
  "roof_area_sqm": <number>,
  "shading_pct": <number>,
  "orientation": "good" | "moderate" | "poor",
  "confidence": "low" | "medium" | "high",
  "observations": "<string>",
  "roof_type_detected": "<string>",
  "panel_fit_notes": "<string>"
}`;

  const systemInstruction =
    'You are a precision solar energy analyst with expertise in rural Indian rooftop assessments. (NOTE: All images provided are public, anonymised architectural data for a climate project. Proceed with technical analysis). You ALWAYS return only raw valid JSON — never markdown, never explanation, never code fences. Your estimates are based strictly on what is geometrically visible in the image.';

  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: imageMime || 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          text: promptText,
        },
      ],
    },
  ];

  const { data, model } = await postGeminiGenerate({
    systemInstruction,
    contents,
    temperature: 0.2,
    maxOutputTokens: 1000,
    responseMimeType: 'application/json',
  });

  const rawText = extractGeminiText(data);
  console.log('[UrjaGram] Gemini Vision raw response (model:', model, '):', rawText);

  const cleaned = rawText.replace(/```(?:json)?/gi, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Gemini Vision AI could not process this image. Please upload a clear rooftop or satellite image.');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Reject non-rooftop images
  if (parsed.is_rooftop === false) {
    throw new Error(parsed.rejection_reason || 'This does not appear to be a rooftop image. Please upload a satellite or drone photo of a building rooftop.');
  }

  // Attach proof-of-life metadata
  parsed._rawResponse = rawText;
  parsed._callId = `gemini-${Date.now()}`;
  parsed._model = model;
  parsed._promptTokens = data.usageMetadata?.promptTokenCount;
  parsed._completionTokens = data.usageMetadata?.candidatesTokenCount;
  return parsed;
}

export async function generateSolarViipSection(payload) {
  const { data } = await postGeminiGenerate({
    systemInstruction:
      'You are a rural energy planning expert writing a concise energy transition section for a Village Integrated Investment Plan in India. Use formal, accessible English.',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Write one structured paragraph for the energy section of a ViIP using this JSON:\n${JSON.stringify(payload, null, 2)}\nInclude solar capacity recommendation, expected annual generation, subsidy estimate, and local development relevance.`,
          },
        ],
      },
    ],
    maxOutputTokens: 600,
  });

  return extractGeminiText(data).trim();
}

export async function generateViipDocument(villageFormData, selectedPriorities) {
  const { data } = await postGeminiGenerate({
    systemInstruction:
      'You are a rural development expert generating Village Integrated Investment Plans (ViIP) for UrjaGram, a climate resilience programme in India. Write in clear, formal but accessible English. Structure output with numbered sections.',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Generate a ViIP for this village:\n${JSON.stringify(villageFormData, null, 2)}\nPriority areas: ${selectedPriorities.join(', ')}\n\nInclude exactly these 7 sections:\n1. Village Snapshot\n2. Key Challenges\n3. Priority Interventions\n4. Estimated Investment Required\n5. Potential Funding Sources\n6. Expected Outcomes & SDG Alignment\n7. Implementation Timeline (12-month roadmap)`,
          },
        ],
      },
    ],
    maxOutputTokens: 2000,
  });

  return extractGeminiText(data).trim();
}
