import { parse } from "parse5";
import path from "path";
import fs from "fs";
import { load } from "cheerio";
import { Document } from "parse5/dist/tree-adapters/default";
import juice from "juice";

const firefoxCss = fs.readFileSync(
  path.join(__dirname, "../assets/firefox-html.css"),
  "utf-8"
);
const w3Css = fs.readFileSync(
  path.join(__dirname, "../assets/w3-css21.css"),
  "utf-8"
);

export const parseHtml = (html: string | Buffer, customCss: string) => {
  const loadedHtml = load(
    `<style>${firefoxCss}</style>` +
      `<style>${w3Css}</style>` +
      `<style>${customCss}</style>` +
      html
  );

  loadedHtml(
    [
      "area",
      "audio",
      "button",
      "canvas",
      "content",
      "datalist",
      "details",
      "dialog",
      "element",
      "embed",
      "head",
      "img",
      "input",
      "legend",
      "map",
      "menu",
      "menuitem",
      "meta",
      "meter",
      "noscript",
      "optgroup",
      "options",
      "output",
      "progress",
      "script",
      "select",
      "shadow",
      "source",
      "summary",
      "table",
      "tbody",
      "td",
      "template",
      "th",
      "thead",
      "tr",
      "track",
      "video",
    ].join(", ")
  ).remove();

  // apply all inline styles
  const htmlWithInlineStyles = juice(loadedHtml.html());
  // reload html
  const loadedStyledHtml = load(htmlWithInlineStyles);
  // remove all style-tag elements
  loadedStyledHtml("style").remove();

  const parsedHtmlDocument: Document = parse(loadedStyledHtml.html());
  // return the parsed (by parse5) html document
  return parsedHtmlDocument;
};
