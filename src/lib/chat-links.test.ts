import { describe, expect, it } from "vitest";

import { chatLinkKind } from "./chat-links";

describe("chatLinkKind", () => {
  it("takes a path inside the site as internal", () => {
    expect(chatLinkKind("/laptops/6cff98c5-3a91-496e-8630-5f7226ab95d7")).toBe("internal");
    expect(chatLinkKind("/compare?ids=a,b")).toBe("internal");
    expect(chatLinkKind("/")).toBe("internal");
  });

  it("takes a path with configuration params as internal", () => {
    expect(
      chatLinkKind("/laptops/6cff98c5-3a91-496e-8630-5f7226ab95d7?chip=m5pro-18-20&memory=48gb&storage=2tb&display=nano_texture"),
    ).toBe("internal");
  });

  it("takes http and https links as external", () => {
    expect(chatLinkKind("https://shopee.com.my/search?keyword=macbook")).toBe("external");
    expect(chatLinkKind("http://example.com")).toBe("external");
    expect(chatLinkKind("HTTPS://EXAMPLE.COM/x")).toBe("external");
  });

  it("never takes another site written as a path", () => {
    expect(chatLinkKind("//evil.com")).toBeNull();
    expect(chatLinkKind("//evil.com/laptops/1")).toBeNull();
    expect(chatLinkKind("/\\evil.com")).toBeNull();
    expect(chatLinkKind("/laptops\\..\\x")).toBeNull();
  });

  it("never takes a scheme that is not http(s)", () => {
    expect(chatLinkKind("javascript:alert(1)")).toBeNull();
    expect(chatLinkKind("JavaScript:alert(1)")).toBeNull();
    expect(chatLinkKind("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(chatLinkKind("mailto:someone@example.com")).toBeNull();
    expect(chatLinkKind("ftp://example.com/file")).toBeNull();
  });

  it("takes nothing else either", () => {
    expect(chatLinkKind("")).toBeNull();
    expect(chatLinkKind("laptops/123")).toBeNull();
    expect(chatLinkKind("example.com")).toBeNull();
    expect(chatLinkKind("https://")).toBeNull();
    expect(chatLinkKind("/laptops/1 onclick=x")).toBeNull();
    expect(chatLinkKind(" /laptops/1")).toBeNull();
  });
});
