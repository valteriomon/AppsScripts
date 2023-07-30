/**
 * Serves a feed in response to an HTTP GET reqeust. The following query parameters are supported:
 * - feedId (required): The ID of the feed to retrieve.
 * - mimeType: The mime-type to return the feed with, either "atom" or "xml".
 * - disableCache: To disable the caching of feeds, for testing.
 * @param {Object} event The event object, which contains parameter values, etc.
 * @returns {TextOutput} The ATOM feed.
 */

function doGet(event) { 
  
  // Load parameters.
  var queryString = event.queryString;
  // var feedId = event.parameter.feedId;
  // var messageid = event.parameter.messageid;
  var mimeType = ContentService.MimeType.ATOM;
  // var disableCache = event.parameter.disableCache;
  // if(queryString === "" && Session.getActiveUser().getUserLoginId() === Session.getEffectiveUser().getUserLoginId()){ // only render user interface for script owner
  //   var template = HtmlService.createTemplateFromFile('Index');
  //   return template.evaluate().setTitle('Gmail Label Feed');
  // }
  
  
  // // Ensure the feed ID is valid.
  // if (!feedId) {
  //   throw "The query parameter 'feedId' is required.";
  // }
  // //var feed = Script Db.getMyDb().load(feedId);
  // var feed = JSON.parse(PropertiesService.getUserProperties().getProperty(feedId));
  // if (!feed) {
  //   throw "Invalid feed ID: " + feedId;
  // }
 
  var xmlString = null;
  
  // // Check the cache.
  // if (!disableCache) {
  //   var cache = CacheService.getPublicCache();
  //   xmlString = cache.get(feedId+messageid);
  // }
  var mimeType = event.parameter.mimeType == 'xml' ? ContentService.MimeType.XML : ContentService.MimeType.ATOM;
   
  if (!xmlString) {
    // if (!messageid){
      var threads = null;
      // threads = getActivitiesByLabel_(feed.input);
      const playlistId = "PL96C35uN7xGLLeET0dOWaKHkAlPsrkcha";
      const playlistName = getPlaylistName(playlistId);
      const playlistVideos = getPlaylistVideos(playlistId);

      var selfUrl = ScriptApp.getService().getUrl() + '?' + queryString;
      // Convert to atom feed.
      var xmlString = convertVideoToAtom(playlistVideos, playlistName, selfUrl);
    // } else {
    //   var xmlString = cleanBody(GmailApp.getMessageById(messageid).getBody(),feed.exclude);
    // }
    // Store in the cache.
    // if (!disableCache) {
    //   try {
    //     var cache = CacheService.getPublicCache();
    //     cache.put(feedId+messageid, xmlString, CACHE_TIME_MINUTES * 60);
    //   } catch(e) {
    //     // Return feed.
    //     // if (!messageid){
    //       return ContentService.createTextOutput(xmlString).setMimeType(mimeType);
    //     // } else {
    //     //   return HtmlService.createHtmlOutput(xmlString);
    //     // }
    //   }
    // }
  }
  // Return feed.
  // if (!messageid){
    return ContentService.createTextOutput(xmlString).setMimeType(mimeType);
  // } else {
  //   return HtmlService.createHtmlOutput(xmlString);
  // }
}

function getPlaylistName(playlistId){
  try {
    // @see: https://developers.google.com/youtube/v3/docs/playlists/list
    const response = YouTube.Playlists.list('snippet', {
      id: playlistId,
    });
    
    if (!response || response.items.length === 0) {
      Logger.log('No Playlist found.');
      return;
    }
    return response.items[0].snippet.title;
  } catch (err) {
    Logger.log('Failed with err %s', err.message);
  }
}

function getPlaylistVideos(playlistId) {
  const playlistVideos = [];
  try {
    let nextPageToken = null;
    do {
      // @see: https://developers.google.com/youtube/v3/docs/playlistItems/list
      const response = YouTube.PlaylistItems.list('snippet', {
        playlistId: playlistId,
        maxResults: 25,
        pageToken: nextPageToken
      });
      
      if (!response || response.items.length === 0) {
        Logger.log('No Playlist found.');
        break;
      }
      
      for (let j = 0; j < response.items.length; j++) {
        const playlistItem = response.items[j];
        const videoItem = {};
        videoItem.title = playlistItem.snippet.title;
        videoItem.description = playlistItem.snippet.description;
        videoItem.url = "https://www.youtube.com/watch?v=" + playlistItem.snippet.resourceId.videoId;
        videoItem.publishedAt = playlistItem.snippet.publishedAt;
        playlistVideos.push(videoItem);
        
      }
      nextPageToken = response.nextPageToken;
    } while (nextPageToken);

  } catch (err) {
    Logger.log('Failed with err %s', err.message);
  }
  return playlistVideos;
}

/**
 * Converts an activities feed to an ATOM feed.
 * @param {Object} threads The the gmail threads.
 * @param {string} name The label being used.
 * @param {string} selfUrl The URL this feed is being served from.
  * @returns {Array} A shorthand XML Array of the ATOM feed.
 */
function convertVideoToAtom(playlistVideos, name, selfUrl) { 
  var rss = makeRss();

  rss.setTitle(name);
  rss.setLink(selfUrl);
  rss.setDescription(name);
  rss.setLanguage('en');
  rss.setAtomlink(selfUrl);
  rss.setUpdated(new Date);

  for (let i = 0; i < playlistVideos.length; i++) {
    const videoItem = playlistVideos[i];

    rss.addItem({
      title: videoItem.title,
      guid: videoItem.url,
      link: videoItem.url,
      description: videoItem.description,
      pubDate: new Date(videoItem.publishedAt),
    });
  }

  return rss.toString();
}

