(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BannerAdAdaptation = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const REQUIRED_COLUMNS = [
    'Variant_Name',
    'Width',
    'Height',
    'Headline',
    'Subheadline',
    'CTA_Text',
    'Image_URL',
  ];

  function parseCsv(csvInput) {
    if (typeof csvInput !== 'string' || csvInput.trim() === '') {
      throw new Error('CSV input must be a non-empty string.');
    }

    const matrix = parseCsvMatrix(csvInput);
    if (matrix.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headers = matrix[0].map((header) => String(header).trim());
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

    if (missingColumns.length > 0) {
      throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
    }

    const headerIndex = headers.reduce((acc, header, index) => {
      acc[header] = index;
      return acc;
    }, {});

    return matrix.slice(1).filter((row) => row.some((cell) => String(cell || '').trim() !== '')).map((row, rowIndex) => {
      const record = REQUIRED_COLUMNS.reduce((acc, column) => {
        const rawValue = row[headerIndex[column]];
        acc[column] = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue || '').trim();
        return acc;
      }, {});

      const width = Number(record.Width);
      const height = Number(record.Height);

      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        throw new Error(`Invalid Width/Height on CSV row ${rowIndex + 2}.`);
      }

      return {
        variantName: record.Variant_Name,
        width,
        height,
        headline: record.Headline,
        subheadline: record.Subheadline,
        ctaText: record.CTA_Text,
        imageUrl: record.Image_URL,
      };
    });
  }

  function parseCsvMatrix(csvInput) {
    const normalized = csvInput.replace(/\r\n?/g, '\n');
    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < normalized.length; i += 1) {
      const char = normalized[i];
      const next = normalized[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && char === ',') {
        row.push(value);
        value = '';
        continue;
      }

      if (!inQuotes && char === '\n') {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
        continue;
      }

      value += char;
    }

    row.push(value);
    rows.push(row);
    return rows;
  }

  function generateBannerBoards(rows, penpotApi, options) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('No rows were provided for board generation.');
    }

    const api = createPenpotApiAdapter(penpotApi);
    const settings = {
      startX: options && Number.isFinite(options.startX) ? options.startX : 0,
      startY: options && Number.isFinite(options.startY) ? options.startY : 0,
      boardGap: options && Number.isFinite(options.boardGap) ? options.boardGap : 40,
    };

    const createdBoards = [];
    let cursorY = settings.startY;

    rows.forEach((row) => {
      const boardName = `${row.variantName} - ${row.width}x${row.height}`;
      const board = api.createBoard({
        name: boardName,
        x: settings.startX,
        y: cursorY,
        width: row.width,
        height: row.height,
      });

      const layout = calculateAdaptiveLayout(row.width, row.height);

      api.createRectangle({
        boardId: board.id,
        name: 'Background',
        x: 0,
        y: 0,
        width: row.width,
        height: row.height,
        fills: [{ color: '#101820' }],
        constraints: { horizontal: 'stretch', vertical: 'stretch' },
      });

      if (row.imageUrl && api.createImage) {
        api.createImage({
          boardId: board.id,
          name: 'Hero Image',
          url: row.imageUrl,
          x: layout.image.x,
          y: layout.image.y,
          width: layout.image.width,
          height: layout.image.height,
          constraints: layout.image.constraints,
        });
      } else {
        api.createRectangle({
          boardId: board.id,
          name: 'Image Placeholder',
          x: layout.image.x,
          y: layout.image.y,
          width: layout.image.width,
          height: layout.image.height,
          fills: [{ color: '#2C3E50' }],
          strokes: [{ color: '#B0BEC5', width: 1 }],
          metadata: { imageUrl: row.imageUrl || '' },
          constraints: layout.image.constraints,
        });
      }

      api.createText({
        boardId: board.id,
        name: 'Headline',
        text: row.headline,
        x: layout.headline.x,
        y: layout.headline.y,
        width: layout.headline.width,
        height: layout.headline.height,
        style: {
          fontFamily: 'Inter',
          fontWeight: 700,
          fontSize: layout.headline.fontSize,
          lineHeight: 1.1,
          color: '#FFFFFF',
        },
        constraints: layout.headline.constraints,
      });

      api.createText({
        boardId: board.id,
        name: 'Subheadline',
        text: row.subheadline,
        x: layout.subheadline.x,
        y: layout.subheadline.y,
        width: layout.subheadline.width,
        height: layout.subheadline.height,
        style: {
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: layout.subheadline.fontSize,
          lineHeight: 1.3,
          color: '#DDE6ED',
        },
        constraints: layout.subheadline.constraints,
      });

      const ctaBackground = api.createRectangle({
        boardId: board.id,
        name: 'CTA Background',
        x: layout.cta.x,
        y: layout.cta.y,
        width: layout.cta.width,
        height: layout.cta.height,
        fills: [{ color: '#F39C12' }],
        radius: Math.round(layout.cta.height / 2),
        constraints: layout.cta.constraints,
      });

      api.createText({
        boardId: board.id,
        name: 'CTA Text',
        text: row.ctaText,
        x: layout.cta.x,
        y: layout.cta.y,
        width: layout.cta.width,
        height: layout.cta.height,
        style: {
          fontFamily: 'Inter',
          fontWeight: 700,
          fontSize: layout.cta.fontSize,
          textAlign: 'center',
          verticalAlign: 'middle',
          color: '#111111',
        },
        constraints: layout.cta.constraints,
      });

      createdBoards.push({
        board,
        ctaBackground,
      });

      cursorY += row.height + settings.boardGap;
    });

    return createdBoards;
  }

  function calculateAdaptiveLayout(width, height) {
    const padding = Math.max(12, Math.round(Math.min(width, height) * 0.06));
    const isWide = width / height >= 2;
    const isTall = height / width >= 1.5;

    if (isWide) {
      const textWidth = Math.max(120, Math.round(width * 0.58) - padding * 2);
      return {
        image: {
          x: Math.round(width * 0.62),
          y: 0,
          width: Math.round(width * 0.38),
          height,
          constraints: { horizontal: 'right', vertical: 'stretch' },
        },
        headline: {
          x: padding,
          y: padding,
          width: textWidth,
          height: Math.round(height * 0.36),
          fontSize: clamp(Math.round(height * 0.21), 14, 34),
          constraints: { horizontal: 'left', vertical: 'top' },
        },
        subheadline: {
          x: padding,
          y: Math.round(height * 0.42),
          width: textWidth,
          height: Math.round(height * 0.24),
          fontSize: clamp(Math.round(height * 0.12), 10, 20),
          constraints: { horizontal: 'left', vertical: 'top' },
        },
        cta: {
          x: padding,
          y: height - padding - Math.round(height * 0.24),
          width: clamp(Math.round(width * 0.23), 90, 210),
          height: clamp(Math.round(height * 0.2), 26, 52),
          fontSize: clamp(Math.round(height * 0.11), 10, 18),
          constraints: { horizontal: 'left', vertical: 'bottom' },
        },
      };
    }

    if (isTall) {
      const imageHeight = Math.round(height * 0.42);
      return {
        image: {
          x: 0,
          y: 0,
          width,
          height: imageHeight,
          constraints: { horizontal: 'stretch', vertical: 'top' },
        },
        headline: {
          x: padding,
          y: imageHeight + padding,
          width: width - padding * 2,
          height: Math.round(height * 0.18),
          fontSize: clamp(Math.round(width * 0.11), 14, 30),
          constraints: { horizontal: 'stretch', vertical: 'top' },
        },
        subheadline: {
          x: padding,
          y: imageHeight + padding + Math.round(height * 0.19),
          width: width - padding * 2,
          height: Math.round(height * 0.14),
          fontSize: clamp(Math.round(width * 0.07), 10, 18),
          constraints: { horizontal: 'stretch', vertical: 'top' },
        },
        cta: {
          x: padding,
          y: height - padding - clamp(Math.round(height * 0.09), 28, 54),
          width: width - padding * 2,
          height: clamp(Math.round(height * 0.09), 28, 54),
          fontSize: clamp(Math.round(width * 0.07), 10, 16),
          constraints: { horizontal: 'stretch', vertical: 'bottom' },
        },
      };
    }

    const imageHeight = Math.round(height * 0.5);
    return {
      image: {
        x: 0,
        y: 0,
        width,
        height: imageHeight,
        constraints: { horizontal: 'stretch', vertical: 'top' },
      },
      headline: {
        x: padding,
        y: imageHeight + padding,
        width: width - padding * 2,
        height: Math.round(height * 0.16),
        fontSize: clamp(Math.round(width * 0.08), 14, 30),
        constraints: { horizontal: 'stretch', vertical: 'top' },
      },
      subheadline: {
        x: padding,
        y: imageHeight + padding + Math.round(height * 0.15),
        width: width - padding * 2,
        height: Math.round(height * 0.12),
        fontSize: clamp(Math.round(width * 0.055), 10, 18),
        constraints: { horizontal: 'stretch', vertical: 'top' },
      },
      cta: {
        x: padding,
        y: height - padding - clamp(Math.round(height * 0.12), 30, 56),
        width: clamp(Math.round(width * 0.45), 100, 240),
        height: clamp(Math.round(height * 0.12), 30, 56),
        fontSize: clamp(Math.round(width * 0.05), 10, 18),
        constraints: { horizontal: 'left', vertical: 'bottom' },
      },
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createPenpotApiAdapter(rawApi) {
    if (!rawApi) {
      throw new Error('A Penpot API instance is required.');
    }

    return {
      createBoard(payload) {
        return invoke(rawApi, ['createBoard', 'createArtboard'], payload, 'Unable to create board.');
      },
      createRectangle(payload) {
        return invoke(
          rawApi,
          ['createRectangle', 'createRect', 'createShape'],
          normalizeShapePayload(payload),
          'Unable to create rectangle.',
        );
      },
      createText(payload) {
        return invoke(rawApi, ['createText'], payload, 'Unable to create text layer.');
      },
      createImage:
        typeof rawApi.createImage === 'function'
          ? (payload) => rawApi.createImage(payload)
          : null,
    };
  }

  function normalizeShapePayload(payload) {
    if (payload && !payload.type) {
      return Object.assign({ type: 'rectangle' }, payload);
    }
    return payload;
  }

  function invoke(api, methodNames, payload, errorMessage) {
    for (let index = 0; index < methodNames.length; index += 1) {
      const methodName = methodNames[index];
      if (typeof api[methodName] === 'function') {
        return api[methodName](payload);
      }
    }

    throw new Error(errorMessage);
  }

  function registerPluginMessageHandlers(pluginApi, uiApi) {
    const resolvedPluginApi = pluginApi || (typeof penpot !== 'undefined' ? penpot : null);
    const resolvedUiApi = uiApi || (resolvedPluginApi && resolvedPluginApi.ui ? resolvedPluginApi.ui : null);

    if (!resolvedPluginApi || !resolvedUiApi || typeof resolvedUiApi.onMessage !== 'function') {
      return false;
    }

    resolvedUiApi.onMessage(function (message) {
      if (!message || message.type !== 'generate-layouts') {
        return;
      }

      try {
        const rows = parseCsv(message.csv || '');
        const created = generateBannerBoards(rows, resolvedPluginApi);
        if (typeof resolvedUiApi.postMessage === 'function') {
          resolvedUiApi.postMessage({ type: 'generate-success', created: created.length });
        }
      } catch (error) {
        if (typeof resolvedUiApi.postMessage === 'function') {
          resolvedUiApi.postMessage({
            type: 'generate-error',
            message: error && error.message ? error.message : 'Unknown generation error.',
          });
        }
      }
    });

    return true;
  }

  return {
    REQUIRED_COLUMNS,
    parseCsv,
    generateBannerBoards,
    createPenpotApiAdapter,
    registerPluginMessageHandlers,
    calculateAdaptiveLayout,
  };
});
