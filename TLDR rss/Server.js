// The maximum amount of time that raw feed data should be cached for.
var CACHE_TIME_MINUTES = 30;

/**
 * A helper function to include an HTML file, for use within HtmlTemplates.
 * @param {HtmlOutput} output The current output object.
 * @param {string} name The name of the HTML file, extension optional.
 * @private
 */
function includeFile_(output, name) {
  output.append(HtmlService.createTemplateFromFile(name).evaluate().getContent());
}


/**
 * Serves a feed in response to an HTTP GET reqeust. The following query parameters are supported:
 * - feedId (required): The ID of the feed to retrieve.
 * - mimeType: The mime-type to return the feed with, either "atom" or "xml".
 * - disableCache: To disable the caching of feeds, for testing.
 * @param {Object} event The event object, which contains parameter values, etc.
 * @returns {TextOutput} The ATOM feed.
 */
function doGetTest() {
  doGet({
    queryString: "feedId=7d994b7d-6360-4873-915d-e982d579cc19",
    parameter: {
      feedId: "7d994b7d-6360-4873-915d-e982d579cc19"
    }
  })
}

function doGet(event) { 
  
  // Load parameters.
  var queryString = event.queryString;
  var feedId = event.parameter.feedId;
  var messageid = event.parameter.messageid;
  var mimeType = ContentService.MimeType.ATOM;
  // var disableCache = event.parameter.disableCache;
  if(queryString === "" && Session.getActiveUser().getUserLoginId() === Session.getEffectiveUser().getUserLoginId()){ // only render user interface for script owner
    var template = HtmlService.createTemplateFromFile('Index');
    return template.evaluate().setTitle('Gmail Label Feed');
  }
  
  
  // Ensure the feed ID is valid.
  if (!feedId) {
    throw "The query parameter 'feedId' is required.";
  }
  //var feed = Script Db.getMyDb().load(feedId);
  var feed = JSON.parse(PropertiesService.getUserProperties().getProperty(feedId));
  if (!feed) {
    throw "Invalid feed ID: " + feedId;
  }
 
  var xmlString = null;
    
  // Check the cache.
  // if (!disableCache) {
  //   var cache = CacheService.getPublicCache();
  //   xmlString = cache.get(feedId+messageid);
  // }
  var mimeType = event.parameter.mimeType == 'xml' ? ContentService.MimeType.XML : ContentService.MimeType.ATOM;
   
  if (!xmlString) {
    if (!messageid){
      var threads = null;
      threads = getActivitiesByLabel_(feed.input);
      var selfUrl = ScriptApp.getService().getUrl() + '?' + queryString;
      // Convert to atom feed.
      var xmlString = convertActivitiesToAtom_(threads, feed.input, selfUrl);
    }
    // else {
      // var xmlString = cleanBody(GmailApp.getMessageById(messageid).getBody(),feed.exclude);
      // var xmlString = JSON.stringify(getBlocks(GmailApp.getMessageById(messageid).getBody()));
    // }
    // Store in the cache.
    // if (!disableCache) {
    //   try {
    //     var cache = CacheService.getPublicCache();
    //     cache.put(feedId+messageid, xmlString, CACHE_TIME_MINUTES * 60);
    //   } catch(e) {
    //     // Return feed.
    //     if (!messageid){
    //       return ContentService.createTextOutput(xmlString).setMimeType(mimeType);
    //     } else {
    //       return HtmlService.createHtmlOutput(xmlString);
    //     }
    //   }
    // }
  }
  // Return feed.
  if (!messageid){
    return ContentService.createTextOutput(xmlString).setMimeType(mimeType);
    // return ContentService.createTextOutput(threads[1].getMessages()[0].getBody());
  } else {
    return HtmlService.createHtmlOutput(xmlString);
    // return HtmlService.createHtmlOutput(threads[1].getMessages()[0].getBody());
  }
}


/**
 * Gets the Gmail threads for a label.
 * @param {string} label The Gmail label.
 * @param {integer} optNumResults optional number of results.
 * @returns {Object} The message threads.
 */
function getActivitiesByLabel_(label, optNumResults) {
  var numResults = optNumResults || 10;
  var search =  "label:"+label
  var threads = GmailApp.search(search, 0, numResults);  
  return threads;
}

/**
 * Converts an activities feed to an ATOM feed.
 * @param {Object} threads The the gmail threads.
 * @param {string} name The label being used.
 * @param {string} selfUrl The URL this feed is being served from.
 * @returns {Array} A shorthand XML Array of the ATOM feed.
 */
function convertActivitiesToAtom_(threads, name, selfUrl) { 
  var rss = makeRss();

  rss.setTitle(name);
  rss.setLink(selfUrl);
  rss.setDescription('TLDR Tech');
  rss.setLanguage('en');
  rss.setAtomlink(selfUrl);
  rss.setUpdated(new Date);
  
  threads.forEach(function(item) {
    var message = item.getMessages()[0]; // get first message
   
    var blocks = getBlocks(message.getBody());

    blocks.forEach(block => {
      rss.addItem({
        title: block.title,
        guid: block.link,
        link: block.link,
        description: block.description,
        pubDate: message.getDate(),
      });
    })
  });

  return rss.toString();
}

function getBlocks(html) {
  var regex = /<a href="(http[^>]+?)"><span><strong>([\s\S]+?)<\/strong><\/span><\/a><br><br><span[\s\S]+?>([\s\S]+?)<\/span>/g;
  var matches = html.match(regex);
  var items = [];

  if (matches) {
    for (var i = 0; i < matches.length; i++) {
      var match = matches[i];
      regex.lastIndex = 0;
      var result = regex.exec(match);
      
      if (result && result.length === 4) {
       
        var title = result[2];
        var description = result[3];
        var link = result[1];
        var linkMatch = link.match(/https?:\/\/tracking\.tldrnewsletter\.com\/CL0\/(.+?)(?:%3Futm_source=|\/1\/).+/);

        if (linkMatch && linkMatch[1]) {
          link = decodeURIComponent(linkMatch[1]);
        }

        if (!/\((Sponsor)\)/i.test(title)) {
          items.push({
            link: link,
            title: title,
            description: description
          });
        }
      }
    }
  }
  return items;
}



/**
 * Gets the HTML content for an activity item.
 * @param {Object} item The item to render.
 * @param {Object} opt_options An optional map of options to use when rendering.
 * @returns {string} The rendered content.
 */
function getContentFromItem(item, opt_options) {
  var options = opt_options || {};
  try {
    return renderTemplate_('Item', {
      'item': item,
      'options': options
    });
  } catch (e) {
    throw 'Unable to get content for feed item.';
  }
}

/**
 * Renders a template using the parameters provided.
 * @param {string} name The name of the template.
 * @param {Object.<string, ?>} params A map of parameters to provide to the template.
 * @returns {string} The rendered HTML.
*/
function renderTemplate_(name, params) {
  var template = HtmlService.createTemplateFromFile(name);
  // _.each(params, function(value, key) {
  //   template[key] = value;
  // });
  Object.entries(params).forEach(([key, value]) => {
    template[key] = value;
  });
  return template.evaluate().getContent();
}

/**
 * Logs an error to a persistent store for later analysis.
 * @param {string} error The error message.
 * @param {string} opt_functionName The name of the function that encountered the error.
 * @param {Array} opt_args The arguments to the function.
 */ 
function logError_(error, opt_functionName, opt_args) {
  var spreadsheetId = getStaticScriptProperty_('error.log.spreadsheet.id');
  var spreadsheetName = getStaticScriptProperty_('error.log.sheet.name');
  var functionName = opt_functionName ? opt_functionName : null;
  var args = opt_args ? Array.prototype.slice.call(opt_args) : [];
  for (var i = 0; i < args.length; i++) {
    if (args[i] instanceof Object) {
      args[i] = JSON.stringify(args[i]);
    }
  }
  try {
    SpreadsheetApp.openById(spreadsheetId).getSheetByName(spreadsheetName).appendRow([
      new Date(),
      error,
      functionName,
      args.join(', ')
    ]);
  } catch (e) {
    // Do nothing.
  }
}

/**
 * Gets a static script property, using long term caching.
 * @param {string} key The property key.
 * @returns {string} The property value.
 */
function getStaticScriptProperty_(key) {
  var value = CacheService.getPublicCache().get(key);
  if (!value) {
    value = PropertiesService.getScriptProperties().getProperty(key);
    CacheService.getPublicCache().put(key, value, 21600);
  }
  return value;
}

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