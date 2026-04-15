# Project 9: L'Oréal Routine Builder

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Cloudflare Worker Setup

This project includes a proxy worker at `cloudflare-worker.js`. Deploy it to Cloudflare Workers and set the following environment variable:

- `OPENAI_API_KEY` — your OpenAI API key.

After deployment, update the `WORKER_ENDPOINT` constant in `script.js` to your worker URL.

The worker accepts POST requests containing `messages` and forwards them to OpenAI's chat completions endpoint.
