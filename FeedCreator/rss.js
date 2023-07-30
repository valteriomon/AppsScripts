var makeRss = function (data={}) {

  var channel = XmlService.createElement('channel');
  var root = XmlService.createElement('rss').addContent(channel);
  root = addAttributes(root, {
    version: "2.0",
    xmlnsatom: "http://www.w3.org/2005/Atom",
    xmlnscontent: "http://purl.org/rss/1.0/modules/content/",
    xmlnswfw: "http://wellformedweb.org/CommentAPI/",
    xmlnsdc: "http://purl.org/dc/elements/1.1/",
    xmlnssy: "http://purl.org/rss/1.0/modules/syndication/",
    xmlnsslash: "http://purl.org/rss/1.0/modules/slash/",
  });

  var title = data.title || '';
  var link = data.link || '';
  var atomlink = data.atomlink || link;
  var description = data.description || '';
  var language = data.language || 'en-US';
  var updated = data.updated || new Date;
  var image = data.image || {};
  var items = {};

  if(data.items !== undefined) {
    data.items.forEach((item) => {
      addItem(item);
    });
  }

  function createElement (element, text) {
    return XmlService.createElement(element).setText(text);
  };

  function createCdataElement (element, cdata) {
    return XmlService.createElement(element).addContent(XmlService.createCdata(cdata));
  };

  function makeReplacements (xml, replacements) {
    for(replace in replacements) {
      xml = xml.replace(replace, replacements[replace]);
    }
    return xml;
  }

  function addAttributes(element, attributes) {
    for(attr in attributes) {
      element.setAttribute(attr, attributes[attr])
    }
    return element;
  }

  function addItem (args) {
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
      throw 'Invalid pubDate';
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
  }

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

    addItem: addItem,

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

      // Add image
      if(image.url !== undefined && image.title !== undefined) {
        channel.addContent(
          XmlService.createElement('image')
            .addContent(createElement('url', image.url))
            .addContent(createElement('title', image.title))
            .addContent(createElement('link', image.link))
            .addContent(createElement('width', image.width))
            .addContent(createElement('height', image.height))
        );
      }

      for (var i in items) {
        channel.addContent(
          XmlService.createElement('item')
            .addContent(createElement('title', items[i].title))
            .addContent(createElement('link', items[i].link))
            .addContent(createCdataElement('description', items[i].description))
            .addContent(createElement('pubDate', items[i].pubDate))
            .addContent(createElement('guid', items[i].guid))
        );
      }

      var document = XmlService.createDocument(root);
      
      var xml = XmlService.getPrettyFormat()
                          .setOmitDeclaration(true)
                          .setOmitEncoding(true)
                          .format(document);

      var result = makeReplacements(xml, {
        xmlnscontent: "xmlns:content",
        xmlnswfw: "xmlns:wfw",
        xmlnsdc: "xmlns:dc",
        xmlnsatom: "xmlns:atom",
        xmlnssy: "xmlns:sy",
        xmlnsslash: "xmlns:slash",
        atomlink: "atom:link",
        syupdatePeriod: "sy:updatePeriod",
        syupdateFrequency: "sy:updateFrequency"
      });

      return result;
    },
  };
};