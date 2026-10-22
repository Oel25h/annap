import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRichText } from "./rich-text.server";

describe("sanitizeRichText", () => {
  test("removes scripts, event handlers, styles, frames and images", () => {
    const html = sanitizeRichText(
      '<p onclick="x()">Hi<script>alert(1)</script></p><img src=x onerror=alert(1)><iframe src="https://e.vil"></iframe><style>p{}</style>',
    );
    assert.equal(html, "<p>Hi</p>");
  });

  test("keeps the allowed structure and maps old tags", () => {
    assert.equal(
      sanitizeRichText(
        "<h1>A</h1><h4>B</h4><b>c</b><i>d</i><ul><li>e</li></ul><blockquote>f</blockquote>",
      ),
      "<h2>A</h2><h3>B</h3><strong>c</strong><em>d</em><ul><li>e</li></ul><blockquote>f</blockquote>",
    );
  });

  test("keeps only safe links and marks outside links", () => {
    const html = sanitizeRichText(
      '<a href="javascript:alert(1)">a</a><a href=" JaVaScRiPt:x">b</a><a href="//evil.com">c</a><a href="http://plain.com">d</a><a href="https://x.com" target="_blank">e</a><a href="/books">f</a><a href="mailto:a@b.c">g</a>',
    );
    assert.equal(
      html,
      '<a>a</a><a>b</a><a>c</a><a>d</a><a href="https://x.com" rel="noopener noreferrer">e</a><a href="/books">f</a><a href="mailto:a@b.c">g</a>',
    );
  });

  test("drops empty paragraphs", () => {
    assert.equal(sanitizeRichText("<p> </p><p>Text</p><p></p>"), "<p>Text</p>");
  });
});
