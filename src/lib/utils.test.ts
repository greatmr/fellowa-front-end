import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

describe("cn with the Fellowa scales", () => {
  it("treats a named type size as a font size, not a color", () => {
    expect(cn("text-label text-foreground")).toBe("text-label text-foreground");
    expect(cn("text-sm", "text-label")).toBe("text-label");
  });

  it("keeps the foreground color on a small button", () => {
    // Button renders cn(buttonVariants(...)); that merged string is what ships.
    const classes = cn(buttonVariants({ size: "sm" })).split(" ");
    expect(classes).toContain("text-label");
    expect(classes).toContain("text-primary-foreground");
    expect(classes).not.toContain("text-sm");
  });

  it("resolves custom shadows, radii and gradients against their defaults", () => {
    expect(cn("shadow-xs", "shadow-panel")).toBe("shadow-panel");
    expect(cn("rounded-md", "rounded-card")).toBe("rounded-card");
    expect(cn("bg-cover-brand", "bg-cover-mix")).toBe("bg-cover-mix");
    expect(cn("bg-card", "bg-cover-mix")).toBe("bg-card bg-cover-mix");
  });
});
