function getProperty(property) {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty(property);
}

function setEnv(vars) {
  const env = {};
  vars.forEach((v) => {
    env[v] = getProperty(v);
  });
  return env;
}

function respond(content, statusCode=200) {
  function html() {
    return HtmlService.createHtmlOutput(content);
  }

  function json(){
    if (typeof content === 'string' || content instanceof String) {
      content = {
        statusCode: statusCode,
        message: content
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(content)).setMimeType(ContentService.MimeType.JSON);
  }

  function js() {
    return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  function text() {
    return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.TEXT);
  }

  return {
    json: json,
    text: text,
    js: js,
    html: html
  }
}
