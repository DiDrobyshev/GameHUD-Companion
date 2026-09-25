export async function translateText(
  text: string,
  targetLang: string = 'ru',
  sourceLang: string = 'auto'
): Promise<string> {
  if (!text || !text.trim()) return '';

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.trim())}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ошибка сети: ${response.statusText} (${response.status})`);
  }

  const data = await response.json();
  // Google возвращает массив вида: [[["переведенный кусок", "исходный", ...], ...]]
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0]
      .map((item: any) => (Array.isArray(item) ? item[0] : ''))
      .filter(Boolean)
      .join('');
  }

  throw new Error('Не удалось разобрать ответ переводчика');
}
