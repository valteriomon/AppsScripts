const formatClippings = (clippingsContent) => {
  const rawBlocks = readMyClippingsFile(clippingsContent);
  const parsedBlocks = parseRawBlocks(rawBlocks);
  const books = groupToBooks(parsedBlocks);
  
  let formattedClippings = "";
  for(let i = 0; i < books.length; i++) {
      formattedClippings += "## " + books[i].title + "\n\n";
      const annotations = books[i].annotations;
      for(let j = 0; j < annotations.length; j++) {
          formattedClippings += annotations[j].content + "\n\n";
      }
  }

  return formattedClippings;
}

const toBooks = (blocks) => {
    return blocks.reduce((acc, block) => {
        const book = acc.find((b) => b.title === block.title);
        if (book == null) {
            return [
                ...acc,
                {
                    title: block.title,
                    author: block.authors,
                    annotations: [],
                },
            ];
        }
        return acc;
    }, []);
};

const inBetween = (value, range) => {
    if (value == null || (range === null || range === void 0 ? void 0 : range.from) == null || range.to == null) {
        return false;
    }
    return value >= range.from && value <= range.to;
};

const twoWayIncludes = (value1, value2) => {
    return value1.includes(value2) || value2.includes(value1);
};

const uniqWith = (arr, comparator) => {
    let uniques = [];
    for (let a of arr) {
        if (uniques.findIndex(u => comparator(a, u)) === -1) {
        uniques.push(a);
        }
    }
    return uniques;
}

function groupToBooks(parsedBlocks) {
    const books = toBooks(parsedBlocks);
    const clone = [...parsedBlocks];
    const reversedBlocks = clone.reverse();    
    let dedupedBlocks = uniqWith(reversedBlocks, (block1, block2) => {
        let _a, _b;
        return (block1.title === block2.title &&
            block1.type === block2.type &&
            ((_a = block1.location) === null || _a === void 0 ? void 0 : _a.from) === ((_b = block2.location) === null || _b === void 0 ? void 0 : _b.from) &&
            twoWayIncludes(block1.content, block2.content));
    });
    dedupedBlocks = dedupedBlocks.reverse();
    dedupedBlocks
        .filter((b) => b.type !== 'NOTE')
        .filter((b) => b.content !== '')
        .forEach((block) => {
        const book = books.find((r) => r.title === block.title);
        book.annotations.push({
            content: block.content,
            type: block.type,
            page: block.page,
            location: block.location,
            createdDate: block.dateOfCreation,
        });
    });
    dedupedBlocks
        .filter((b) => b.type === 'NOTE')
        .filter((b) => b.content !== '')
        .forEach((noteBlock) => {
        const book = books.find((r) => r.title === noteBlock.title);
        const annotation = book.annotations.find((a) => { let _a; return inBetween((_a = noteBlock.location) === null || _a === void 0 ? void 0 : _a.from, a.location); });
        if (annotation != null) {
            annotation.note = noteBlock.content;
        }
    });
    return books;
}

const EntryTypeTranslations = Object.freeze({
    NOTE: ['note', 'nota', '的笔记'],
    HIGHLIGHT: [
        'highlight',
        'subrayado',
        'surlignement',
        '的标注',
        'destaque',
        'evidenziazione',
    ],
    BOOKMARK: ['bookmark', 'marcador', 'signet', '的书签'],
});

const toNumber = (value) => {
    return Number(value) || undefined;
};

class ParsedBlock {
    constructor(rawBlock) {
        this.rawBlock = rawBlock;
        this.parseTitleAndAuthor();
        this.parseMetadata();
        this.parseContent();
    }
    parseContent() {
        if (this.rawBlock.contentLines.length === 0) {
            this.content = '';
        }
        else if (this.type === 'BOOKMARK') {
            this.content = '';
        }
        else {
            this.content = this.rawBlock.contentLines;
        }
    }
    parseTitleAndAuthor() {
        const bookTitleAndAuthors = this.rawBlock.titleLine;
        const matches = bookTitleAndAuthors.match(/.*\(([^)]+)\)$/);
        if (matches) {
            const parenthesesIndex = bookTitleAndAuthors.indexOf(`(${matches[1]})`);
            this.title = bookTitleAndAuthors.substring(0, parenthesesIndex).trim();
            this.authors = matches[1];
        }
        else {
            this.title = bookTitleAndAuthors.trim();
        }
    }
    parseMetadata() {
        const sections = this.rawBlock.metadataLine.split('|').map((s) => s.trim());
        if (sections.length < 2) {
            throw new Error(`Invalid metadata entry. Expected a page and/or location and created date entry: ${this.rawBlock.metadataLine}`);
        }
        const [firstSection, secondSection] = sections;
        this.type = this.parseEntryType(firstSection);
        this.dateOfCreation = sections[sections.length - 1];
        if (sections.length === 3) {
            this.page = this.parseSectionForNumber(firstSection);
            this.location = this.parseSectionForNumber(secondSection);
        }
        else if (this.authors === undefined ||
            firstSection.toLowerCase().includes('page')) {
            this.page = this.parseSectionForNumber(firstSection);
        }
        else {
            this.location = this.parseSectionForNumber(firstSection);
        }
    }
    parseSectionForNumber(section) {
        const matches1 = section.match(/(\d+)-?(\d+)?/);
        if (matches1) {
            const [, from, to] = matches1;
            return {
                from: toNumber(from),
                to: to == null ? toNumber(from) : toNumber(to),
                display: from,
            };
        }
        const matches2 = section.match(/^.* (.*)$/);
        if (matches2) {
            const from = matches2[1].replace(/-.*/, '');
            return {
                from: toNumber(from),
                to: toNumber(from),
                display: from,
            };
        }
        throw new Error(`Can't parse page number from pageMetadataStr: ${section}`);
    }

    parseEntryType(pageMetadata) {
        const pageMetaDate = pageMetadata.toLowerCase();
        const isTypeNote = EntryTypeTranslations.NOTE.some((token) => pageMetaDate.includes(token));
        const isTypeHighlight = EntryTypeTranslations.HIGHLIGHT.some((token) => pageMetaDate.includes(token));
        const isTypeBookmark = EntryTypeTranslations.BOOKMARK.some((token) => pageMetaDate.includes(token));
        if (isTypeNote) {
            return 'NOTE';
        }
        else if (isTypeHighlight) {
            return 'HIGHLIGHT';
        }
        else if (isTypeBookmark) {
            return 'BOOKMARK';
        }
        return 'UNKNOWN';
    }
}

const RawBlock = function(titleLine, metadataLine, contentLines) {
    this.titleLine = titleLine;
    this.metadataLine = metadataLine;
    this.contentLines = contentLines;
}

RawBlock.prototype.parse = function(lines) {
    const [title, metadata, ...content] = lines.filter((el) => el.trim() !== '');
    return new RawBlock(title, metadata, content.join('\n'));
}

function readMyClippingsFile(fileContent) {
    const lines = fileContent.split('\n');
    const blocks = [];
    let blockLinesBuffer = [];
    for (const [index, line] of lines.entries()) {
        try {
            if (line.includes('==========')) {
                blocks.push(RawBlock.prototype.parse(blockLinesBuffer));
                blockLinesBuffer = [];
            } else {
                blockLinesBuffer.push(line.trim());
            }
        }
        catch (error) {
            console.error(`Error parsing on line: ${index + 1}`);
            throw error;
        }
    }
    return blocks.filter((b) => b.titleLine != null);
}

function parseRawBlocks(rawBlocks) {
    const parsedBlocks = [];
    rawBlocks.forEach((entry) => {
        try {
            parsedBlocks.push(new ParsedBlock(entry));
        }
        catch (error) {
            console.error('Could not parse entry in clippings file', entry);
            throw error;
        }
    });
    return parsedBlocks;
}