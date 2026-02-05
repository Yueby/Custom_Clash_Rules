/**
 * 代理过滤结果
 */
export interface ProxyFilterResult {
  /** 静态代理列表（以 [] 开头的） */
  staticProxies: string[];
  /** 正则代理列表 */
  regexProxies: string[];
}

/**
 * Twemoji API 类型
 */
export interface TwemojiAPI {
  parse: (
    node: HTMLElement | string,
    options?: {
      folder?: string;
      ext?: string;
      className?: string;
    }
  ) => string;
}

// 注意：Window.twemoji 类型已在 ini-editor.ts 中声明

export {};
