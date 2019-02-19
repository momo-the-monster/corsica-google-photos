const cheerio = require('cheerio');
const request = require('request');
const Promise = require('es6-promises');
const fs = require('fs');
//const download = require('image-downloader');
const mkdirp = require('mkdirp');
const path = require('path');
const cacheUpdateSeconds = 1800; // how often to update the image list caches

// creates a slideshow page based on an album id
function makePage(url, action){
  var templatePath = path.join(__dirname,'template.html');
  fs.readFile(templatePath, (err, data) => {
    if(err) throw err;

    let template = data.toString();

    getPhotoUrls(url).then(list=>{
      let imgList = makeImgTagsForList(list);
      template = template.replace("{{imgList}}", imgList)
      action(template);
    })

  });
}

/*
 * Returns a Promise of the list of URLs from cache if new enough
 * Fetches by scraping Google album if not
 */
function getPhotoUrls(url){
  let id = idFromUrl(url);
  return new Promise(function(resolve, reject){
    needNewList(id)
    .then( result => 
      {
      if(result){
        console.log("getting new list for cache item " + id);
        resolve(getUrlsFromScrape(url));
      } else {
        console.log("using existing list for cache item " + id);
        resolve(getUrlsFromCache(id));
      }
    });
  });
  
}

function needNewList(id){
  return new Promise(function(resolve, reject){
    var path = getCachePath(id);
    fs.stat(path, function(err, stats) {
      // we need a new one if it doesn't exist or it's not a file
      if(err) {
        resolve(true);
        return;
      }
      if(!stats.isFile()) {
        resolve(true);
        return;
      }
  
      // we need a new one if it's more than cacheUpdateSeconds old
      var mDiff = (Date.now() - stats.mtimeMs);
      var diff = Math.floor(mDiff/1000);
      if(diff > cacheUpdateSeconds)
        resolve(true);
      else
        resolve(false);
    });
  });
}

function getCachePath(id){
  return __dirname + '/cache/' + id + '.js';
}

function getUrlsFromCache(id){
  return new Promise(function(resolve, reject){
    let path = getCachePath(id);

    fs.readFile(path, function(err, data){
      if(err){
        reject(err);
      } else {
        let list = JSON.parse(data);
        resolve(list);
      }
    });
  });
}

function idFromUrl(url){
  return url.match(/([^\/]+$)/g);
}

function getUrlsFromScrape(url){
  return new Promise(function(resolve, reject) {

    let id = idFromUrl(url);
    request.get(url, function(err, response) {
      if (err) {
        console.error(err.stack || err.trace || err);
        reject(err);
        return;
      }
      var urls = [];
      var regex = /\"https:\/\/lh3.*?\"/g;

      var $ = cheerio.load(response.body);

      $('script').each(function(i, elem) {
        let js = $(elem).text();
        
        let found = js.match(regex);
        if(found !== null){
          found.forEach(function(url){
            url = url.replace(/['"]+/g, '');
            url += '=w1920-no';
            urls.push(url);
          })
        }
        
      });
      // The last 6 entries are the creating user's profile pic, so toss them before returning
      let list = urls.slice(0,urls.length - 6)

      saveUrlList(list, id); // shouldn't be saving here but then where would I do it?

      resolve(list);
    }); // end request
  }); // end promise
}

function saveUrlList(list, id){

  let dir = __dirname + '/cache';
  let savePath = dir + '/' + id + '.js';

  mkdirp(dir, function(err){
    if(err) throw err;

    fs.writeFile(savePath, JSON.stringify(list), function(err){
      if(err) throw err;
    });

  });

}
/*
// Not currently used, but saving here in case you want to cache the actual images to disk
function saveUrlsToDisk(list, id){
  let dir = __dirname + '/cache/' + id;
  mkdirp(dir, function(err){
    if(err) throw err;
    let i = 0;
    list.forEach(function(url){
      let filename = url.match(/([^\/]+$)/g);
      filename += ".jpg";
      download.image({
        url: url,
        dest: dir + '/' + filename 
      })
      .then(({ filename, image }) => {
        console.log('File saved to', filename)
      })
      .catch((err) => {
        console.error(err)
      })
    });
  })
}
*/

// takes a list of url and returns an HTML string of img tags
function makeImgTagsForList(list){
  let result = "";
  list.forEach(element => {
    result += '<img src ="' + element + '" />\n';
  });
  return result;
}

exports = module.exports = { 
  makePage, getPhotoUrls
}