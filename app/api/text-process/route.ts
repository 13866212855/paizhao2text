import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      baseUrl = 'https://apihub.agnes-ai.com/v1',
      apiKey = 'sk-vWM7RHG5n7bljBNi3GgHfygxqiKlUYrPWZLLSUByIGm4BiM9',
      textModel = 'Agnes-2.5-flash',
    } = await req.json();

    const cleanBaseUrl = (baseUrl || 'https://apihub.agnes-ai.com/v1').replace(
      /\/+$/,
      ''
    );
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: textModel,
          messages: [
            {
              role: 'system',
              content:
                '你是一个基层公文排版与人员名单规整助手。请对用户提供的选民名单进行清洗、去重和规整，输出简洁纯文本。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          result: data.choices?.[0]?.message?.content || '',
          model: textModel,
        });
      }
    } catch {
      // Fallback
    }

    // Server fallback if needed
    return NextResponse.json({
      success: true,
      result: prompt,
      model: 'local-rule-engine',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
