import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MeetingConstraints, MeetingDetails, User, TimeSlot } from "../types";

// Initialize Gemini
// Note: In a real app, never expose keys on the client. 
// This is for demonstration purposes or internal tool use where env vars are injected at build time.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const modelFlash = 'gemini-2.5-flash';

export const parseConstraints = async (text: string, referenceDate: Date): Promise<MeetingConstraints> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      durationMinutes: { type: Type.INTEGER, description: "Duration in minutes. Default to 60 if not specified." },
      startDate: { type: Type.STRING, description: "YYYY-MM-DD format. The earliest date mentioned." },
      endDate: { type: Type.STRING, description: "YYYY-MM-DD format. Optional latest date." },
      timeOfDay: { type: Type.STRING, enum: ['morning', 'afternoon', 'any'], description: "Preferred time of day." },
      excludedDays: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "Days of week to avoid (e.g., 'Friday')." 
      },
    },
    required: ["durationMinutes", "startDate"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelFlash,
      contents: `
        Current Date: ${referenceDate.toISOString()}
        User Request: "${text}"
        
        Extract the scheduling constraints from the user request. 
        If no specific date is mentioned, assume "tomorrow" as start date.
        If no duration is mentioned, assume 60 minutes.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a helpful scheduling assistant. precision is key."
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as MeetingConstraints;
    }
    throw new Error("No response from Gemini");
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    // Fallback default
    return {
      durationMinutes: 60,
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      timeOfDay: 'any'
    };
  }
};

export const generateCreativeDetails = async (
  organizer: User, 
  attendee: User, 
  slot: TimeSlot,
  context: string
): Promise<MeetingDetails> => {
  
  const prompt = `
    Organizer: ${organizer.name} (${organizer.role})
    Attendee: ${attendee.name} (${attendee.role})
    Time: ${slot.start.toLocaleString()}
    Duration: ${Math.round((slot.end.getTime() - slot.start.getTime()) / 60000)} minutes
    Context from user: "${context}"

    Generate a JSON object with:
    1. title: A professional but slightly creative meeting title suitable for a Roofing/Construction company.
    2. description: A 1-2 sentence professional description of the meeting agenda based on the context.
    3. location: Either "Google Meet" or "CMAC Office - Main Conf Room" based on context (default to Meet if unsure).
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      location: { type: Type.STRING }
    },
    required: ["title", "description", "location"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelFlash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as MeetingDetails;
    }
    throw new Error("No details generated");

  } catch (error) {
    return {
      title: `Meeting: ${organizer.name} & ${attendee.name}`,
      description: "Discussing project items.",
      location: "Google Meet"
    };
  }
};

export const rankAndExplainSlots = async (slots: TimeSlot[], constraints: MeetingConstraints): Promise<TimeSlot[]> => {
    // In a real scenario, we might send slots to Gemini to "humanize" the reason.
    // For this demo, we will simply return the slots as the generation of "reason" is done locally to save latency,
    // but we could use Gemini here if we wanted complex reasoning.
    return slots;
}
