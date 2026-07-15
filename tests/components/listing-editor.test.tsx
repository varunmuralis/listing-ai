import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Property } from "@/types/domain";
import { SaveStatusProvider } from "@/features/workspace/save-status";
import { ListingEditor } from "@/features/listing-editor/listing-editor";

const updatePropertyAction = vi.fn();

vi.mock("@/server/actions/property-actions", () => ({
  updatePropertyAction: (...args: unknown[]) => updatePropertyAction(...args),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const property: Property = {
  id: "p1",
  projectId: "proj1",
  addressLine1: "1420 Maplewood Dr",
  city: "Austin",
  region: "TX",
  postalCode: "78704",
  latitude: null,
  longitude: null,
  price: 875000,
  bedrooms: 4,
  bathrooms: 3,
  squareFeet: 2680,
  lotSize: null,
  yearBuilt: 2015,
  hoaMonthly: null,
  annualPropertyTax: null,
  description: "A home",
  amenities: ["Garage"],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function renderEditor() {
  return render(
    <SaveStatusProvider>
      <ListingEditor projectId="proj1" title="1420 Maplewood Dr" property={property} />
    </SaveStatusProvider>,
  );
}

describe("ListingEditor", () => {
  beforeEach(() => {
    updatePropertyAction.mockReset();
    updatePropertyAction.mockResolvedValue({ status: "success", savedAt: Date.now() });
  });

  it("starts pristine with Save and Reset disabled", () => {
    renderEditor();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
  });

  it("enables Save when a field becomes dirty and disables it again after Reset", async () => {
    const user = userEvent.setup();
    renderEditor();

    const price = screen.getByLabelText(/price/i);
    await user.clear(price);
    await user.type(price, "900000");

    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("submits parsed values to the save action", async () => {
    const user = userEvent.setup();
    renderEditor();

    const price = screen.getByLabelText(/price/i);
    await user.clear(price);
    await user.type(price, "900000");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(updatePropertyAction).toHaveBeenCalledTimes(1);
    const [projectId, payload] = updatePropertyAction.mock.calls[0] as [string, Record<string, unknown>];
    expect(projectId).toBe("proj1");
    expect(payload.price).toBe(900000); // coerced from string by the schema
    expect(payload.title).toBe("1420 Maplewood Dr");
  });

  it("shows field-level validation errors without calling the action", async () => {
    const user = userEvent.setup();
    renderEditor();

    const price = screen.getByLabelText(/price/i);
    await user.clear(price);
    await user.type(price, "not-a-number");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/must be a number/i)).toBeInTheDocument();
    expect(updatePropertyAction).not.toHaveBeenCalled();
  });
});
