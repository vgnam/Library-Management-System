// In a real deployment, this would come from env vars
export const API_BASE_URL = 'http://localhost:8000/api/v1'; 

// Placeholder for Gemini API Key - In production use process.env.API_KEY
// For this demo, we assume it's injected or available
export const GEMINI_API_KEY = process.env.API_KEY || ''; 

export const SYSTEM_INSTRUCTION = `You are a helpful and knowledgeable library assistant for the National Library. 
Your goal is to help users find books, explain borrowing rules (Standard: 5 books/45 days, VIP: 8 books/60 days), 
and assist with navigation. Be polite, concise, and encourage reading.`;