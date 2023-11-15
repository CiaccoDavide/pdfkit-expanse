import PDFDocument from "pdfkit-table";
import { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import SVGtoPDF from "svg-to-pdfkit";
import { Converter } from "showdown";
import { PassThrough } from "stream";
import { parseHtml } from "./parseHtml";
import { processHtmlDocumentNodes } from "./processHtmlDocumentNodes";

export const PAGE_WIDTH = 595;
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
}

export interface Table {
  title?: string;
  subtitle?: string;
  headers?: string[];
  rows?: string[][];
}

export type PdfGenerationSection = {
  type: PdfGenerationSectionType;
  options?: any;
};

export interface PdfGenerationInput {
  textColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  sections: PdfGenerationSection[];
}

export default class PdfGenerator {
  private doc: PDFDocument;
  private stream: PassThrough;
  private markdownConverter: Converter;

  private textColor: string = "#000000";
  private primaryColor: string = "#000000";
  private secondaryColor: string = "#000000";

  private htmlStyles = (
    textColor: string,
    primaryColor: string,
    secondaryColor: string
  ) =>
    `p{color:${textColor};}h1,.arch{color:${primaryColor};}h2,h3,h4,h5{color:${secondaryColor};}`;

  constructor() {
    this.doc = new PDFDocument({ size: "A4" });
    this.stream = new PassThrough();
    this.doc.pipe(this.stream);
    this.markdownConverter = new Converter();
  }

  private async addHtmlContent(htmlContent: string) {
    const parsedHtmlDocument = parseHtml(
      htmlContent.replace(/\n\s+/g, "\n"), // remove indentation whitespace
      this.htmlStyles(this.textColor, this.primaryColor, this.secondaryColor)
    );

    await processHtmlDocumentNodes(parsedHtmlDocument, this.doc);
  }

  private async addMarkdownContent(markdown: string) {
    const html = this.markdownConverter.makeHtml(
      markdown //.replace(/\n\s+/g, "\n") // remove indentation whitespace
    );
    await this.addHtmlContent(html);
  }

  private async drawChart(configuration: ChartConfiguration, table: Table) {
    // let x = this.doc.x;
    let y = this.doc.y;

    const chartWidth = 150;
    const chartHeight = 150;
    const renderedChartWidth = CONTENT_WIDTH / 3;
    const renderedChartHeight = (chartHeight * renderedChartWidth) / chartWidth;

    // If the chart does not fit on the page, add a new page
    if (y + renderedChartHeight > CONTENT_HEIGHT + PAGE_MARGIN) {
      this.doc.addPage({ size: "A4" });
      // x = this.doc.x;
      y = this.doc.y;
    }

    // render table
    this.doc.table(table, {
      width: 220,
    });

    // move pdfkit cursor to the bottom of the chart
    this.doc.fontSize(renderedChartHeight / 1.2);
    this.doc.moveDown();

    // Render the chart to an SVG with chartjs-node-canvas
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      type: "svg",
      width: chartWidth * 2,
      height: chartHeight * 2,
    });

    const imageBuffer = chartJSNodeCanvas.renderToBufferSync({
      ...configuration,
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

    // Insert the SVG into the PDF
    SVGtoPDF(this.doc, svg, 320, y, {
      width: renderedChartWidth * 2,
      height: renderedChartHeight * 2,
    });

    // reset font size
    this.doc.fontSize(DEFAULT_FONT_SIZE);
  }

  async generateReport({
    textColor,
    primaryColor,
    secondaryColor,
    sections,
  }: PdfGenerationInput): Promise<PassThrough> {
    this.textColor = textColor ?? "#000000";
    this.primaryColor = primaryColor ?? "#13937f";
    this.secondaryColor = secondaryColor ?? "#a27222";

    for (const section of sections) {
      this.doc.fillColor(this.textColor);

      const { type, options } = section;

      switch (type) {
        case PdfGenerationSectionType.TEXT:
          this.doc.fillColor(options.color ?? this.textColor);
          this.doc.fontSize(options.fontSize ?? 14);
          this.doc.text(options.content, {
            align: options.align ?? "left",
          });
          break;
        case PdfGenerationSectionType.MARKDOWN:
          await this.addMarkdownContent(options.content);
          break;
        case PdfGenerationSectionType.HTML:
          await this.addHtmlContent(options.content);
          break;
        case PdfGenerationSectionType.CHART:
          await this.drawChart(options.chartConfiguration, options.table);
          break;
        case PdfGenerationSectionType.TABLE:
          if (this.doc.y + 60 + options.table.rows.length * 10 > CONTENT_HEIGHT)
            this.doc.addPage({ size: "A4" });
          await this.doc.table(options.table, {
            prepareHeader: () =>
              this.doc
                .font(options.table.headersFont ?? "Helvetica-Bold")
                .fontSize(
                  options.table.fontSize ?? options.table.headersFontSize ?? 8
                ),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
              this.doc
                .font(options.table.font ?? "Helvetica")
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
          const amount = options.amount || 1;
          this.doc.moveDown(amount);
          break;
        case PdfGenerationSectionType.SKIP_TO_NEW_PAGE:
          this.doc.addPage({ size: "A4" });
          break;
        default:
          throw new Error(`Unknown section type: ${type}`);
      }
    }

    this.doc.end();
    return this.stream;
  }

  static async generateReport(input: PdfGenerationInput): Promise<PassThrough> {
    const generator = new PdfGenerator();
    return generator.generateReport(input);
  }
}
