import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';

import ContactForm from '@/modules/contact/components/ContactForm';

jest.mock('axios');
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));

it('keeps entered text on failed delivery and clears it on success', async () => {
  const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
  jest
    .mocked(axios.post)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ status: 200, data: {} });
  const { container } = render(<ContactForm />);
  const name = container.querySelector<HTMLInputElement>('input[name="name"]')!;
  const email = container.querySelector<HTMLInputElement>(
    'input[name="email"]',
  )!;
  const message = container.querySelector<HTMLTextAreaElement>('textarea')!;
  fireEvent.change(name, { target: { value: 'Visitor' } });
  fireEvent.change(email, { target: { value: 'a@example.com' } });
  fireEvent.change(message, { target: { value: 'hello' } });
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  expect(message).toHaveValue('hello');
  expect(screen.getByRole('button')).not.toHaveTextContent('Sending');
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(message).toHaveValue(''));
  expect(alert).toHaveBeenCalledTimes(2);
  alert.mockRestore();
});
