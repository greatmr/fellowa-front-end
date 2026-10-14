import { describe, expect, it, vi } from "vitest";

import { studioNav, studioSettingsItem } from "@/components/layout/studio-nav";
import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";

// The link module imports next-intl navigation, which needs Next's router at
// import time; only the pure helper is under test here.
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  usePathname: () => "/",
}));
const { isPathActive } = await import("@/components/layout/studio-nav-link");

describe("isPathActive", () => {
  it("matches the studio root only exactly", () => {
    expect(isPathActive("/studio", "/studio", true)).toBe(true);
    expect(isPathActive("/studio", "/studio/posts", true)).toBe(false);
  });

  it("keeps a section active on its sub-routes but not on look-alike paths", () => {
    expect(isPathActive("/studio/posts", "/studio/posts")).toBe(true);
    expect(isPathActive("/studio/posts", "/studio/posts/new")).toBe(true);
    expect(isPathActive("/studio/posts", "/studio/postsx")).toBe(false);
    expect(isPathActive("/studio/page", "/studio/payouts")).toBe(false);
  });
});

describe("studio navigation", () => {
  const items = [
    ...studioNav.flatMap((group) => group.items),
    studioSettingsItem,
  ];

  it("has a label in both locales for every entry and group", () => {
    for (const item of items) {
      expect(fa.studio.nav).toHaveProperty(item.label);
      expect(en.studio.nav).toHaveProperty(item.label);
    }
    for (const { group } of studioNav) {
      if (group) {
        expect(fa.studio.groups).toHaveProperty(group);
        expect(en.studio.groups).toHaveProperty(group);
      }
    }
  });

  it("never lists the same route twice", () => {
    const hrefs = items.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
