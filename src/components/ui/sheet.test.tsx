import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

describe("Sheet", () => {
  it("names the close button from the closeLabel prop and sits on the logical end side", () => {
    render(
      <Sheet open>
        <SheetContent closeLabel="بستن">
          <SheetTitle>فیلترها</SheetTitle>
          <SheetDescription>توضیح</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "فیلترها" })).toHaveClass(
      "end-0",
    );
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });
});
