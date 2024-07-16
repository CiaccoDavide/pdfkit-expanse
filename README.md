# pdfkit expanse
_Easy PDF generation for NodeJS_

Features:
- markdown
- html
- plain text
- chartJS
- tables

---

_to ensure the correct rendering scale for the charts, make sure to have these libs on your system:_
- `cairo >= 1.18.0`
- `librsvg >= 2.57.0`

---


## Changelog

`v1.1.0`

- doc exposed with `getPDFDocument` method
- added support for custom fonts:
```js
  constructor({
    defaultFontFamily = "Helvetica",
    defaultFontFamilyBold = "Helvetica-Bold",
  } = {}) {
    this.doc = new PDFDocument({ size: "A4" });
    FONT_DEFAULT = defaultFontFamily;
    FONT_BOLD = defaultFontFamilyBold;
```

only Helvetica and Arial are supported out of the box, every other custom font has to be registered with `PDFDocument`'s `registerFont` method:
```ts
import PdfGenerator from 'pdfkit-expanse';

const pdfGenerator = new PdfGenerator({
  defaultFontFamily: "CustomFontFamily",
  defaultFontFamilyBold: "CustomFontFamily-Bold",
});

const doc: PDFDocument = pdfGenerator.getPDFDocument();
doc.registerFont("CustomFontFamily", "../assets/CustomFont.ttf");
doc.registerFont("CustomFontFamily-Bold", "../assets/CustomFontBold.ttf"); // optional

const input: PdfGenerationInput = {...};
const pdfStream: PassThrough = pdfGenerator.generateReport(input);
```

---

`v1.0.0`

*_Instance generation_*

```ts
import PdfGenerator from 'pdfkit-expanse';
const pdfGenerator = new PdfGenerator();
const input: PdfGenerationInput = {...};
await pdfGenerator.generateReport(input);
```

*_Static generation_*

```ts
import PdfGenerator from 'pdfkit-expanse';
const input: PdfGenerationInput = {...};
const pdfStream: PassThrough = await PdfGenerator.generateReport(input);
```
