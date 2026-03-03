export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  const targetUrl = `https://animeheaven.me${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const contentType = response.headers.get("content-type") || "text/html";
    const body = await response.arrayBuffer();

    // For HTML content, rewrite links to go through our proxy
    if (contentType.includes("text/html")) {
      const text = new TextDecoder().decode(body);
      const rewritten = rewriteHtml(text, url.origin);
      return new Response(rewritten, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch content", details: error.message }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

function rewriteHtml(html, origin) {
  const proxyBase = `${origin}/.netlify/functions/proxy?path=`;

  // Rewrite href and src attributes to go through the proxy
  let rewritten = html
    .replace(/(href|src|action)="(\/[^"]*?)"/gi, (match, attr, path) => {
      return `${attr}="${proxyBase}${encodeURIComponent(path)}"`;
    })
    .replace(/(href|src|action)='(\/[^']*?)'/gi, (match, attr, path) => {
      return `${attr}='${proxyBase}${encodeURIComponent(path)}'`;
    });

  // Inject a base-style script to handle dynamically loaded content
  const helperScript = `
<script>
  // Intercept clicks on links to route through proxy
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href) {
      const url = new URL(link.href, window.location.origin);
      if (url.hostname === window.location.hostname && !url.pathname.startsWith('/.netlify/')) {
        e.preventDefault();
        window.location.href = '${proxyBase}' + encodeURIComponent(url.pathname + url.search);
      }
    }
  });
</script>
`;

  rewritten = rewritten.replace("</body>", helperScript + "</body>");
  return rewritten;
}

export const config = {
  path: "/.netlify/functions/proxy",
};
