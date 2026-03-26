import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://github.com/google/antigravity', // Optional
        'X-Title': 'Discord Bot', // Optional
    }
});

export const generateResponse = async (prompt: string) => {
    try {
        const response = await openai.chat.completions.create({
            model: process.env.OPENROUTER_MODEL || 'openrouter/free',
            messages: [{ role: 'user', content: prompt }],
        });

        return response.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
    } catch (error) {
        console.error('OpenRouter API Error:', error);
        return 'Sorry, I encountered an error while processing your request.';
    }
};
