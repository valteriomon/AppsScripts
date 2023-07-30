const ENV = setEnv([
  "GITHUB_ENDPOINT",
  "GITHUB_TOKEN",
  "GITHUB_COMMITER_NAME",
  "GITHUB_COMMITER_EMAIL"
]);

function doPost (event) {
  if (event.postData.length) {
    const formattedClippings = formatClippings(event.postData.contents);
    const base64data = Utilities.base64Encode(formattedClippings);
    sendToGithub(base64data);
    return respond("Saved!").json();
  } else {
    return respond("Missing clippings!", 400).json();
  }
}

function sendToGithub(content) {
  const timestamp = new Date().valueOf();
  const data = {
    "message": "Kindle clippings " + timestamp,
    "committer": { "name": ENV.GITHUB_COMMITER_NAME, "email": ENV.GITHUB_COMMITER_EMAIL },
    "content": content
  };
  const options = {
    'method' : 'put',
    "headers" : {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + ENV.GITHUB_TOKEN,
    },
    'payload' : JSON.stringify(data)
  };
  UrlFetchApp.fetch(ENV.GITHUB_ENDPOINT + timestamp + ".md", options);
}