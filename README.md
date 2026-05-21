# opbrix

## Banner Ad Adaptation & Production (Penpot Plugin)

This repository now includes a minimal Penpot plugin scaffold for generating ad variants from CSV.

### Files

- `/home/runner/work/opbrix/opbrix/penpot-plugin/banner-ad-adaptation.js`
  - Core utility logic for:
    - CSV parsing (`Variant_Name,Width,Height,Headline,Subheadline,CTA_Text,Image_URL`)
    - Board creation (`[Variant_Name] - [Width]x[Height]`)
    - Adaptive placement for background, text, CTA, and image/placeholder layers
    - Penpot API adapter and plugin panel message handling
- `/home/runner/work/opbrix/opbrix/penpot-plugin/panel.html`
  - Plugin panel UI with CSV upload, text area, and **Generate Layouts** button.
- `/home/runner/work/opbrix/opbrix/penpot-plugin/banner-ad-adaptation.test.js`
  - Focused Node tests for parsing and board generation behavior.

### Example plugin usage

```js
const {
  parseCsv,
  generateBannerBoards,
  registerPluginMessageHandlers,
} = require('./penpot-plugin/banner-ad-adaptation');

// Register panel message listener (inside plugin entrypoint)
registerPluginMessageHandlers(penpot, penpot.ui);

// Or run directly from a CSV string:
const rows = parseCsv(csvString);
generateBannerBoards(rows, penpot);
```
