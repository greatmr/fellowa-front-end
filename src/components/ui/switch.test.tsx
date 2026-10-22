import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  it("updates controlled state with the keyboard and submits its form value", async () => {
    const user = userEvent.setup();

    function Preferences() {
      const [checked, setChecked] = useState(false);

      return (
        <form aria-label="Preferences">
          <label htmlFor="notifications">Notifications</label>
          <Switch
            id="notifications"
            name="notifications"
            value="enabled"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <output>{checked ? "Enabled" : "Disabled"}</output>
        </form>
      );
    }

    render(<Preferences />);
    const control = screen.getByRole("switch", { name: "Notifications" });
    const form = screen.getByRole<HTMLFormElement>("form", {
      name: "Preferences",
    });

    expect(control).not.toBeChecked();
    expect(new FormData(form).has("notifications")).toBe(false);
    await user.tab();
    expect(control).toHaveFocus();
    await user.keyboard(" ");
    expect(control).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("Enabled");
    expect(new FormData(form).get("notifications")).toBe("enabled");
  });

  it("supports an uncontrolled value and leaves disabled controls unchanged", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Switch aria-label="Available" defaultChecked size="sm" />
        <Switch aria-label="Unavailable" defaultChecked disabled />
      </>,
    );

    const available = screen.getByRole("switch", { name: "Available" });
    const unavailable = screen.getByRole("switch", { name: "Unavailable" });
    await user.click(available);
    expect(available).not.toBeChecked();
    await user.click(unavailable);
    expect(unavailable).toBeDisabled();
    expect(unavailable).toBeChecked();
    await user.tab();
    expect(unavailable).not.toHaveFocus();
  });
});
