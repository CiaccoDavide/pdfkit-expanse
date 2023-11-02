import { createWriteStream } from "fs";
import PdfGenerator, { PdfGenerationSectionType } from "../src";

test("generate pdf", async () => {
  const pdfGenerator = new PdfGenerator();
  const sections = [
    {
      type: PdfGenerationSectionType.TEXT,
      options: {
        content: "pdfkit-expanse",
        align: "center",
        fontSize: 24,
        color: "#1070d0",
      },
    },
    {
      type: PdfGenerationSectionType.TEXT,
      options: {
        content: "Easy PDF generation for NodeJS",
        align: "center",
        fontSize: 12,
        color: "#903f00",
      },
    },
    { type: PdfGenerationSectionType.EMPTY_LINES, options: { amount: 2 } },
    {
      type: PdfGenerationSectionType.HTML,
      options: {
        content: `
          <h1>H1</h1>
          <h2>H2</h2>
          <h3>H3</h3>
          <h4>H4</h4>
          <h5>H5</h5>
          <h6>H6</h6>
          <br />
          <p>This is a paragraph</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam in
          suscipit purus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
          posuere cubilia Curae; Vivamus nec hendrerit felis. Morbi aliquam facilisis risus eu
          lacinia. Sed eu leo in turpis fringilla hendrerit. Ut nec accumsan nisl.</p>
          <br />

          <ul>
            <li>Unordered list item one</li>
            <li>Unordered list item two</li>
            <li>Unordered list item three</li>
          </ul>

          <p>This paragraph contains <i>italic text</i></p>

          <p>This paragraph contains <b>bold text</b></p>
          <p>This paragraph contains <strong>strong text</strong></p>
          <p>This paragraph contains <em>emphasized text</em></p>
          <p>This paragraph contains <small>small text</small></p>

          <p style="text-align:right;">This paragraph contains text aligned to the right</p>
          
          <p>This paragraph contains <mark>marked text</mark></p>
          <p>This paragraph contains <del>deleted text</del></p>
          <p>This paragraph contains <ins>inserted text</ins></p>
          <p>This paragraph contains <sub>subscript text</sub></p>
          <p>This paragraph contains <sup>superscript text</sup></p>
          <p>This paragraph contains <code>code text</code></p>
          <p>This paragraph contains <kbd>keyboard text</kbd></p>
          <p>This paragraph contains <samp>samp text</samp></p>
          <p>This paragraph contains <var>var text</var></p>
          <p>This paragraph contains <cite>cite text</cite></p>
          <p>This paragraph contains <dfn>dfn text</dfn></p>
          <p>This paragraph contains <abbr>abbr text</abbr></p>
          <p>This paragraph contains <q>q text</q></p>
          <p>This paragraph contains <blockquote>blockquote text</blockquote></p>
          <p>This paragraph contains <address>address text</address></p>
          <p>This paragraph contains <pre>pre text</pre></p>
          <p>This paragraph contains <a href="http://github.com/ciaccodavide">a link</a></p>
        `,
      },
    },
    { type: PdfGenerationSectionType.SKIP_TO_NEW_PAGE },
    {
      type: PdfGenerationSectionType.TEXT,
      options: { content: "Analysis", fontSize: 24, color: "#ff0000" },
    },
    { type: PdfGenerationSectionType.EMPTY_LINES, options: { amount: 1 } },
    {
      type: PdfGenerationSectionType.MARKDOWN,
      options: {
        content: "#MarkDown Title\n\n_some italic text_\n\n**some strong text**",
      },
    },
    { type: PdfGenerationSectionType.EMPTY_LINES, options: { amount: 2 } },
    {
      type: PdfGenerationSectionType.CHART,
      options: {
        table: {
          title: "Gender distribution",
          subtitle: "Office employees",
          headers: ["Gender", "Employees"],
          rows: [
            ["Male", 89],
            ["Female", 54],
            ["Other", 37],
          ],
        },
        chartConfiguration: {
          type: "pie",
          data: {
            labels: ["Male", "Female", "Other"],
            datasets: [
              {
                label: "Employees",
                data: [89, 54, 37],
                backgroundColor: ["#F94144", "#F3722C", "#F9C74F"],
              },
            ],
          },
          options: {},
        },
      },
    },
    {
      type: PdfGenerationSectionType.CHART,
      options: {
        table: {
          title: "Age ranges distribution",
          subtitle: "Office employees",
          headers: ["Age range", "Employees"],
          rows: [
            ["<=24", 108],
            ["25-39", 43],
            ["40-55", 60],
            [">=56", 22],
          ],
        },
        chartConfiguration: {
          type: "pie",
          data: {
            labels: ["<=24", "25-39", "40-55", ">=56"],
            datasets: [
              {
                label: "Employees",
                data: [108, 43, 60, 22],
                backgroundColor: ["#F3722C", "#F9C74F", "#90BE6D", "#277DA1"],
              },
            ],
          },
          options: {},
        },
      },
    },
    {
      type: PdfGenerationSectionType.CHART,
      options: {
        table: {
          title: "City distribution",
          subtitle: "Office employees",
          headers: ["City", "Employees"],
          rows: [
            ["Milano", 45],
            ["Torino", 77],
            ["Venezia", 56],
            ["Roma", 61],
            ["Livorno", 21],
            ["Trento", 72],
            ["Lecco", 81],
            ["Cosenza", 32],
            ["Napoli", 44],
            ["Lecce", 69],
            ["Other", 45],
          ],
        },
        chartConfiguration: {
          type: "pie",
          data: {
            labels: [
              "Milano",
              "Torino",
              "Venezia",
              "Roma",
              "Livorno",
              "Trento",
              "Lecco",
              "Cosenza",
              "Napoli",
              "Lecce",
              "Other",
            ],
            datasets: [
              {
                label: "Employees",
                data: [45, 77, 56, 61, 21, 72, 81, 32, 44, 69, 45],
                backgroundColor: [
                  "#F94144",
                  "#F3722C",
                  "#F8961E",
                  "#F9844A",
                  "#F9C74F",
                  "#90BE6D",
                  "#43AA8B",
                  "#4D908E",
                  "#577590",
                  "#277DA1",
                ],
              },
            ],
          },
          options: {},
        },
      },
    },
  ];

  const generatedPdf = await pdfGenerator.generateReport({ sections });
  generatedPdf.pipe(createWriteStream("./tests/test.pdf"));
});
