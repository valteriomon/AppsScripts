function storeVideoId(videoId) {
  var cache = CacheService.getScriptCache();
  cache.put("videoId", videoId);
}

function getStoredVideoId() {
  var cache = CacheService.getScriptCache();
  return cache.get("videoId");
}