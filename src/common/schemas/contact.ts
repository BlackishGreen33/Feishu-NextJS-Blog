import { z } from 'zod';

// Keep the browser's existing email policy (including a@b); do not add a TLD rule.
export const contactFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  message: z.string().min(1),
});
export type ContactFormData = z.infer<typeof contactFormSchema>;
export const contactRequestSchema = z.object({ formData: contactFormSchema });
export const contactProviderSchema = z.looseObject({
  message: z.string().optional(),
});
export const contactConfigSchema = z.object({ apiKey: z.string().min(1) });
