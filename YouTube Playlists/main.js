function doGet(request) {
  var action = request.parameter.action;

  if (action === "getRandomVideo") {
    return ContentService.createTextOutput(getRandomPlaylistVideo());
  } else if (action === "removeVideo") {
    var videoId = getStoredVideoId();

    if (videoId) {
      var removedFromPlaylists = removeVideoFromPlaylists(videoId);	
      return ContentService.createTextOutput(removedFromPlaylists.toString());
    } else {
      return ContentService.createTextOutput("No video URL stored for removal.");
    }
  } else if (action === "storeVideoUrl") {
    var videoUrl = request.parameter.videoUrl;
    var videoId = extractVideoId(videoUrl);
    storeVideoId(videoId);
    return ContentService.createTextOutput("Video URL stored successfully.");
  }

  return ContentService.createTextOutput("Invalid action.");
}

function getRandomPlaylistVideo() {
  var playlists = YouTube.Playlists.list("snippet", { mine: true, maxResults: 50 }); // Adjust maxResults as needed
  var playlistIds = playlists.items
    .filter(function(playlist) {
      // Filter out playlists with videos in music-related categories
      var playlistItems = YouTube.PlaylistItems.list("snippet", { playlistId: playlist.id, maxResults: 1 });
      if (playlistItems.items.length > 0) {
        var contentDetails = YouTube.Videos.list("snippet", { id: playlistItems.items[0].snippet.resourceId.videoId });
        if (contentDetails.items.length > 0) {
          var categoryId = contentDetails.items[0].snippet.categoryId;
          return !isMusicCategory(categoryId);
        }
      }
      return true;
    })
    .map(function(playlist) {
      return playlist.id;
    });

  var videos = [];
  playlistIds.forEach(function(playlistId) {
    var playlistItems = YouTube.PlaylistItems.list("snippet", { playlistId: playlistId, maxResults: 50 }); // Adjust maxResults as needed
    playlistItems.items.forEach(function(item) {
      videos.push("https://www.youtube.com/watch?v=" + item.snippet.resourceId.videoId);
    });
  });

  var randomIndex = Math.floor(Math.random() * videos.length);
  var randomVideoUrl = videos[randomIndex];

  storeVideoId(extractVideoId(randomVideoUrl));

  return randomVideoUrl;
}

function removeVideoFromPlaylists(videoId) {
  var playlists = YouTube.Playlists.list("snippet", { mine: true, maxResults: 50 }); // Adjust maxResults as needed
  var removedFromPlaylists = [];

  var playlistIds = playlists.items
  .filter(function(playlist) {
    // Filter out playlists with videos in music-related categories
    var playlistItems = YouTube.PlaylistItems.list("snippet", { playlistId: playlist.id, maxResults: 1 });
    if (playlistItems.items.length > 0) {
      var contentDetails = YouTube.Videos.list("snippet", { id: playlistItems.items[0].snippet.resourceId.videoId });
      if (contentDetails.items.length > 0) {
        var categoryId = contentDetails.items[0].snippet.categoryId;
        return !isMusicCategory(categoryId);
      }
    }
    return true;
  })
  .map(function(playlist) {
    return playlist.id;
  });

  var removedFromPlaylists = [];

  playlistIds.forEach(function(playlistId) {

    var playlistItems = YouTube.PlaylistItems.list("snippet", { playlistId: playlistId, maxResults: 50 }); // Adjust maxResults as needed
    playlistItems.items.forEach(function(item) {
      if (item.snippet.resourceId.videoId === videoId) {
        var videoDetails = YouTube.Videos.list("snippet", { id: videoId });
        var videoTitle = videoDetails.items[0].snippet.title;
        var playlistDetails = YouTube.Playlists.list("snippet", { id: playlistId });
        var playlistTitle = playlistDetails.items[0].snippet.title;

        // Store the removed video information in a spreadsheet
        var spreadsheetId = "1JHSzo2PiTNiTxqF_q0mH2a-lp2PJK1rnrqbY75LX5xc";
        var sheet = SpreadsheetApp.openById(spreadsheetId).getSheets()[0];
        sheet.appendRow(["https://www.youtube.com/watch?v=" + videoId, videoTitle, playlistId, playlistTitle]);

        YouTube.PlaylistItems.remove(item.id);
        removedFromPlaylists.push(playlistId);
      }
    });
  });

  return removedFromPlaylists;
}
