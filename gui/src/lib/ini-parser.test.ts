import { describe, test, expect } from "vitest";
import {
  SubconverterIniParser,
  type ProxyGroup,
  parseProxyMember,
  stringifyProxyMember,
  isGroupReference,
  extractGroupName,
} from "./ini-parser";

describe("SubconverterIniParser", () => {
  describe("parse", () => {
    test("空内容返回只含 Global section 的数组", () => {
      const result = SubconverterIniParser.parse("");
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Global");
    });

    test("解析 section 头", () => {
      const content = `[custom]\nsome_key=value`;
      const result = SubconverterIniParser.parse(content);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((s) => s.name === "custom")).toBe(true);
    });

    test("解析 ruleset 行", () => {
      const content = `[custom]
ruleset=Proxy,https://example.com/rules.list`;
      const result = SubconverterIniParser.parse(content);
      const customSection = result.find((s) => s.name === "custom");
      expect(customSection?.rulesets.length).toBe(1);
      expect(customSection?.rulesets[0].name).toBe("Proxy");
      expect(customSection?.rulesets[0].source).toBe("https://example.com/rules.list");
    });

    test("解析 select 类型代理组", () => {
      const content = `[custom]
custom_proxy_group=Proxy\`select\`.*`;
      const result = SubconverterIniParser.parse(content);
      const customSection = result.find((s) => s.name === "custom");
      expect(customSection?.proxyGroups.length).toBe(1);
      expect(customSection?.proxyGroups[0].name).toBe("Proxy");
      expect(customSection?.proxyGroups[0].type).toBe("select");
    });

    test("解析 url-test 类型代理组", () => {
      const content = `[custom]
custom_proxy_group=Auto\`url-test\`.*\`http://www.gstatic.com/generate_204\`300`;
      const result = SubconverterIniParser.parse(content);
      const customSection = result.find((s) => s.name === "custom");
      const group = customSection?.proxyGroups[0];
      expect(group?.name).toBe("Auto");
      expect(group?.type).toBe("url-test");
      expect(group?.testUrl).toBe("http://www.gstatic.com/generate_204");
      expect(group?.interval).toBe("300");
    });

    test("解析带成员引用的代理组", () => {
      const content = `[custom]
custom_proxy_group=Main\`select\`[]SubGroup\`[]DIRECT`;
      const result = SubconverterIniParser.parse(content);
      const customSection = result.find((s) => s.name === "custom");
      const group = customSection?.proxyGroups[0];
      expect(group?.proxies).toContain("[]SubGroup");
      expect(group?.proxies).toContain("[]DIRECT");
    });
  });

  describe("stringify", () => {
    test("序列化后可重新解析", () => {
      const content = `[custom]
ruleset=Direct,[]DIRECT
custom_proxy_group=Test\`select\`.*`;
      const sections = SubconverterIniParser.parse(content);
      const stringified = SubconverterIniParser.stringify(sections);
      const reparsed = SubconverterIniParser.parse(stringified);

      // 验证结构一致
      const original = sections.find((s) => s.name === "custom");
      const parsed = reparsed.find((s) => s.name === "custom");
      expect(parsed?.proxyGroups.length).toBe(original?.proxyGroups.length);
      expect(parsed?.rulesets.length).toBe(original?.rulesets.length);
    });

    test("保留 url-test 参数", () => {
      const group: ProxyGroup = {
        name: "Auto",
        type: "url-test",
        proxies: [".*"],
        testUrl: "http://test.com",
        interval: "300",
      };
      const sections = [
        {
          name: "custom",
          config: new Map(),
          rulesets: [],
          proxyGroups: [group],
          rawLines: [],
        },
      ];
      const stringified = SubconverterIniParser.stringify(sections);
      expect(stringified).toContain("url-test");
      expect(stringified).toContain("http://test.com");
      expect(stringified).toContain("300");
    });
  });

  describe("ProxyMember helpers", () => {
    test("parseProxyMember 解析组引用", () => {
      expect(parseProxyMember("[]Proxy")).toEqual({ kind: "group", name: "Proxy" });
    });

    test("parseProxyMember 解析特殊值", () => {
      expect(parseProxyMember("[]DIRECT")).toEqual({ kind: "special", value: "DIRECT" });
      expect(parseProxyMember("[]REJECT")).toEqual({ kind: "special", value: "REJECT" });
    });

    test("parseProxyMember 解析正则", () => {
      expect(parseProxyMember(".*")).toEqual({ kind: "regex", pattern: ".*" });
      expect(parseProxyMember("HK|香港")).toEqual({ kind: "literal", value: "HK|香港" });
    });

    test("stringifyProxyMember 序列化", () => {
      expect(stringifyProxyMember({ kind: "group", name: "Proxy" })).toBe("[]Proxy");
      expect(stringifyProxyMember({ kind: "special", value: "DIRECT" })).toBe("[]DIRECT");
      expect(stringifyProxyMember({ kind: "regex", pattern: ".*" })).toBe(".*");
    });

    test("isGroupReference 判断组引用", () => {
      expect(isGroupReference("[]Proxy")).toBe(true);
      expect(isGroupReference(".*")).toBe(false);
    });

    test("extractGroupName 提取组名", () => {
      expect(extractGroupName("[]Proxy")).toBe("Proxy");
      expect(extractGroupName(".*")).toBe(null);
    });
  });
});
