const ENV = setEnv([
  "SPREADSHEET_ID",
  "HACKERBOOK",
  "P2K_URL",
  "FROM_EMAIL",
  "TO_EMAIL"
]);

function doGet(event) {
  const sheet = new Sheet(ENV.SPREADSHEET_ID);
  const sheetHn = sheet[0];

  if (event.parameter.clean !== undefined) {
    sheetHn.clean();
    return respond("Clean sheet!").text();
  }

  if (event.parameter.delete !== undefined) {
    const ids = sheetHn.getFirstColumnValues();

    ids.forEach((id, i) => {
      if(event.parameter.delete == id[0]){
        sheetHn.deleteRow(i+1);
      }
    });
  }

  if(event.parameter.url !== undefined) {
    let response, title, hn, url = event.parameter.url;

    if(/^https:\/\/news.ycombinator.com/.test(url)) {
      hn = url.match(/id=(\d+)/)[1];
      const rawData = UrlFetchApp.fetch(`https://hacker-news.firebaseio.com/v0/item/${hn}.json`);
      const parsedData = JSON.parse(rawData);
      url = parsedData.url;
      title = parsedData.title;
    } else if(event.parameter.title !== undefined) {
      title = event.parameter.title;
    }

    const sendToKindleResponse = sendToKindle(title, url);
    if(sendToKindleResponse === true) {
      if(event.parameter.hn !== undefined && /^\d+$/.test(event.parameter.hn)) {
        hn = event.parameter.hn;
      }

      if(hn) {
        const row = {
          id: hn,
          title: title,
          hackernews: "https://news.ycombinator.com/item?id=" + hn,
          hackerweb: "https://hackerweb.app/#/item/" + hn,
          hackerbook: ENV.HACKERBOOK + "?id=" + hn
        }
        sheetHn.addRow(row);
      } else {
        sheet[1].addRow({
          url: url
        });
      }

      if(event.parameter.newwindow !== undefined) {
        response = respond('<html><head></head><body><h1>Sent to kindle!</h1><body></html>').html();
      } else {
        response = respond('(function(){console.log("Sent to kindle!")})()').js();
      }
    } else {
      response = respond(sendToKindleResponse).text();
    }
    return response;
  }

  return respond(sheetHn.getData()).json();
}

function doPost(event) {
  const body = event.postData.contents;
  try {
    const data = JSON.parse(body);
    if(data.items) {
        const article = data.items[0];
        sendToKindle(article.title, article.canonical[0].href);
    }
  } catch(e) {
    Logger.log(e);
  }
}

function sendToKindle(title, url) {
  url = encodeURIComponent(url);
  const options = {
    'method': 'POST',
    'payload': {
      'email': ENV.TO_EMAIL,
      'from': ENV.FROM_EMAIL,
      'title': title
    }
  };
  const response = UrlFetchApp.fetch(`${ENV.P2K_URL}/send.php?context=send&url=${url}`, options);
  if(/Sent\!/.test(response)) {
    return true;
  }
  return response;
}
