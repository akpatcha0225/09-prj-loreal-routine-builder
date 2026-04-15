addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("Missing OpenAI API key", { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const model = body.model || "gpt-4o";
  const messages = body.messages;

  if (!Array.isArray(messages)) {
    return new Response("Missing messages array", { status: 400 });
  }

  const openAiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 650,
      }),
    },
  );

  const data = await openAiResponse.text();
  return new Response(data, {
    status: openAiResponse.status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  });
}
