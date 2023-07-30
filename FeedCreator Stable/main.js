function doGet() {
  const mimeType = ContentService.MimeType.TEXT;
  const data = hackernews();
  const xmlString = makeRss(data).toString();
  return ContentService.createTextOutput(xmlString).setMimeType(mimeType);
}