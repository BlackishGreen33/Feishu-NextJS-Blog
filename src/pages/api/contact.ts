import { NextApiRequest, NextApiResponse } from 'next';

import {
  contactConfigSchema,
  contactRequestSchema,
} from '@/common/schemas/contact';
import { getServerEnv } from '@/server/env';
import { sendMessage } from '@/services/contact';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { formData } = contactRequestSchema.parse(req.body as unknown);
    const { contactFormApiKey } = getServerEnv();
    const { apiKey } = contactConfigSchema.parse({ apiKey: contactFormApiKey });

    const updatedFormData = new FormData();
    updatedFormData.append('access_key', apiKey);

    for (const [key, value] of Object.entries(formData)) {
      updatedFormData.append(key, value);
    }

    const response = await sendMessage(updatedFormData);

    res.status(200).json({ status: 200, message: response?.data?.message });
  } catch {
    res.status(500).json({ error: 'Something went wrong!' });
  }
}
