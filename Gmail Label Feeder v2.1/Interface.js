/**
 * Gets an HTML preview for a feed.
 * @param {string} type The type of feed, either "user" or "query".
 * @param {string} intput The feed's input, either the user ID or search terms.
 * @param {number} numResults The number of items to include in the preview.
 * @returns {Object} An object with the properties "title" and "items", where
 *     items is an array of HTML snippets.
 * @throws If the input is invalid or the feed couldn't be previewed.
 */
function getPreview(type, input, numResults) {
  //input = validateInput_(type, input);
  var threads = null;
  if (type == 'label') {
    try {
      threads = getActivitiesByLabel_(input);
    } catch (e) {
      logError_(e, 'getPreview', arguments);
      throw 'Invalid profile ID or URL.';
    }
  } 
  var items = _.map(threads, function(item) {
    try {
      return getContentFromItem(item, {disableEmbed: true}); 
    } catch (e) {
      return 'Error generating preview.';
    }
  });
  return {
    title: "Messages for "+input,
    items: items.slice(0, numResults)
  };
}

/**
 * Add a feed to the user's library.
 * @param {string} type The type of feed, either "user" or "query".
 * @param {string} intput The feed's input, either the user ID or search terms.
 * @param {string} name The name of the feed.
 * @param {string} exclude The text of links to remove.
 * @returns {string} The URL of the new feed.
 * @throws If the input is invalid or the feed couldn't be added.
 */
function addFeed(type, input, name, exclude) {
  var userId = Session.getActiveUser().getUserLoginId();
  //input = validateInput_(type, input);
  var now = new Date().getTime();
  var feed;
  try {    
    feed = {
      type_: 'feed',
      user: userId,
      created: now,
      type: type,
      input: input,
      name: name,
      exclude: exclude
    };
  } catch (e) {
    logError_(e, 'addFeed', arguments);
    throw 'Unexpected error.';
  }
  var feedId = getUID();
  PropertiesService.getUserProperties().setProperty(feedId, JSON.stringify(feed));
  return getFeedUrl_(feedId);
}

/**
 * Gets RFC4122 version 4 compliant UUID. Based on http://stackoverflow.com/a/8809472/1027723
 * @return {String} uuid.
 */
function getUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid;
}

/**
 * Deletes a feed from the user's library.
 * @param {string} feedId The ID of the feed to delete.
 * @throws If the feed could not be found, doesn't belong to the user, or couldn't be deleted.
 */
function deleteFeed(feedId) {
  var userId = Session.getActiveUser().getUserLoginId();
  //var db = Script Db.getMyDb();
  var feed;
  try {
    //feed = db.load(feedId);
    PropertiesService.getUserProperties().deleteProperty(feedId);
  } catch (e) {
    logError_(e, 'deleteFeed');
    throw 'Unexpected error.';
  }
  /*if (!feed || feed.user != userId) {
    throw 'Feed not found.';
  }
  try {
    db.remove(feed);
  } catch (e) {
    logError_(e, 'deleteFeed', arguments);
    throw 'Unexpected error.';
  }*/
}

/**
 * Returns information about the feeds a user has in their library.
 * @returns {Object} A map with the keys "id", "created", "type", "input", and "url".
 */
function getFeeds() {
  var userId = Session.getActiveUser().getUserLoginId();
  //var db = Script Db.getMyDb();
  var feeds = [];
  try {
    var allFeeds = PropertiesService.getUserProperties().getProperties();
    /*var results = db.query({
      type_: 'feed',
      user: userId
    }).sortBy('created', db.DESCENDING).limit(100);
    while (results.hasNext()) {
      feeds.push(results.next());
    }*/
    for (i in allFeeds){
      var feed = JSON.parse(allFeeds[i]);
      feed.id = i;
      feeds.push(feed);
    }
  } catch (e) {
    logError_(e, 'getFeeds', arguments);
    throw 'Unexpected error.';
  }
  return _.map(feeds, function(feed) {
    return {
      id: feed.id,
      created: feed.created,
      type: feed.type,
      input: feed.input,
      name: feed.name,
      url: getFeedUrl_(feed.id)
    };
  });
}


/**
 * Returns information about the labels a user has in Gmail.
 * @returns {Object} A map with the keys "id", "created", "type", "input", and "url".
 */
function getLabels() {
  var labels = GmailApp.getUserLabels();
  var output = [];
  _.each(labels, function(label) {
    output.push(label.getName());
  });
  return output;
}


/**
 * Gets the URL for a given feed ID.
 * @param {string} feedId The ID of the feed.
 * @returns {string} The URL of the feed.
 * @private
 */
function getFeedUrl_(feedId) {
  var serverUrl = ScriptApp.getService().getUrl();
  return _.sprintf('%s?feedId=%s', serverUrl, encodeURIComponent(feedId));    
}
