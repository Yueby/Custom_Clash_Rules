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
    if (
      source.includes("[]GEOSITE") ||
      source.includes("[]GEOIP") ||
      source.includes("[]FINAL")
    ) {
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
