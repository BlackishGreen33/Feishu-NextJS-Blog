import type { Block } from 'feishu-docx/dist/index.js';

import type { FeishuBlockInput, FeishuTextElement } from './feishu-schema';
type FeishuBlockLike = FeishuBlockInput;
type FeishuTextBlockLike = NonNullable<FeishuBlockLike['text']>;
const SOURCE_SYNCED_BLOCK_TYPE = 49;
const SYNCED_BLOCK_TYPE = 999;

const getTextContainers = (block: FeishuBlockLike): FeishuTextBlockLike[] =>
  [
    block.text,
    block.heading1,
    block.heading2,
    block.heading3,
    block.heading4,
    block.heading5,
    block.heading6,
    block.heading7,
    block.heading8,
    block.heading9,
    block.quote,
    block.ordered,
    block.bullet,
    block.todo,
  ].filter((value) => value !== undefined);

const formatReminderText = (timestamp?: string) => {
  if (!timestamp) {
    return ' 截止提醒';
  }

  const date = new Date(Number(timestamp));

  if (Number.isNaN(date.getTime())) {
    return ' 截止提醒';
  }

  return ` ${date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  })}`;
};

const resolveUserNames = async (
  blocks: FeishuBlockLike[],
  getUserName: (openId: string) => Promise<string | null>,
) => {
  const openIds = new Set<string>();

  blocks.forEach((block) => {
    getTextContainers(block).forEach((container) => {
      container.elements?.forEach((element) => {
        if (element.mention_user?.user_id) {
          openIds.add(element.mention_user.user_id);
        }
      });
    });
  });

  if (openIds.size === 0) {
    return new Map<string, string>();
  }

  const resolved = new Map<string, string>();

  try {
    for (const openId of openIds) {
      const name = await getUserName(openId);

      if (name) {
        resolved.set(openId, name);
      }
    }
  } catch {
    return resolved;
  }

  return resolved;
};

const normalizeElement = (
  element: FeishuTextElement,
  userNames: Map<string, string>,
): FeishuTextElement => {
  if (element.mention_user) {
    return {
      text_run: {
        content: `@${userNames.get(element.mention_user.user_id) || '成员'}`,
        text_element_style: element.mention_user.text_element_style,
      },
    };
  }

  if (element.reminder) {
    return {
      text_run: {
        content: formatReminderText(
          element.reminder.expire_time || element.reminder.notify_time,
        ),
        text_element_style: element.reminder.text_element_style,
      },
    };
  }

  return element;
};

export const normalizeFeishuBlocks = async (
  blocks: FeishuBlockLike[],
  getUserName: (openId: string) => Promise<string | null>,
) => {
  const typedBlocks = blocks;
  const userNames = await resolveUserNames(typedBlocks, getUserName);

  return typedBlocks.map((block) => {
    const normalized: FeishuBlockLike = { ...block };

    if (
      Number(normalized.block_type) === SOURCE_SYNCED_BLOCK_TYPE &&
      normalized.source_synced
    ) {
      normalized.block_type = SYNCED_BLOCK_TYPE;
    }

    (
      [
        'text',
        'heading1',
        'heading2',
        'heading3',
        'heading4',
        'heading5',
        'heading6',
        'heading7',
        'heading8',
        'heading9',
        'quote',
        'ordered',
        'bullet',
        'todo',
      ] as const
    ).forEach((key) => {
      const container = normalized[key];

      if (!container?.elements) {
        return;
      }

      normalized[key] = {
        ...container,
        elements: container.elements.map((element) =>
          normalizeElement(element, userNames),
        ),
      };
    });

    // Renderer types require mutually exclusive fields simultaneously.
    // The owned fields were parsed; extensions remain renderer-owned.
    return normalized as unknown as Block;
  });
};
