/**
 * Renders the Sunsama login page HTML for the OAuth authorization flow.
 * Users enter their Sunsama email and password to authorize Claude.ai access.
 */
export function renderLoginPage(error?: string, oauthState?: string): string {
  const errorHtml = error
    ? `<div class="error">${escapeHtml(error)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in to Sunsama MCP</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      padding: 2rem;
      width: 100%;
      max-width: 400px;
    }
    h1 {
      font-size: 1.5rem;
      color: #1a1a2e;
      margin-bottom: 0.5rem;
      text-align: center;
    }
    .subtitle {
      color: #666;
      font-size: 0.9rem;
      text-align: center;
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #333;
      margin-bottom: 0.25rem;
    }
    input[type="email"], input[type="password"] {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      margin-bottom: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #4a90d9;
      box-shadow: 0 0 0 3px rgba(74,144,217,0.1);
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #4a90d9;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #3a7bc8; }
    button:active { background: #2d6bb3; }
    .error {
      background: #fee;
      color: #c33;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      border: 1px solid #fcc;
    }
    .note {
      color: #999;
      font-size: 0.75rem;
      text-align: center;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Sunsama MCP</h1>
    <p class="subtitle">Sign in with your Sunsama account to connect with Claude</p>
    ${errorHtml}
    <form method="POST" action="/authorize">
      <input type="hidden" name="oauthState" value="${escapeHtml(oauthState ?? "")}">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autocomplete="email" autofocus>
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password">
      <button type="submit">Sign in &amp; Authorize</button>
    </form>
    <p class="note">Your credentials are used only to authenticate with Sunsama and are not stored.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
