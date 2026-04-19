const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Fallback orders if API fails or no key
const FALLBACK_ORDERS = [
  { drink: 'Iced Latte', mood: 'Just survived a shark meeting.' },
  { drink: 'Cappuccino', mood: 'Woke up on the wrong side of the reef.' },
  { drink: 'Hot Mocha', mood: 'Need warmth, the deep sea is cold.' },
  { drink: 'Espresso Shot', mood: 'Late for school, again.' },
  { drink: 'Matcha Latte', mood: 'Trying to be healthy this week.' },
  { drink: 'Caramel Frappe', mood: 'Treat myself, I earned it.' },
  { drink: 'Black Coffee', mood: 'No sleep, too many jellyfish parties.' },
  { drink: 'Chai Tea Latte', mood: 'Feeling cozy and philosophical.' },
  { drink: 'Vanilla Cold Brew', mood: 'The current was brutal today.' },
  { drink: 'Hot Chocolate', mood: 'Missing the warm waters up north.' },
  { drink: 'Iced Americano', mood: 'Boss yelled at me. Underwater.' },
  { drink: 'Strawberry Smoothie', mood: 'Just got dumped by a pufferfish.' },
];

let fallbackIndex = 0;
const orderQueue = [];
let isGenerating = false;

function getFallbackOrder() {
  const order = FALLBACK_ORDERS[fallbackIndex % FALLBACK_ORDERS.length];
  fallbackIndex++;
  return { drink: order.drink, mood: order.mood };
}

async function generateFromAPI() {
  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: 'You are a fish customer at an underwater cafe. Generate a JSON object with two fields: "drink" (a coffee/tea drink order, max 3 words) and "mood" (a funny 5-8 word sentence about your day as a fish and why you need this drink). Keep it short and witty. You have 40 tokens max. Respond ONLY with the JSON, no markdown.'
        }]
      }],
      generationConfig: {
        maxOutputTokens: 40,
        temperature: 1.2,
      }
    })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response');

  const parsed = JSON.parse(text);
  if (!parsed.drink || !parsed.mood) throw new Error('Bad format');
  return { drink: parsed.drink, mood: parsed.mood };
}

// Pre-generate orders so they're ready before NPCs arrive
async function fillQueue(count = 3) {
  if (isGenerating || !API_KEY) return;
  isGenerating = true;

  for (let i = orderQueue.length; i < count; i++) {
    try {
      const order = await generateFromAPI();
      orderQueue.push(order);
    } catch (e) {
      console.warn('Gemini API failed, using fallback:', e.message);
      orderQueue.push(getFallbackOrder());
    }
  }

  isGenerating = false;
}

// Get next order — pulls from pre-generated queue, falls back if empty
export function getNextOrder() {
  if (orderQueue.length > 0) {
    const order = orderQueue.shift();
    // Refill queue in background
    fillQueue(3);
    return order;
  }
  return getFallbackOrder();
}

// Start pre-generating orders immediately
export function startPreGenerating() {
  if (!API_KEY) {
    console.warn('No Gemini API key — using fallback orders');
    return;
  }
  fillQueue(3);
}
