import { NextApiRequest, NextApiResponse } from 'next';

import { getServerEnv } from '@/server/env';
import { sendMessage } from '@/services/contact';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { formData } = req.body;
    const { contactFormApiKey } = getServerEnv();

    const updatedFormData = new FormData();
    updatedFormData.append('access_key', contactFormApiKey);

    for (const key in formData) {
      updatedFormData.append(key, formData[key]);
    }

    const response = await sendMessage(updatedFormData);

    res.status(200).json({ status: 200, message: response?.data?.message });
  } catch (_error) {
    res.status(500).json({ error: 'Something went wrong!' });
  }
}
