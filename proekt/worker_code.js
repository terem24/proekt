export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 1. Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-goog-api-client, x-goog-api-key, x-goog-upload-protocol, x-goog-upload-command, x-goog-upload-header-content-length, x-goog-upload-header-content-type",
        },
      });
    }

    // 2. Point to Google API
    const targetUrl = new URL(url.pathname + url.search, "https://generativelanguage.googleapis.com");
    
    // 3. Inject NEW secure API Key (from Cloudflare Environment Secret or hardcoded)
    // Replace 'dummy-key' in URL with your real key
    const realApiKey = "AIzaSyCos8XcSLtIbYTSGgybMuGHB9DVka0Jo6Y";
    if (targetUrl.searchParams.get("key") === "dummy-key") {
      targetUrl.searchParams.set("key", realApiKey);
    }

    // 4. Proxy the request
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    try {
      const response = await fetch(newRequest);
      const newResponse = new Response(response.body, response);
      
      // 5. Add CORS headers to the response
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      return newResponse;
    } catch (e) {
      return new Response("Proxy Error: " + e.message, { status: 500 });
    }
  },
};
