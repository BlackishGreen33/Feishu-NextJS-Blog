import { z } from 'zod';

export const feishuSourceConfigSchema = z.object({
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  spaceId: z.string().min(1),
});
export const feishuApiErrorSchema = z.looseObject({
  code: z.number().optional(),
  msg: z.string().optional(),
  error: z
    .looseObject({
      log_id: z.string().optional(),
      troubleshooter: z.string().optional(),
    })
    .optional(),
});
export type FeishuApiErrorPayload = z.infer<typeof feishuApiErrorSchema>;
export const feishuTokenSchema = feishuApiErrorSchema.extend({
  tenant_access_token: z.string().optional(),
  expire: z.number().optional(),
});
export const feishuWikiNodeSchema = z.looseObject({
  title: z.string(),
  node_token: z.string(),
  parent_node_token: z.string().optional(),
  has_child: z.boolean().optional(),
  space_id: z.string(),
  obj_type: z.string(),
  obj_token: z.string(),
  obj_create_time: z.union([z.string(), z.number()]).optional(),
  obj_edit_time: z.union([z.string(), z.number()]).optional(),
});
export type FeishuWikiNode = z.infer<typeof feishuWikiNodeSchema>;

const textStyle = z.looseObject({
  bold: z.boolean().optional(),
  inline_code: z.boolean().optional(),
  italic: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  underline: z.boolean().optional(),
  text_color: z.number().optional(),
  link: z.looseObject({ url: z.string() }).optional(),
});
export const feishuTextElementSchema = z.looseObject({
  text_run: z
    .looseObject({
      content: z.string().optional(),
      text_element_style: textStyle.optional(),
    })
    .optional(),
  mention_doc: z
    .looseObject({
      title: z.string(),
      token: z.string(),
      url: z.string().optional(),
    })
    .optional(),
  mention_user: z
    .looseObject({
      user_id: z.string(),
      text_element_style: textStyle.optional(),
    })
    .optional(),
  reminder: z
    .looseObject({
      expire_time: z.string().optional(),
      notify_time: z.string().optional(),
      text_element_style: textStyle.optional(),
    })
    .optional(),
});
const textBlock = z.looseObject({
  elements: z.array(feishuTextElementSchema).optional(),
});
// Extensions and non-text blocks pass through to the installed renderer.
export const feishuBlockSchema = z.looseObject({
  block_id: z.string(),
  block_type: z.number(),
  parent_id: z.string().optional(),
  children: z.array(z.string()).optional(),
  source_synced: z.record(z.string(), z.unknown()).optional(),
  text: textBlock.optional(),
  heading1: textBlock.optional(),
  heading2: textBlock.optional(),
  heading3: textBlock.optional(),
  heading4: textBlock.optional(),
  heading5: textBlock.optional(),
  heading6: textBlock.optional(),
  heading7: textBlock.optional(),
  heading8: textBlock.optional(),
  heading9: textBlock.optional(),
  quote: textBlock.optional(),
  ordered: textBlock.optional(),
  bullet: textBlock.optional(),
  todo: textBlock.optional(),
});
export type FeishuBlockInput = z.infer<typeof feishuBlockSchema>;
export type FeishuTextElement = z.infer<typeof feishuTextElementSchema>;

const page = <T extends z.ZodType>(item: T) =>
  z
    .looseObject({
      items: z.array(item),
      has_more: z.boolean().optional(),
      page_token: z.string().optional(),
    })
    .refine((value) => !value.has_more || Boolean(value.page_token), {
      error: 'Incomplete Feishu pagination',
      path: ['page_token'],
    });

export const feishuListNodesSchema = feishuApiErrorSchema.extend({
  data: page(feishuWikiNodeSchema),
});
export const feishuBlockListSchema = feishuApiErrorSchema.extend({
  data: page(feishuBlockSchema),
});
export const feishuNodeSchema = feishuApiErrorSchema.extend({
  data: z.looseObject({ node: feishuWikiNodeSchema.optional() }).optional(),
});
export const feishuDocumentSchema = feishuApiErrorSchema.extend({
  data: z
    .looseObject({
      document: z
        .looseObject({
          document_id: z.string(),
          title: z.string().optional(),
          revision_id: z.union([z.string(), z.number()]).optional(),
          latest_revision_id: z.union([z.string(), z.number()]).optional(),
          cover: z
            .looseObject({
              token: z.string().optional(),
              offset_ratio_x: z.number().optional(),
              offset_ratio_y: z.number().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});
export const feishuContactUserSchema = feishuApiErrorSchema.extend({
  data: z
    .looseObject({
      user: z.looseObject({ name: z.string().optional() }).optional(),
    })
    .optional(),
});
