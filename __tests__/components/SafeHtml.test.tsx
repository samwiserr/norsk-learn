import { render, screen } from "@testing-library/react";
import SafeHtml from "@/src/components/SafeHtml";

describe("SafeHtml", () => {
  it("renders allowed HTML tags", () => {
    render(<SafeHtml content="<strong>bold</strong> text" />);
    const el = screen.getByText("bold");
    expect(el.tagName).toBe("STRONG");
  });

  it("strips script tags", () => {
    const { container } = render(
      <SafeHtml content="<script>alert('xss')</script>safe" />
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("safe");
  });

  it("strips event handlers", () => {
    const { container } = render(
      <SafeHtml content='<div onmouseover="alert(1)">hover</div>' />
    );
    const div = container.querySelector("div div");
    expect(div?.getAttribute("onmouseover")).toBeNull();
  });

  it("strips data attributes", () => {
    const { container } = render(
      <SafeHtml content='<div data-evil="true">test</div>' />
    );
    const div = container.querySelector("[data-evil]");
    expect(div).toBeNull();
  });
});
