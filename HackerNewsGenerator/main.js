let comments;

function doGet(event) {
  if (event.parameter.id !== undefined && /^\d+$/.test(event.parameter.id)) {
    comments = new Comments(event.parameter.id);
    const output = HtmlService.createTemplateFromFile('index').evaluate().getContent();
    const blob = Utilities.newBlob(output, 'text/html', comments.title + '.html');
    MailApp.sendEmail({
      to: getProperty("KINDLE_EMAIL"),
      subject: comments.title,
      htmlBody: output,
      attachments: [blob]
    });
    return HtmlService.createHtmlOutput("Success!");
  }
  return HtmlService.createHtmlOutput("Missing ID.");
}

function getProperty(property) {
  var scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty(property);
}

function includeFile_(output, name) {
  output.append(HtmlService.createTemplateFromFile(name).evaluate().getContent());
}

class Comments {
  constructor(id) {
    this.id = id;
    this.output = "No comments.";
    this.templateCommentContent = this.getTemplate("templateCommentContent");
    this.templateCommentWrapper = this.getTemplate("templateCommentWrapper");
    this.templateCommentList = this.getTemplate("templateCommentList");
    this.data = this.fetchData();
    this.title = this.getProperty("title");
    this.description = this.getProperty("content") || "";
    this.url = this.getUrl();
  }

  getProperty(name) {
    if(this.data[name] !== undefined) {
      return this.data[name];
    }
    return null;
  }

  getUrl() {
    const url = (this.getProperty("domain") ? "" : "https://news.ycombinator.com/") + this.getProperty("url");
    return this.interpolateTemplate('<a href="{{URL}}">{{URL}}</a>', {URL: url});
  }

  getTemplate(name) {
    return HtmlService.createTemplateFromFile(name).evaluate().getContent();
  }

  interpolateTemplate(str, obj) {
    const callback = function (obj, name) {
        return name && 'undefined' !== typeof obj[name] ? obj[name] : '';
    }
    const marker = /{{([a-z][a-z0-9\-_]*)}}/gi;
    return str.replace(marker, function(matches) {
        return callback(obj, arguments[1]) || '';
    });
  }

  fetchData() {
    const url = "https://api.hackerwebapp.com/item/" + this.id;
    const headers = { "contentType": "application/json" };
    const response = UrlFetchApp.fetch(url, headers);
    return JSON.parse(response.getContentText());
  }

  buildComments(commentArray) {
    let commentsHtml = "";
    commentArray.forEach((comment) => {
      let commentHtml = this.interpolateTemplate(this.templateCommentContent, {
        CONTENT: comment.content,
        USER: comment.user,
        TIME_AGO: comment.time_ago
      });
      
      if(comment.comments.length) {
        commentHtml += this.buildComments(comment.comments);
      }

      commentsHtml += this.interpolateTemplate(this.templateCommentWrapper, {
        COMMENT: commentHtml
      });
    });

    const output = this.interpolateTemplate(this.templateCommentList, {
      COMMENTS: commentsHtml
    });
    return output;
  }

  render(){
    if (this.data.comments.length) {
      this.output = this.buildComments(this.data.comments);
    }
    return this.output;
  }
}