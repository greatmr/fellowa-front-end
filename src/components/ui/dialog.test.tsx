import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

describe("Dialog", () => {
  it("names the close button from closeLabel, not a hardcoded English word", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="بستن" aria-describedby={undefined}>
          <DialogTitle>عنوان</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });
});
