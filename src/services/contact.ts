import axios from 'axios';

import { contactProviderSchema } from '@/common/schemas/contact';

const FORM_URL = 'https://api.web3forms.com/submit';

export const sendMessage = async (formData: FormData) => {
  const response = await axios.post<unknown>(FORM_URL, formData);
  const status = response?.status;

  if (status >= 400) {
    return {
      status,
      message: response?.statusText,
    };
  }

  const data = contactProviderSchema.parse(response.data);

  return {
    status,
    data,
  };
};
