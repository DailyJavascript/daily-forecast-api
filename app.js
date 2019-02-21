var express = require('express');
var app = express();
const url = require('url');
var rp = require('request-promise');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/daily-forecast', function(req, res) {
  const parsedUrl = url.parse(req.url);
  const params = JSON.parse(decodeURI(parsedUrl.query));
  const darkSkyAPIsecret = 'd8905874cd098ba550510e6d9015d63f/'
  const latitude = params["latitude"].toString();
  const longitude = params["longitude"].toString();
  const darkSkyAPIUrl = 'https://api.darksky.net/forecast/' + darkSkyAPIsecret + latitude + ',' + longitude;
  const googleGeocodingAPISecret = 'AIzaSyBH9zQF0mWjfgfVGSIKpuUPV3M0hW2_ytc';
  const googleGeocodingAPIUrl = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latitude + ',' + longitude + '&key=' + googleGeocodingAPISecret;

  let api = {};

  function parseForLocationInGoogleGeoCodeResponse(resp){
    const parsedBody = JSON.parse(resp);
    if (parsedBody.status == "OK") { parsedBody.results.map(function (result) { if (result.types.includes('locality')) {
        api = Object.assign(api, { location: result.formatted_address })
    }})}
  }

  function parseMoonDataForRiseAndSetTime(moonData) {
    let newMoonData = { moonRiseTime: '--', moonSetTime: '--'};
    moonData.forEach( (elem) => {
      if (elem.phen === "R") {
        newMoonData['moonRiseTime'] = elem.time.replace(/[\./\|ST]/g, "");
      }
      if (elem.phen === "S") {
        newMoonData['moonSetTime'] = elem.time.replace(/[\./\|ST]/g, "");
      }
    });
    return newMoonData;
  }

  function parseResponseForMoonData(resp){
    const parsedJSON = JSON.parse(resp);
    return {
      moonData: parseMoonDataForRiseAndSetTime(parsedJSON.moondata),
      currentPhase: parsedJSON.curphase,
      percentOfMoonLit: parsedJSON.fracillum,
    }
  }

  var getDarkSkyInfo = rp(darkSkyAPIUrl)
    .then( function(resp){ api = Object.assign(api, JSON.parse(resp))});
  var getLocationData = rp(googleGeocodingAPIUrl)
    .then(function (resp) { parseForLocationInGoogleGeoCodeResponse(resp)});

  Promise.all([getDarkSkyInfo, getLocationData])
    .then( function() { 
      const date = new Date();
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const thisDate = `${month}/${day}/${year}`;
      console.log(thisDate)
      const sunMoonApi = `http://api.usno.navy.mil/rstt/oneday?date=${thisDate}&loc=` + api.location;
      var getMoonAndSunData = rp(sunMoonApi).then(function (resp) { api = Object.assign(api, { moonInfo: parseResponseForMoonData(resp) }) });
      Promise.all([getMoonAndSunData]).then(
        function() {
          res.json(api);
        }
      )
  });
});


app.listen(8081, function() {
  console.log('Example app listening to port 8081')
})