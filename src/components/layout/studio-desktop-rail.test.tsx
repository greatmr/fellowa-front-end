import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import { StudioDesktopRail } from "./studio-desktop-rail";

describe("StudioDesktopRail", () => {
  it.each([
    { locale: "en", messages: en },
    { locale: "fa", messages: fa },
  ])(
    "collapses and expands with a localized accessible control in $locale",
    async ({ locale, messages }) => {
      const user = userEvent.setup();
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StudioDesktopRail>
            <nav aria-label={messages.studio.mainNav}>
              <a href="#dashboard">{messages.studio.nav.dashboard}</a>
            </nav>
          </StudioDesktopRail>
        </NextIntlClientProvider>,
      );

      const collapse = screen.getByRole("button", {
        name: messages.studio.collapseSidebar,
      });
      expect(collapse).toHaveAttribute("aria-expanded", "true");
      await user.click(collapse);
      const expand = screen.getByRole("button", {
        name: messages.studio.expandSidebar,
      });
      expect(expand).toHaveAttribute("aria-expanded", "false");
      expect(
        screen.getByRole("link", { name: messages.studio.nav.dashboard }),
      ).toBeInTheDocument();
      await user.click(expand);
      expect(
        screen.getByRole("button", { name: messages.studio.collapseSidebar }),
      ).toHaveAttribute("aria-expanded", "true");
    },
  );
});
