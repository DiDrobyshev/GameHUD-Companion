import { AIConfig, ChatMessage } from '../types';

export const DEFAULT_AI_SYSTEM_INSTRUCTION = `Ты — универсальный интеллектуальный игровой напарник и ассистент игрока (GameHUD Companion). Твоя первостепенная цель — помогать игроку побеждать, быстро находить актуальную информацию по любым играм, экономить время и делать игровой процесс максимально комфортным.

ОСНОВНЫЕ ОБЯЗАННОСТИ В ИГРАХ:
1. Гайды, билды и мета: составление оптимальных сборок снаряжения, прокачка талантов, распределение характеристик, ротации умений, синергия способностей для любых классов и персонажей.
2. Игровые механики и расчеты: формулы урона, сопротивления, шанс крита, условия спавна боссов, тайминги респауна, таблицы дропа и шансы выпадения редких предметов.
3. Секреты и прохождение: поиск скрытых локаций, решение головоломок, прохождение трудных квестов, поиск пасхалок и коллекционных предметов.
4. Игровой перевод и OCR: перевод диалогов, описаний предметов, способностей и лора с английского, японского, китайского и корейского языков на живой, естественный русский язык с сохранением игрового контекста и общепринятой игровой терминологии.
5. Игровой сленг: свободное владение понятиями DPS, AoE, DOT, aggro, cooldown, proc, nerf/buff, RNG, i-frames, mob, loot, aggro-pull и т.д.

ФОРМАТ ОТВЕТОВ:
- Отвечай емко, точно и по существу, без пустых вступительных фраз и воды.
- Структурируй ответы списками, таблицами или жирным шрифтом для мгновенного чтения краем глаза во время игры.
- Если вопрос требует конкретного решения — дай четкую пошаговую инструкцию или числовой вывод.

ГИБКОСТЬ И АДАПТИВНОСТЬ (УХОД ОТ ИНСТРУКЦИИ ПРИ НЕОБХОДИМОСТИ):
- Если пользователь задает вопрос вне игровой тематики (программирование, скрипты, настройка Windows/ПК, сетевые проблемы, математика, общий перевод, технические неполадки, бытовые или повседневные вопросы) — НЕМЕДЛЕННО выходи из амплуа исключительно игрового напарника и отвечай как разносторонний, глубокий и высококвалифицированный технический эксперт.
- Никогда не отказывай в ответе со словами «я только игровой помощник». При любых нештатных вопросах, системных проблемах или ошибках адаптируйся к запросу игрока и предоставь полное, исчерпывающее и практическое решение.`;

export async function sendAIMessage(
  prompt: string,
  history: ChatMessage[],
  config: AIConfig,
  imageBase64?: string
): Promise<string> {
  const { provider, apiKey, modelName, customEndpoint, webSearchEnabled, systemPrompt: customPrompt } = config;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('API-ключ не настроен. Нажмите ⚙ (Настройки) в шапке окна и введите ваш ключ.');
  }

  const systemPrompt =
    customPrompt && customPrompt.trim() ? customPrompt.trim() : DEFAULT_AI_SYSTEM_INSTRUCTION;

  const isGemini = provider === 'Gemini' || provider === 'Gemini 2.5 Flash';
  const isOpenRouter = provider === 'OpenRouter' || provider === 'OpenRouter (Любая модель)';

  if (isGemini) {
    const model = modelName.trim() || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    // Format previous messages for Gemini
    const contents: any[] = [];
    const recent = history.slice(-6);
    for (const msg of recent) {
      const parts: any[] = [];
      if (msg.imageBase64) {
        const cleanData = msg.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanData,
          },
        });
      }
      parts.push({ text: msg.content });
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts,
      });
    }

    // Add current user prompt
    const userParts: any[] = [];
    if (imageBase64) {
      const cleanData = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      userParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanData,
        },
      });
    }
    userParts.push({ text: prompt });

    contents.push({
      role: 'user',
      parts: userParts,
    });

    const body: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    };

    if (webSearchEnabled) {
      body.tools = [{ googleSearch: {} }];
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ошибка Gemini API (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error('Gemini не вернул ответ. Проверьте запрос или фильтры безопасности.');
    }

    return candidate.content.parts.map((p: any) => p.text || '').join('');
  }

  if (isOpenRouter) {
    const baseModel = modelName.trim() || 'google/gemini-2.5-flash';
    const model = webSearchEnabled && !baseModel.includes(':online') ? `${baseModel}:online` : baseModel;
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const formatMessageContent = (text: string, img?: string) => {
      if (!img) return text;
      const imageUrl = img.startsWith('data:') ? img : `data:image/png;base64,${img}`;
      return [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: imageUrl } },
      ];
    };

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((m) => ({
        role: m.role,
        content: formatMessageContent(m.content, m.imageBase64),
      })),
      { role: 'user', content: formatMessageContent(prompt, imageBase64) },
    ];

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://gamehud.local',
        'X-Title': 'GameHUD Companion',
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ошибка OpenRouter (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter вернул пустой ответ.');
    }
    return content;
  }

  // Custom OpenAI-compatible
  const baseUrl = (customEndpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const model = modelName.trim() || 'gpt-4o-mini';

  const formatMessageContent = (text: string, img?: string) => {
    if (!img) return text;
    const imageUrl = img.startsWith('data:') ? img : `data:image/png;base64,${img}`;
    return [
      { type: 'text', text },
      { type: 'image_url', image_url: { url: imageUrl } },
    ];
  };

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.role,
      content: formatMessageContent(m.content, m.imageBase64),
    })),
    { role: 'user', content: formatMessageContent(prompt, imageBase64) },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ошибка API (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('API вернуло пустой ответ.');
  }
  return content;
}
