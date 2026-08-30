// @vitest-environment jsdom

import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Backlinks } from "./Backlinks";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("Backlinks", () => {
  it("offers to convert an unlinked mention", async () => {
    const note = {
      id: "source",
      title: "Planning",
      body: "Project Atlas needs a launch checklist.",
    };
    const onLinkMention = vi.fn(() => Promise.resolve());
    const view = render(
      <Backlinks
        notes={[note]}
        currentId="current"
        currentTitle="Project Atlas"
        onLinkMention={onLinkMention}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "Link mention" }));

    await waitFor(() => expect(onLinkMention).toHaveBeenCalledWith(note));
  });
});
