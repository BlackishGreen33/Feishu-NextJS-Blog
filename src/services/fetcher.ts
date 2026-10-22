import axios from 'axios';

export const fetchValidated = async <T>(
  url: string,
  parse: (value: unknown) => T,
): Promise<T> => {
  const { data } = await axios.get<unknown>(url);
  return parse(data);
};
