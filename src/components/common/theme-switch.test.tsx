import { fireEvent, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { describe, expect, it } from "vitest";

import { ThemeSwitch } from "@/components/common/theme-switch";
import fa from "../../../messages/fa.json";
import { renderWithIntl } from "../../../test/render";

describe("ThemeSwitch", () => {
  it("offers three labelled options and applies the chosen theme to <html>", () => {
    renderWithIntl(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ThemeSwitch />
      </ThemeProvider>,
    );

    const group = screen.getByRole("radiogroup", { name: fa.theme.label });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: fa.theme.light })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: fa.theme.dark }));

    expect(screen.getByRole("radio", { name: fa.theme.dark })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(document.documentElement).toHaveClass("dark");
  });
});
