import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import { RouteError } from "./route-error";

describe("RouteError", () => {
  it.each([
    { locale: "en", messages: en, home: "/en" },
    { locale: "fa", messages: fa, home: "/" },
  ])(
    "retries safely and provides a locale-preserving home link in $locale",
    async ({ locale, messages, home }) => {
      const user = userEvent.setup();
      const retry = vi.fn();
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <main>
            <RouteError
              error={new Error("private error details")}
              retry={retry}
            />
          </main>
        </NextIntlClientProvider>,
      );

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: messages.errors.unexpectedTitle,
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("private error details"),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole("main")).toHaveLength(1);
      expect(
        screen.getByRole("link", { name: messages.errors.backHome }),
      ).toHaveAttribute("href", home);
      await user.click(
        screen.getByRole("button", { name: messages.common.retry }),
      );
      expect(retry).toHaveBeenCalledOnce();
    },
  );
});
