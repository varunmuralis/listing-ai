import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteProjectDialog } from "@/features/workspace/delete-project-dialog";

// The action pulls in server-only modules; stub it for the component test.
vi.mock("@/server/actions/project-actions", () => ({ deleteProjectAction: vi.fn() }));

describe("DeleteProjectDialog", () => {
  it("requires an explicit confirmation step before deleting", async () => {
    const user = userEvent.setup();
    render(<DeleteProjectDialog projectId="proj1" projectTitle="1420 Maplewood Dr" />);

    // No confirmation UI until the user opens the dialog.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete project/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/delete this project/i);
    expect(dialog).toHaveTextContent(/1420 Maplewood Dr/);
    expect(screen.getByRole("button", { name: /delete permanently/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("targets the correct project and redirects to the dashboard on confirm", async () => {
    const user = userEvent.setup();
    render(<DeleteProjectDialog projectId="proj-xyz" projectTitle="Home" />);
    await user.click(screen.getByRole("button", { name: /delete project/i }));
    await screen.findByRole("dialog");

    // Radix portals the dialog to document.body.
    const projectId = document.querySelector<HTMLInputElement>('input[name="projectId"]');
    const redirectTo = document.querySelector<HTMLInputElement>('input[name="redirectTo"]');
    expect(projectId?.value).toBe("proj-xyz");
    expect(redirectTo?.value).toBe("/dashboard");
  });
});
