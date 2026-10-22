import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ChatInput from '@/modules/chat/components/ChatInput';

jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));
jest.mock('@/modules/chat/components/ChatUserInfo', () => ({
  __esModule: true,
  default: () => null,
}));

it('keeps failed text for retry and clears it only after a successful send', async () => {
  const send = jest
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(undefined);
  render(<ChatInput onSendMessage={send} />);
  const input = screen.getByRole('textbox');
  const form = input.closest('form');
  if (!form) throw new Error('Missing message form');
  fireEvent.change(input, { target: { value: 'keep this message' } });
  fireEvent.submit(form);
  await waitFor(() => expect(input).toBeEnabled());
  expect(input).toHaveValue('keep this message');
  fireEvent.submit(form);
  await waitFor(() => expect(input).toHaveValue(''));
  expect(send).toHaveBeenCalledTimes(2);
});
