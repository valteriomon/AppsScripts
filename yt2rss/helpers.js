/**
 * Helper function to make RSS atom feed.
 * Based on 
 * @link https://gist.github.com/thinkAmi/5996382
 */ 
var makeRss = function () {
  var channel = XmlService.createElement('channel');
  var root = XmlService.createElement('rss')
    .setAttribute('version', '2.0')
    .setAttribute('xmlnsatom', 'http://www.w3.org/2005/Atom')
    .addContent(channel);

  var title = '';
  var link = '';
  var description = '';
  var language = '';
  var atomlink = '';
  var updated = '';
  var items = {};

  var createElement = function (element, text) {
    return XmlService.createElement(element).setText(text);
  };

  return {
    setTitle: function (value) {
      title = value;
    },
    setLink: function (value) {
      link = value;
    },
    setDescription: function (value) {
      description = value;
    },
    setLanguage: function (value) {
      language = value;
    },
    setAtomlink: function (value) {
      atomlink = value;
    },
    setUpdated: function (value){
      updated = Utilities.formatDate(value, 'GMT', 'EEE, dd MMM yyyy HH:mm:ss Z');
    },

    addItem: function (args) {
      if (typeof args.title === 'undefined') {
        args.title = '';
      }
      if (typeof args.link === 'undefined') {
        args.link = '';
      }
      if (typeof args.description === 'undefined') {
        args.description = '';
      }
      if (!(args.pubDate instanceof Date)) {
        throw 'pubDate Missing';
      }
      if (typeof args.timezone === 'undefined') {
        args.timezone = 'GMT';
      }
      if (typeof args.guid === 'undefined' && typeof args.link === 'undefined') {
        throw 'GUID ERROR';
      }

      var item = {
        title: args.title,
        link: args.link,
        description: args.description,
        pubDate: Utilities.formatDate(args.pubDate, args.timezone, 'EEE, dd MMM yyyy HH:mm:ss Z'),
        guid: args.guid === 'undefined' ? args.link : args.link,
      };

      items[item.guid] = item;
    },

    toString: function () {
      channel.addContent(
        XmlService.createElement('atomlink')
          .setAttribute('href', atomlink)
          .setAttribute('rel', 'self')
          .setAttribute('type', 'application/rss+xml')
      );

      channel.addContent(createElement('title', title));
      channel.addContent(createElement('link', link));
      channel.addContent(createElement('description', description));
      channel.addContent(createElement('language', language));
      channel.addContent(createElement('updated', updated));

      for (var i in items) {
        channel.addContent(
          XmlService.createElement('item')
            .addContent(createElement('title', items[i].title))
            .addContent(createElement('link', items[i].link))
            .addContent(createElement('description', items[i].description))
            .addContent(createElement('pubDate', items[i].pubDate))
            .addContent(createElement('guid', items[i].guid))
        );
      }

      var document = XmlService.createDocument(root);
      
      var xml = XmlService.getPrettyFormat()
                          .setOmitDeclaration(true)
                          .setOmitEncoding(true)
                          .format(document);

      var result = xml.replace('xmlnsatom', 'xmlns:atom').replace('<atomlink href=', '<atom:link href=');

      return result;
    },
  };
};