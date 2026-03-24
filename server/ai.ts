/**
 * AI Service — abstracted behind this module so any LLM provider can be swapped in.
 * Currently uses OpenAI (gpt-4o). Set OPENAI_API_KEY in your environment.
 * To switch providers later, only this file needs to change.
 */

interface GenerateContentInput {
  specialty: string;
  contentType: string;
  goal: string;
  tone: string;
  customIdea?: string;  // Optional seasonal/holiday prompt override
  practiceName?: string;
  city?: string;
  // Brand identity context
  brandFeel?: string;
  brandVoice?: string;
  targetAudience?: string;
  uniqueSellingPoint?: string;
  brandColors?: string;
}

interface GeneratedContent {
  caption: string;
  hashtags: string; // comma-separated
  imagePrompt: string;
}

interface ImproveContentInput {
  caption: string;
  contentType: string;
  goal: string;
  tone: string;
  instructions?: string;
}

// ─── OpenAI Helper ────────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Return mock data if no API key configured
    return getMockResponse(userPrompt);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = (await response.json()) as any;
  return data.choices[0].message.content as string;
}

// ─── Mock Data (used when no API key is set) ──────────────────────────────────

function getMockResponse(prompt: string): string {
  if (prompt.includes("GENERATE_CONTENT")) {
    return JSON.stringify({
      caption: "Transform your smile with our cutting-edge treatments! ✨ Our expert team is dedicated to giving you the confidence you deserve. Whether you're looking for a subtle refresh or a complete transformation, we're here every step of the way. Book your complimentary consultation today and discover what's possible for your smile!\n\nLimited appointments available this month — don't miss out!",
      hashtags: "#SmileTransformation,#DentalCare,#HealthySmile,#CosmeticDentistry,#SmileGoals,#DentalHealth,#TeethWhitening,#NewSmile",
      imagePrompt: "A bright, clean dental office with modern equipment. A patient sitting in the chair with a beautiful, confident smile, looking into a mirror held by a friendly dentist in professional attire. Soft, warm lighting. High-end, editorial photography style. Clean white and soft blue tones.",
    });
  }
  if (prompt.includes("IMPROVE_CONTENT")) {
    return "Transform your smile with our state-of-the-art treatments! ✨ Our highly skilled team is passionate about helping you achieve the confidence that comes with a beautiful smile. Whether you're considering a subtle enhancement or a complete smile makeover, our personalized approach ensures results that exceed your expectations.\n\nSpots are filling up fast — secure your complimentary consultation today!";
  }
  return "Mock response";
}

// ─── Main Functions ───────────────────────────────────────────────────────────

export async function generateContent(input: GenerateContentInput): Promise<GeneratedContent> {
  const system = `You are an expert healthcare marketing copywriter specializing in social media content for medical and aesthetic practices. You create compelling, compliant, and engaging content that resonates with patients. Always produce results as valid JSON only, with no markdown code fences.`;

  // Build practice context block — include brand identity if available
  const lines: string[] = [];
  if (input.practiceName) {
    lines.push(`Practice Name: ${input.practiceName}${input.city ? ` (${input.city})` : ""}`);
  }
  if (input.brandFeel) lines.push(`Brand Feel / Aesthetic: ${input.brandFeel}`);
  if (input.brandVoice) lines.push(`Brand Voice & Personality: ${input.brandVoice}`);
  if (input.targetAudience) lines.push(`Target Audience: ${input.targetAudience}`);
  if (input.uniqueSellingPoint) lines.push(`What Makes This Practice Unique: ${input.uniqueSellingPoint}`);
  if (input.brandColors) lines.push(`Brand Colors (for image prompt guidance): ${input.brandColors}`);

  const brandContext = lines.length > 0
    ? `PRACTICE BRAND CONTEXT:\n${lines.join("\n")}\n`
    : "";

  const customIdeaLine = input.customIdea
    ? `\nSEASONAL/HOLIDAY IDEA TO INCORPORATE: ${input.customIdea}\n`
    : "";

  const user = `GENERATE_CONTENT

${brandContext}${customIdeaLine}
Specialty: ${input.specialty}
Content Type: ${input.contentType}
Goal: ${input.goal}
Tone: ${input.tone}

Generate social media content that reflects the brand context above${input.customIdea ? " and is specifically themed around the seasonal/holiday idea provided" : ""}. Return ONLY valid JSON with this exact structure:
{
  "caption": "The full post caption or script (2-4 paragraphs for posts, scene-by-scene for Reel scripts). Use appropriate emojis. Write in the practice's brand voice if specified.",
  "hashtags": "8-10 relevant hashtags as comma-separated values with # prefix",
  "imagePrompt": "A detailed image generation prompt (2-3 sentences) describing the ideal visual for this post. Incorporate the practice's brand colors and aesthetic feel. Be specific about lighting, style, mood, and subject matter appropriate for a ${input.specialty} practice."
}`;

  const raw = await callOpenAI(system, user);

  try {
    // Strip any markdown fences in case model adds them
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as GeneratedContent;
  } catch {
    // Fallback parse attempt
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as GeneratedContent;
    }
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ─── Before & After Caption ──────────────────────────────────────────────────

interface BeforeAfterInput {
  treatment: string;
  tone: string;
  specialty: string;
  practiceName?: string;
  brandFeel?: string;
  brandVoice?: string;
  targetAudience?: string;
  uniqueSellingPoint?: string;
}

export async function generateBeforeAfterCaption(
  input: BeforeAfterInput
): Promise<{ caption: string; hashtags: string }> {
  const system = `You are an expert healthcare marketing copywriter specializing in before & after transformation posts for medical and aesthetic practices. Write compelling, compliant copy that celebrates patient results without making medical claims. Always return valid JSON only, no markdown fences.`;

  const lines: string[] = [];
  if (input.practiceName) lines.push(`Practice: ${input.practiceName}`);
  if (input.brandFeel) lines.push(`Brand Feel: ${input.brandFeel}`);
  if (input.brandVoice) lines.push(`Brand Voice: ${input.brandVoice}`);
  if (input.targetAudience) lines.push(`Target Audience: ${input.targetAudience}`);
  if (input.uniqueSellingPoint) lines.push(`What Makes Them Unique: ${input.uniqueSellingPoint}`);
  const brandContext = lines.length > 0 ? `PRACTICE CONTEXT:\n${lines.join("\n")}\n` : "";

  const user = `GENERATE_BA_CAPTION

${brandContext}
Specialty: ${input.specialty}
Treatment: ${input.treatment}
Tone: ${input.tone}

Write a compelling before & after social media caption that:
- Celebrates the transformation and patient journey
- Uses the practice's brand voice if specified
- Includes a soft call-to-action (book a consultation)
- Does NOT make specific medical claims or guarantees
- Is warm, inspiring, and authentic

Return ONLY valid JSON:
{
  "caption": "The full post caption (2-3 paragraphs, relevant emojis, ends with CTA)",
  "hashtags": "8-12 relevant hashtags as comma-separated values with # prefix, mix of transformation, specialty, and practice hashtags"
}`;

  const raw = await callOpenAI(system, user);

  // Mock fallback check
  if (raw.includes('"caption"') && raw.includes('"hashtags"')) {
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
    }
  }

  // Inline mock if no API key
  return {
    caption: `The results speak for themselves. ✨ This incredible ${input.treatment} transformation is exactly why we do what we do — helping our patients feel their most confident, radiant selves.\n\nEvery journey is unique, and we're honored to be part of this one. From the very first consultation to the final reveal, our team is with you every step of the way.\n\nReady to start your own transformation? Book a complimentary consultation today and let's talk about what's possible for you. 💜`,
    hashtags: `#BeforeAndAfter,#${input.treatment.replace(/\s+/g, "")},#Transformation,#${input.specialty.replace(/\s+/g, "")}Results,#GlowUp,#ConfidenceBoost,#PatientResults,#BeforeAfter,#AestheticResults,#TransformationTuesday`,
  };
}

export async function improveContent(input: ImproveContentInput): Promise<string> {
  const system = `You are an expert healthcare marketing copywriter. Your job is to refine and improve social media captions for medical and aesthetic practices. Make the content more engaging, compelling, and tailored to the target audience. Return only the improved caption text — no explanations, no JSON.`;

  const user = `IMPROVE_CONTENT

Content Type: ${input.contentType}
Goal: ${input.goal}
Tone: ${input.tone}
${input.instructions ? `Special instructions: ${input.instructions}` : "Make it more engaging and compelling."}

Current caption to improve:
${input.caption}

Return only the improved caption text.`;

  return callOpenAI(system, user);
}
