export interface IniSection {
  name: string;
  config: Map<string, string>;
  rulesets: Ruleset[];
  proxyGroups: ProxyGroup[];
  rawLines: string[];
}

export interface Ruleset {
  name: string;
  source: string;
  interval?: string;
  type: "list" | "remote" | "builtin" | "local";
}

export interface ProxyGroup {
  name: string;
  type: string;
  proxies: string[];
  testUrl?: string;
  interval?: string;
  tolerance?: string; // For url-test
}

/**
 * 代理成员的结构化类型（可选使用）
 * 用于需要区分不同成员类型的场景
 */
export type ProxyMember =
  | { kind: "group"; name: string } // []GroupName
  | { kind: "regex"; pattern: string } // .* or other regex
  | { kind: "special"; value: "DIRECT" | "REJECT" }
  | { kind: "literal"; value: string }; // Other literals

/**
 * 解析代理成员字符串为结构化类型
 */
export function parseProxyMember(raw: string): ProxyMember {
  if (raw.startsWith("[]")) {
    const name = raw.slice(2);
    if (name === "DIRECT" || name === "REJECT") {
      return { kind: "special", value: name };
    }
    return { kind: "group", name };
  }
  if (raw.includes("*") || raw.includes("\\") || raw.startsWith("(")) {
    return { kind: "regex", pattern: raw };
  }
  return { kind: "literal", value: raw };
}

/**
 * 将结构化类型序列化回字符串
 */
export function stringifyProxyMember(member: ProxyMember): string {
  switch (member.kind) {
    case "group":
      return "[]" + member.name;
    case "special":
      return "[]" + member.value;
    case "regex":
      return member.pattern;
    case "literal":
      return member.value;
  }
}

/**
 * 判断代理成员是否为组引用
 */
export function isGroupReference(raw: string): boolean {
  return raw.startsWith("[]");
}

/**
 * 从代理成员字符串提取组名（如果是组引用）
 */
export function extractGroupName(raw: string): string | null {
  if (raw.startsWith("[]")) {
    return raw.slice(2);
  }
  return null;
}

/** 代理组类型选项 */
export const PROXY_GROUP_TYPES = [
  { value: "select", label: "手动选择", description: "手动切换节点" },
  { value: "url-test", label: "自动测速", description: "自动选择延迟最低的节点" },
  { value: "load-balance", label: "负载均衡", description: "将请求分散到多个节点" },
  { value: "fallback", label: "故障转移", description: "按顺序尝试节点直到可用" },
] as const;

export type ProxyGroupType = (typeof PROXY_GROUP_TYPES)[number]["value"];

export class SubconverterIniParser {
  static parse(content: string): IniSection[] {
    const lines = content.split(/\r?\n/);
    const sections: IniSection[] = [];
    let currentSection: IniSection | null = null;
    let globalSection: IniSection = {
      name: "Global",
      config: new Map(),
      rulesets: [],
      proxyGroups: [],
      rawLines: [],
    };
    sections.push(globalSection);
    currentSection = globalSection;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith(";")) {
        currentSection?.rawLines.push(line);
        continue;
      }

      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const sectionName = trimmed.slice(1, -1);
        currentSection = {
          name: sectionName,
          config: new Map(),
          rulesets: [],
          proxyGroups: [],
          rawLines: [line],
        };
        sections.push(currentSection);
        continue;
      }

      currentSection?.rawLines.push(line);

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();

      if (key === "ruleset") {
        currentSection?.rulesets.push(this.parseRuleset(value));
      } else if (key === "custom_proxy_group") {
        currentSection?.proxyGroups.push(this.parseProxyGroup(value));
      } else {
        currentSection?.config.set(key, value);
      }
    }

    return sections;
  }

  static parseRuleset(value: string): Ruleset {
    // Format: GroupName,ListSource
    // Example: 🎯 Global Direct,[]GEOSITE,private
    // Example: 🚀 Manual,https://...,86400
    const parts = value.split(",").map((s) => s.trim());
    const name = parts[0];
    const source = parts[1] || "";
    const interval = parts[2];

    let type: Ruleset["type"] = "remote";
    if (source.includes("[]GEOSITE") || source.includes("[]GEOIP") || source.includes("[]FINAL")) {
      type = "builtin";
    } else if (source.startsWith("http")) {
      type = "remote";
    } else {
      type = "local";
    }

    return { name, source, interval, type };
  }

  static parseProxyGroup(value: string): ProxyGroup {
    // Format: Name`Type`Proxy1`Proxy2`...`TestURL`Interval
    // Delimiter is usually `
    const parts = value.split("`").map((s) => s.trim());
    const name = parts[0];
    const type = parts[1];

    // The rest are proxies or config
    // We need to identify TestURL and Interval which are usually at the end if type is url-test
    // But sometimes they are just args
    // Heuristic: proxies usually start with [] or are regex string
    // Standard format for ACL4SSR:
    // Name`select`[]Proxy1`[]Proxy2`...
    // Name`url-test`.*`http://...`300,,50

    const proxies: string[] = [];
    let testUrl: string | undefined;
    let interval: string | undefined;

    // Scan parts from index 2
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("http://") || part.startsWith("https://")) {
        testUrl = part;
        if (i + 1 < parts.length) interval = parts[i + 1];
        break; // assume rest are config
      }
      if (/^\d+$/.test(part) && !interval) {
        interval = part;
        break;
      }
      if (part) {
        proxies.push(part);
      }
    }

    return { name, type, proxies, testUrl, interval };
  }

  static stringify(sections: IniSection[]): string {
    let output = "";

    for (const section of sections) {
      if (section.name !== "Global") {
        output += `\n[${section.name}]\n`;
      }

      // 1. Config Map
      for (const [key, value] of section.config) {
        output += `${key}=${value}\n`;
      }

      // 2. Rulesets
      for (const ruleset of section.rulesets) {
        let line = `ruleset=${ruleset.name},${ruleset.source}`;
        if (ruleset.interval) {
          line += `,${ruleset.interval}`;
        }
        output += `${line}\n`;
      }

      // 3. Proxy Groups
      for (const group of section.proxyGroups) {
        // Format: custom_proxy_group=Name`Type`Proxy1`Proxy2`...[`TestURL`Interval]
        const parts = [group.name, group.type, ...group.proxies];

        if (group.type === "url-test" && group.testUrl && group.interval) {
          parts.push(group.testUrl);
          parts.push(group.interval);
          if (group.tolerance) {
            parts.push(group.tolerance);
          }
        }

        output += `custom_proxy_group=${parts.join("`")}\n`;
      }
    }

    return output.trim();
  }
}
