exports.handler = async function(event) {

  // Allow preflight OPTIONS requests from GitHub Pages
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin':  'https://beanmatt.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let code, redirect_uri;
  try {
    const body = JSON.parse(event.body);
    code         = body.code;
    redirect_uri = body.redirect_uri;
  } catch(e) {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }

  if (!code || !redirect_uri) {
    return { statusCode: 400, body: 'Missing code or redirect_uri' };
  }

  const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { statusCode: 500, body: 'Server misconfigured — env vars missing' };
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code:          code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  redirect_uri,
        grant_type:    'authorization_code'
      }).toString()
    });

    const data = await response.json();

    if (!data.access_token) {
      const detail = data.error
        ? (data.error + ': ' + (data.error_description || ''))
        : JSON.stringify(data);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': 'https://beanmatt.github.io' },
        body: JSON.stringify({ error: detail })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type':               'application/json',
        'Access-Control-Allow-Origin': 'https://beanmatt.github.io'
      },
      body: JSON.stringify({
        access_token:  data.access_token,
        refresh_token: data.refresh_token || '',
        expires_in:    data.expires_in    || 3600
      })
    };

  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'https://beanmatt.github.io' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
