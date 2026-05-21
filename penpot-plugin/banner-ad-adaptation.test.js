const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCsv,
  generateBannerBoards,
  calculateAdaptiveLayout,
} = require('./banner-ad-adaptation');

test('parseCsv maps required columns', () => {
  const csv = [
    'Variant_Name,Width,Height,Headline,Subheadline,CTA_Text,Image_URL',
    'Summer Sale,300,250,Big Savings,Up to 50% off,Shop Now,https://example.com/image.jpg',
  ].join('\n');

  const parsed = parseCsv(csv);
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], {
    variantName: 'Summer Sale',
    width: 300,
    height: 250,
    headline: 'Big Savings',
    subheadline: 'Up to 50% off',
    ctaText: 'Shop Now',
    imageUrl: 'https://example.com/image.jpg',
  });
});

test('generateBannerBoards creates one board per row with expected naming', () => {
  const calls = [];
  let idCounter = 1;

  const api = {
    createBoard(payload) {
      calls.push({ type: 'board', payload });
      return { id: `board-${idCounter++}` };
    },
    createRectangle(payload) {
      calls.push({ type: 'rectangle', payload });
      return { id: `rect-${idCounter++}` };
    },
    createText(payload) {
      calls.push({ type: 'text', payload });
      return { id: `text-${idCounter++}` };
    },
    createImage(payload) {
      calls.push({ type: 'image', payload });
      return { id: `img-${idCounter++}` };
    },
  };

  const rows = [
    {
      variantName: 'Launch',
      width: 300,
      height: 250,
      headline: 'Headline 1',
      subheadline: 'Subheadline 1',
      ctaText: 'CTA 1',
      imageUrl: 'https://example.com/1.jpg',
    },
    {
      variantName: 'Launch',
      width: 728,
      height: 90,
      headline: 'Headline 2',
      subheadline: 'Subheadline 2',
      ctaText: 'CTA 2',
      imageUrl: 'https://example.com/2.jpg',
    },
  ];

  const created = generateBannerBoards(rows, api, { startX: 50, startY: 100, boardGap: 10 });

  assert.equal(created.length, 2);
  const boardCalls = calls.filter((call) => call.type === 'board');
  assert.deepEqual(
    boardCalls.map((call) => call.payload.name),
    ['Launch - 300x250', 'Launch - 728x90'],
  );
  assert.equal(boardCalls[0].payload.x, 50);
  assert.equal(boardCalls[0].payload.y, 100);
  assert.equal(boardCalls[1].payload.y, 360);
});

test('calculateAdaptiveLayout handles wide and tall sizes', () => {
  const wide = calculateAdaptiveLayout(728, 90);
  const tall = calculateAdaptiveLayout(160, 600);

  assert.equal(wide.image.constraints.horizontal, 'right');
  assert.equal(tall.image.constraints.vertical, 'top');
  assert.ok(tall.cta.width > 0);
});
