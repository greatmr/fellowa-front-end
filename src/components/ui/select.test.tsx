import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppProviders } from "@/components/providers/app-providers";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { renderWithIntl } from "../../../test/render";

function LanguageOptions() {
  return (
    <>
      <SelectTrigger aria-label="Language">
        <SelectValue placeholder="Choose a language" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Languages</SelectLabel>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="de" disabled>
            German
          </SelectItem>
          <SelectItem value="fa">Persian</SelectItem>
        </SelectGroup>
        <SelectSeparator />
      </SelectContent>
    </>
  );
}

describe("Select", () => {
  it("selects with the keyboard, skips disabled items, and submits a value", async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="Preferences">
        <Select defaultValue="en" name="language">
          <LanguageOptions />
        </Select>
      </form>,
    );

    const trigger = screen.getByRole("combobox", { name: "Language" });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "German" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.keyboard("{ArrowDown}{Enter}");

    expect(trigger).toHaveTextContent("Persian");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(
      new FormData(
        screen.getByRole<HTMLFormElement>("form", { name: "Preferences" }),
      ).get("language"),
    ).toBe("fa");
  });

  it("supports typeahead and returns focus on Escape without changing selection", async () => {
    const user = userEvent.setup();
    render(
      <Select defaultValue="en">
        <LanguageOptions />
      </Select>,
    );

    const trigger = screen.getByRole("combobox", { name: "Language" });
    await user.click(trigger);
    await screen.findByRole("listbox");
    await user.keyboard("p");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Persian" })).toHaveFocus(),
    );
    await user.keyboard("{Escape}");
    expect(trigger).toHaveTextContent("English");
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("updates controlled state and gives the portaled list its RTL direction", async () => {
    const user = userEvent.setup();

    function Preferences() {
      const [language, setLanguage] = useState("en");

      return (
        <Select dir="rtl" value={language} onValueChange={setLanguage}>
          <LanguageOptions />
        </Select>
      );
    }

    render(<Preferences />);
    const trigger = screen.getByRole("combobox", { name: "Language" });
    expect(trigger).toHaveAttribute("dir", "rtl");
    await user.click(trigger);
    expect(await screen.findByRole("listbox")).toHaveAttribute("dir", "rtl");
    await user.click(screen.getByRole("option", { name: "Persian" }));
    expect(trigger).toHaveTextContent("Persian");
  });

  it.each([
    { locale: "fa", direction: "rtl" },
    { locale: "en", direction: "ltr" },
  ] as const)(
    "inherits $direction from the $locale app providers without a dir prop",
    async ({ locale, direction }) => {
      const user = userEvent.setup();
      renderWithIntl(
        <AppProviders>
          <Select defaultValue="en">
            <LanguageOptions />
          </Select>
        </AppProviders>,
        { locale },
      );

      const trigger = screen.getByRole("combobox", { name: "Language" });
      expect(trigger).toHaveAttribute("dir", direction);
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(await screen.findByRole("listbox")).toHaveAttribute(
        "dir",
        direction,
      );
      await user.keyboard("{ArrowDown}{Enter}");
      expect(trigger).toHaveTextContent("Persian");
      await waitFor(() => expect(trigger).toHaveFocus());
    },
  );

  it("does not open a disabled select", async () => {
    const user = userEvent.setup();
    render(
      <Select disabled>
        <LanguageOptions />
      </Select>,
    );

    const trigger = screen.getByRole("combobox", { name: "Language" });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
