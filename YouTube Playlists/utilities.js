function extractVideoId(url) {
  var match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function isMusicCategory(categoryId) {
  // Check if the category ID corresponds to a music-related category
  return categoryId === "10" || categoryId === "24";
}