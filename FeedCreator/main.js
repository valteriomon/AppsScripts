function doGet() {
  const data = hackernews();
  const xmlString = makeRss(data);
  return ContentService.createTextOutput(xmlString).setMimeType(ContentService.MimeType.TEXT);
}