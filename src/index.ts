import { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import SVGtoPDF from "svg-to-pdfkit";
import { Converter } from "showdown";
import { PassThrough } from "stream";
import { processHtmlDocumentNodes } from "./processHtmlDocumentNodes";
import path from "path";
import fs from "fs";
import PDFDocumentWithTables from "./pdfKitTable";
import { load } from "cheerio";
import juice from "juice";
import { parse } from "parse5";
import { Document } from "parse5/dist/tree-adapters/default";

export enum SupportedFonts {
  Arial = "Arial",
  Calibri = "Calibri",
  CalibriBold = "Calibri Bold",
  Inter = "Inter Regular",
  InterMedium = "Inter Medium",
  InterSemiBold = "Inter SemiBold",
  InterBold = "Inter Bold",
  Helvetica = "Helvetica",
  HelveticaBold = "Helvetica-Bold",
}

export interface ChartProps {
  chartConfiguration: ChartConfiguration;
  table?: Table;
  width?: number;
  height?: number;
}

export const PAGE_WIDTH = 595; // total page width, margins included
export const PAGE_HEIGHT = PAGE_WIDTH * 1.414;
export const PAGE_MARGIN = 72;
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
export const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN * 2;
const DEFAULT_FONT_SIZE = 12;

export enum PdfGenerationSectionType {
  TEXT = "text",
  MARKDOWN = "markdown",
  HTML = "html",
  CHART = "chart",
  IMAGE = "image",
  EMPTY_LINES = "emptyLines",
  SKIP_TO_NEW_PAGE = "skipToNewPage",
  TABLE = "table",
  MOVE_UP = "moveUp",
}

export interface Table {
  title?: string;
  subtitle?: string;
  headers?: string[];
  rows?: string[][];
  datas?: any[];
}

export type PdfGenerationSection = {
  type: PdfGenerationSectionType;
  options?: any;
};

// export interface TwoColumnsContent {
//   left?: PdfGenerationSection[] | "pageIndicator";
//   right?: PdfGenerationSection[] | "pageIndicator";
// }

// export interface ThreeColumnsContent extends TwoColumnsContent {
//   center?: PdfGenerationSection[] | "pageIndicator";
// }

export interface Header {
  logo?: string;
}

export interface Footer {
  title?: string;
  subtitle?: string;
  showPageNumbers?: boolean;
}

export interface PdfGenerationInput {
  textColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  sections: PdfGenerationSection[];
  header?: Header;
  footer?: Footer;
}

export interface PdfGeneratorGlobalSettings {
  defaultFontFamily?: SupportedFonts;
  defaultFontFamilyBold?: SupportedFonts;
  customDirname?: string;
}

export default class PdfGenerator {
  FONT_DEFAULT: SupportedFonts = SupportedFonts.Helvetica;
  FONT_BOLD: SupportedFonts = SupportedFonts.HelveticaBold;
  doc: PDFDocumentWithTables;
  stream: PassThrough;
  markdownConverter: Converter;

  firefoxCss: string;
  w3Css: string;

  textColor: string = "#000000";
  primaryColor: string = "#000000";
  secondaryColor: string = "#000000";

  header?: Header;
  footer?: Footer;

  private htmlStyles = (
    textColor: string,
    primaryColor: string,
    secondaryColor: string
  ) =>
    `p{color:${textColor};}h1,.arch{color:${primaryColor};}h2,h3,h4,h5{color:${secondaryColor};}`;

  constructor({
    defaultFontFamily = SupportedFonts.Helvetica,
    defaultFontFamilyBold = SupportedFonts.HelveticaBold,
    customDirname = __dirname,
  }: PdfGeneratorGlobalSettings = {}) {
    this.doc = new PDFDocumentWithTables({ size: "A4", bufferPages: true });

    this.firefoxCss = fs.readFileSync(
      path.join(customDirname, "../assets/firefox-html.css"),
      "utf-8"
    );
    this.w3Css = fs.readFileSync(
      path.join(customDirname, "../assets/w3-css21.css"),
      "utf-8"
    );

    this.FONT_DEFAULT = defaultFontFamily;
    this.FONT_BOLD = defaultFontFamilyBold;
    if (defaultFontFamily === "Arial" || defaultFontFamilyBold === "Arial") {
      this.doc.registerFont(
        "Arial",
        path.join(customDirname, "../assets/fonts/Arial.ttf")
      );
    }
    if (
      defaultFontFamily === SupportedFonts.Calibri ||
      defaultFontFamilyBold === SupportedFonts.Calibri
    ) {
      this.doc.registerFont(
        SupportedFonts.Calibri,
        path.join(customDirname, "../assets/fonts/Calibri.ttf")
      );
    }
    if (
      defaultFontFamily === SupportedFonts.CalibriBold ||
      defaultFontFamilyBold === SupportedFonts.CalibriBold
    ) {
      this.doc.registerFont(
        SupportedFonts.CalibriBold,
        path.join(customDirname, "../assets/fonts/CalibriBold.ttf")
      );
    }
    if (
      defaultFontFamily === SupportedFonts.Inter ||
      defaultFontFamilyBold === SupportedFonts.Inter
    ) {
      this.doc.registerFont(
        SupportedFonts.Inter,
        path.join(customDirname, "../assets/fonts/Inter-Regular.ttf")
      );
    }
    if (
      defaultFontFamily === SupportedFonts.InterMedium ||
      defaultFontFamilyBold === SupportedFonts.InterMedium
    ) {
      this.doc.registerFont(
        SupportedFonts.InterMedium,
        path.join(customDirname, "../assets/fonts/Inter-Medium.ttf")
      );
    }
    if (
      defaultFontFamily === SupportedFonts.InterSemiBold ||
      defaultFontFamilyBold === SupportedFonts.InterSemiBold
    ) {
      this.doc.registerFont(
        SupportedFonts.InterSemiBold,
        path.join(customDirname, "../assets/fonts/Inter-SemiBold.ttf")
      );
    }
    if (
      defaultFontFamily === SupportedFonts.InterBold ||
      defaultFontFamilyBold === SupportedFonts.InterBold
    ) {
      this.doc.registerFont(
        SupportedFonts.InterBold,
        path.join(customDirname, "../assets/fonts/Inter-Bold.ttf")
      );
    }
    this.stream = new PassThrough();
    this.doc.pipe(this.stream);
    this.markdownConverter = new Converter();
  }

  getPDFDocument() {
    return this.doc as PDFKit.PDFDocument;
  }

  private parseHtml(html: string | Buffer, customCss: string) {
    const loadedHtml = load(
      `<style>${this.firefoxCss}</style>` +
        `<style>${this.w3Css}</style>` +
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
  }

  private async addHtmlContent(htmlContent: string) {
    const parsedHtmlDocument = this.parseHtml(
      htmlContent.replace(/\n\s+/g, "\n"), // remove indentation whitespace
      this.htmlStyles(this.textColor, this.primaryColor, this.secondaryColor)
    );

    await processHtmlDocumentNodes(parsedHtmlDocument, this);
  }

  private async addMarkdownContent(markdown: string) {
    const html = this.markdownConverter.makeHtml(
      markdown //.replace(/\n\s+/g, "\n") // remove indentation whitespace
    );
    await this.addHtmlContent(html);
  }

  private async drawChart({
    chartConfiguration,
    table,
    width,
    height,
  }: ChartProps) {
    // let x = this.doc.x;
    let y = this.doc.y;

    const chartWidth = table ? 150 : width || 150;
    const chartHeight = table ? 150 : height || 150;
    const renderedChartWidth = CONTENT_WIDTH / 3;
    const renderedChartHeight = (chartHeight * renderedChartWidth) / chartWidth;

    // If the chart or the table does not fit on the page, add a new page
    const isChartOverflowing =
      y + renderedChartHeight > CONTENT_HEIGHT + PAGE_MARGIN;
    const tableHeight = table
      ? 60 + (table.rows?.length || 0 || table.datas?.length || 0) * 10
      : 0;
    const isTableOverflowing =
      table && // if there is no table, it can't overflow
      this.doc.y + tableHeight + 60 > CONTENT_HEIGHT;

    if (isChartOverflowing || isTableOverflowing) {
      this.doc.addPage({ size: "A4" });
      // x = this.doc.x;
      y = this.doc.y;
    }

    if (table) {
      // render table
      this.doc.table(table, {
        width: 220,
      });
    }

    // move pdfkit cursor to the bottom of the chart
    const chartHeightSpaced = chartHeight * (table ? 1.3 : 1.5);
    this.doc.fontSize(chartHeightSpaced);
    if (!table) this.doc.text(" ");
    else {
      if (chartHeightSpaced > tableHeight) {
        this.doc.fontSize(chartHeightSpaced - tableHeight);
        this.doc.text(" ");
      } else {
        this.doc.moveDown();
      }
    }
    // Render the chart to an SVG with chartjs-node-canvas
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      type: "svg",
      width: chartWidth * 2,
      height: chartHeight * 2,
    });

    const imageBuffer = chartJSNodeCanvas.renderToBufferSync({
      ...chartConfiguration,
      plugins: {
        legend: {
          display: true,
          position: "left",
        },
      } as any,
    });
    const svg = imageBuffer
      .toString("utf8")
      .replace(`width="${chartWidth * 2}pt" height="${chartHeight * 2}pt"`, "");

    const centeredPosition =
      PAGE_MARGIN + CONTENT_WIDTH / 2 - chartWidth / 1.333;

    // Insert the SVG into the PDF
    SVGtoPDF(this.doc, svg, table ? 320 : centeredPosition, y, {
      width: renderedChartWidth * 2,
      height: renderedChartHeight * 2,
    });

    // reset font size
    this.doc.fontSize(DEFAULT_FONT_SIZE);
  }

  private resetFont() {
    this.doc.font(this.FONT_DEFAULT);
    this.doc.fillColor(this.textColor);
    this.doc.fontSize(DEFAULT_FONT_SIZE);
  }

  async generateReport({
    textColor,
    primaryColor,
    secondaryColor,
    sections,
    header,
    footer,
  }: PdfGenerationInput): Promise<PassThrough> {
    this.resetFont(); // init font
    this.textColor = textColor ?? "#000000";
    this.primaryColor = primaryColor ?? "#000000";
    this.secondaryColor = secondaryColor ?? "#000000";

    this.header = header;
    this.footer = footer;

    for (const section of sections) {
      this.doc.fillColor(this.textColor);

      const { type, options } = section;
      const amount = options?.amount || 1;

      switch (type) {
        case PdfGenerationSectionType.TEXT:
          const previousX = this.doc.x;
          const previousY = this.doc.y;
          const x = options.x || this.doc.x;
          const y = options.y || this.doc.y;

          this.doc.font(
            options.font ?? options.weight === "bold"
              ? this.FONT_BOLD
              : this.FONT_DEFAULT
          );
          this.doc.fillColor(options.color ?? this.textColor);
          this.doc.fontSize(options.fontSize ?? 14);
          this.doc.text(options.content, x, y, {
            align: options.align ?? "left",
            ...options.width ? { width: options.width } : {},
            ...options.height ? { height: options.height } : {},
            ...options.lineGap ? { lineGap: options.lineGap } : {},
          });

          if (options.x && options.y) {
            this.doc.x = previousX;
            this.doc.y = previousY;
          }

          break;
        case PdfGenerationSectionType.MARKDOWN:
          await this.addMarkdownContent(options.content);
          break;
        case PdfGenerationSectionType.HTML:
          await this.addHtmlContent(options.content);
          break;
        case PdfGenerationSectionType.CHART:
          await this.drawChart(options);
          break;
        case PdfGenerationSectionType.TABLE:
          // If the table does not fit on the page, add a new page
          // todo: add option to choose between adding a new page or let the table split

          //   console.log(">", options.table.title,
          //     options.table.rows?.length,
          //     options.table.datas?.length,
          //     this.doc.y +
          //       60 +
          //       (options.table.rows.length || options.table.datas.length) *
          //         12,
          //     CONTENT_HEIGHT
          //   );

          if (
            this.doc.y +
              60 +
              (options.table.rows.length || options.table.datas.length) * 10 >
            CONTENT_HEIGHT
          ) {
            this.doc.addPage({ size: "A4" });
          }

          await this.doc.table(options.table, {
            prepareHeader: () =>
              this.doc
                .font(options.table.headersFont ?? this.FONT_BOLD)
                .fontSize(
                  options.table.fontSize ?? options.table.headersFontSize ?? 8
                ),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
              this.doc
                .font(options.table.font ?? this.FONT_DEFAULT)
                .fontSize(
                  options.table.fontSize ?? options.table.rowsFontSize ?? 8
                );
              return this.doc;
            },
          });
          break;
        case PdfGenerationSectionType.IMAGE:
          this.doc.image(options.image, {
            align: options.align || "left",
            fit: options.fit || [250, 250],
          });
          break;
        case PdfGenerationSectionType.EMPTY_LINES: // adds space until new page
          if (options.fontSize) this.doc.fontSize(options.fontSize);
          this.doc.moveDown(amount);
          this.doc.fontSize(DEFAULT_FONT_SIZE);
          break;
        case PdfGenerationSectionType.MOVE_UP:
          if (options.fontSize) this.doc.fontSize(options.fontSize);
          this.doc.moveUp(amount);
          this.doc.fontSize(DEFAULT_FONT_SIZE);
          break;
        case PdfGenerationSectionType.SKIP_TO_NEW_PAGE:
          this.doc.addPage({ size: "A4" });
          break;
        default:
          throw new Error(`Unknown section type: ${type}`);
      }

      this.resetFont();
    }

    this.renderHeaderAndFooter();

    this.doc.end();
    return this.stream;
  }

  private renderHeaderAndFooter() {
    const footerMargin = 16;
    const range = this.doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);

      // header
      if (this.header && this.header.logo) {
        const headerBoxX = footerMargin;
        const headerBoxY = footerMargin;
        const headerBoxWidth = this.doc.page.width - footerMargin * 2;
        const headerBoxHeight = PAGE_MARGIN - footerMargin * 3;
        this.doc.image(this.header.logo, headerBoxX, headerBoxY, {
          align: "right",
          fit: [headerBoxWidth, headerBoxHeight],
        });
      }

      // footer
      if (this.footer) {
        this.doc.strokeColor("#eeeeee");
        this.doc
          .moveTo(footerMargin, PAGE_HEIGHT - PAGE_MARGIN + footerMargin)
          .lineTo(
            PAGE_WIDTH - footerMargin,
            PAGE_HEIGHT - PAGE_MARGIN + footerMargin
          )
          .stroke();

        this.doc.strokeColor(this.textColor);

        this.doc.fillColor("#728197");
        const footerFontSize = 8.5;
        const footerLineGap = 4;

        const footerTextBoxY =
          this.doc.page.height - PAGE_MARGIN + footerMargin * 2;
        const footerTextBoxHeight = footerFontSize;

        this.doc.fontSize(footerFontSize);

        if (this.footer?.title) {
          this.doc.font(this.FONT_BOLD);
          this.doc.text(this.footer.title, footerMargin, footerTextBoxY, {
            width: this.doc.page.width - footerMargin * 2,
            height: footerTextBoxHeight,
            align: "left",
            lineGap: 2,
          });
          this.doc.font(this.FONT_DEFAULT);
        }
        if (this.footer?.subtitle) {
          this.doc.text(
            this.footer.subtitle,
            footerMargin,
            footerTextBoxY + footerFontSize + footerLineGap,
            {
              width: this.doc.page.width - footerMargin * 2,
              height: footerTextBoxHeight,
              align: "left",
              lineGap: 2,
            }
          );
        }

        if (this.footer?.showPageNumbers) {
          this.doc.text(
            `${i + 1}/${range.count}`,
            footerMargin,
            footerTextBoxY + footerFontSize + footerLineGap,
            {
              width: this.doc.page.width - footerMargin * 2,
              height: footerTextBoxHeight,
              align: "right",
              lineGap: 2,
            }
          );
        }
      }
    }
  }

  static async generateReport(
    input: PdfGenerationInput,
    globalSettings?: PdfGeneratorGlobalSettings
  ): Promise<PassThrough> {
    const generator = new PdfGenerator(globalSettings);
    return generator.generateReport(input);
  }
}
