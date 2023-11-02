import {
  ChildNode,
  Document,
  Element,
  TextNode,
} from "parse5/dist/tree-adapters/default";
import PDFDocument from "pdfkit-table";
import postcss from "postcss";

type CssDeclaration = {
  prop: string;
  value: string;
};

type OtherStyleOptions = {
  color?: string;
  fontSize?: number;
};

type StyleOptions = {
  textOptions: Partial<PDFKit.Mixins.TextOptions>;
  otherOptions: OtherStyleOptions;
};

const FONT_DEFAULT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const FONT_SIZES = {
  h1: 24,
  h2: 22,
  h3: 20,
  h4: 18,
  h5: 16,
  h6: 14,
  p: 12,
  small: 10,
};
const DEFAULT_COLOR = "#000000";

const cssProcessor = postcss();

const getStyleOptions = async (node: ChildNode): Promise<StyleOptions> => {
  const styleAttribute = (node as Element).attrs.find(
    ({ name }) => name === "style"
  )?.value;

  if (!styleAttribute) {
    return {
      textOptions: {},
      otherOptions: {},
    };
  }

  const textOptions: Partial<PDFKit.Mixins.TextOptions> = {};
  const otherOptions: OtherStyleOptions = {};

  await cssProcessor
    .process(styleAttribute, { from: undefined })
    .then((result) => {
      result.root.walkDecls((decl) => {
        switch (decl.prop) {
          case "color":
            otherOptions.color = decl.value;
            break;
          case "font-size":
            otherOptions.fontSize = parseInt(decl.value);
            break;
          case "text-align":
            textOptions.align = decl.value as any;
            break;
          case "font-style":
            textOptions.oblique = decl.value === "italic";
            break;
        }
      });
    })
    .catch((error) => {
      console.error("Error parsing CSS:", error);
    });

  return {
    textOptions,
    otherOptions,
  };
};

const processNodes = async (
  nodes: ChildNode[],
  doc: PDFDocument,
  options?: PDFKit.Mixins.TextOptions
) => {
  let index = 0;
  for (const node of nodes) {
    switch (node.nodeName) {
      // text nodes
      case "#text":
        doc.text((node as TextNode).value, {
          continued: index < nodes.length - 1,
          oblique: false,
          ...options,
        });
        break;

      // heading nodes
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
      case "p":
      case "small":
        doc.fontSize(FONT_SIZES[node.nodeName]);

        const { textOptions, otherOptions } = await getStyleOptions(node);
        if (otherOptions.color) {
          doc.fillColor(otherOptions.color);
        }

        await processNodes(node.childNodes, doc, {
          continued: true,
          ...textOptions,
        });
        doc.text("\n");
        doc.fontSize(FONT_SIZES.p);

        if (otherOptions.color) {
          doc.fillColor(DEFAULT_COLOR);
        }
        break;

      // italic nodes
      case "i":
      case "em":
        await processNodes(node.childNodes, doc, {
          continued: true,
          oblique: true,
        });
        break;

      case "b":
      case "strong":
        doc.font(FONT_BOLD);
        await processNodes(node.childNodes, doc);
        doc.font(FONT_DEFAULT);
        break;

      // line break nodes
      case "br":
        doc.text("\n");
        break;

      // unordered list nodes
      case "ul":
        await processNodes(node.childNodes, doc);
        break;

      // list item nodes
      case "li":
        doc.list([(node.childNodes[0] as TextNode).value], {
          bulletRadius: 2,
        });
        break;

      // unsupported nodes could contain text nodes
      default:
        if ((node as Element).childNodes) {
          await processNodes((node as Element).childNodes, doc);
        }
        break;
    }
    index++;
  }
};

export const processHtmlDocumentNodes = async (
  document: Document,
  pdfKitDocument: PDFDocument
) => {
  const html = document.childNodes.find((node) => node.nodeName === "html");

  if (!html) {
    return;
  }

  const body = (html as Element).childNodes.find(
    (node) => node.nodeName === "body"
  );

  if (!body) {
    return;
  }

  await processNodes((body as Element).childNodes, pdfKitDocument);
};
