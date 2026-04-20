import { NextApiRequest, NextApiResponse } from 'next';

const LOGO_SOURCES: Record<
  string,
  { url: string; headers?: Record<string, string> }
> = {
  xyzq: {
    url: 'https://www.xyzq.com.cn/xysec/views/theme/img/favicon.ico',
    headers: {
      Referer: 'https://www.xyzq.com.cn/',
      'User-Agent': 'Mozilla/5.0',
    },
  },
  ccnu: {
    url: 'https://bkimg.cdn.bcebos.com/pic/f7246b600c338744ebf8b9f8df53cef9d72a61590ab8?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70',
    headers: {
      Referer: 'https://baike.baidu.com/',
      'User-Agent': 'Mozilla/5.0',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const key = String(req.query.key || '');
  const source = LOGO_SOURCES[key];

  if (!source) {
    return res.status(404).json({ error: 'Logo not found' });
  }

  try {
    const response = await fetch(source.url, {
      headers: source.headers,
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream failed' });
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=604800',
    );

    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch logo' });
  }
}
