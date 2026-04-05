// Отключаем встроенный парсер Vercel, чтобы проксировать бинарные файлы (PDF, изображения)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // 1. Обработка CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, PATCH, DELETE, POST, PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-goog-api-client, x-goog-api-key, X-Goog-Upload-Command, X-Goog-Upload-Header-Content-Length, X-Goog-Upload-Header-Content-Type, X-Goog-Upload-Offset, X-Goog-Upload-Protocol'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. Формируем URL
    let targetPath = req.url.replace('/api/proxy', '');

    // Заменяем dummy-key на реальный ключ из переменных окружения Vercel
    const apiKey = process.env.GEMINI_API_KEY || '';
    targetPath = targetPath.replace('dummy-key', apiKey);

    const targetUrl = `https://generativelanguage.googleapis.com${targetPath}`;

    // 3. Подготавливаем заголовки для отправки в Google
    const fetchHeaders = { ...req.headers };
    // Удаляем заголовки, которые могут вызвать конфликт (например, хост Vercel)
    delete fetchHeaders.host;
    delete fetchHeaders.connection;

    // 4. Отправляем запрос (проксируем как есть)
    const fetchOptions = {
      method: req.method,
      headers: fetchHeaders,
    };

    // Если это не GET и не HEAD, передаем само тело запроса как поток
    if (!['GET', 'HEAD'].includes(req.method)) {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half'; // Обязательный параметр в Node.js 18+ для передачи потока в fetch
    }

    const response = await fetch(targetUrl, fetchOptions);

    // 5. Возвращаем заголовки обратно клиенту
    response.headers.forEach((value, key) => {
      // Исправление для Resumable Upload: меняем URL Google обратно на наш прокси
      if (key.toLowerCase() === 'x-goog-upload-url' || key.toLowerCase() === 'location') {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const proxyBaseUrl = `${protocol}://${host}/api/proxy`;

        const newUrl = value.replace('https://generativelanguage.googleapis.com', proxyBaseUrl);
        res.setHeader(key, newUrl);
      } else if (key.toLowerCase() !== 'content-encoding') {
        // Игнорируем content-encoding, чтобы Vercel сам управлял сжатием
        res.setHeader(key, value);
      }
    });

    // 6. Отдаем ответ клиенту
    res.status(response.status);

    // Преобразуем ответ в буфер и отправляем
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Proxy Error', details: error.message });
  }
}