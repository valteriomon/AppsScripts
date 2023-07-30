// https://www.daemonology.net/hn-daily/index.rss
function hackernews(){
  const feed = {
    title: "Hacker News Daily",
    link: ScriptApp.getService().getUrl(),
    description: "Daily top stories from Hacker News",
    image: {
      url: "https://news.ycombinator.com/y18.gif",
      title: "Hacker News",
      link: "https://news.ycombinator.com/news"
    },
    items: []
  };

  const xml = UrlFetchApp.fetch("https://www.daemonology.net/hn-daily/index.rss").getContentText();
  const document = XmlService.parse(xml);
  const root = document.getRootElement();
  const channel = root.getChild('channel');
  const items = channel.getChildren('item');
  items.forEach(item => {
    const pubDate = item.getChild('pubDate').getText();
    const description = item.getChild('description').getText();
    // var found = description.match(/<span class="storylink"><a href="(.+?)">(.+?)<\/a><\/span><br>\n<span class="postlink"><a href="(.+?)">\(comments\)<\/a><\/span>/g)
    const regexp = /<span class="storylink"><a href="(.+?)">(.+?)<\/a><\/span><br>\n<span class="postlink"><a href="(.+?)">\(comments\)<\/a><\/span>/g;
    const matches = description.matchAll(regexp);
    for (const match of matches) {
      const url = match[1];
      const title = match[2];
      const hnlink = match[3];
      feed.items.push({
        title: title,
        guid: hnlink,
        link: hnlink,
        pubDate: new Date(pubDate),
        description: `<a href="${url}" target="_blank">Link</a> - <a href="${hnlink}" target="_blank">Comments</a>`
      });
    }
  });
  return feed;
}