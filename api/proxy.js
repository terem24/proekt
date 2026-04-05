export default async function handler(req, res) {
  // 1. Настройка CORS, чтобы ваш сайт мог обращаться к этому прокси
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-goog-api-client, x-goog-api-key'
  );

  // Обработка Preflight запроса (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. Формируем URL к оригинальному API Gemini
    // Берем путь из запроса к Vercel и приклеиваем к Google API
    const targetPath = req.url.replace('/api/proxy', ''); 
    const targetUrl = `https://generativelanguage.googleapis.com${targetPath}`;

    // 3. Проксируем запрос
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Если ключ не зашит в URL, его можно пробросить через заголовки
        'x-goog-api-key': req.headers['x-goog-api-key'] || '' 
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error', details: error.message });
  }
}