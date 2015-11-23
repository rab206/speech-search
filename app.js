'use strict';

var express    = require('express'),
  app          = express(),
  multer       = require('multer'),
  request      = require('request');
    
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    var originalfileName = file.originalname,
        dotIndex = originalfileName.indexOf('.'),
        suffix = originalfileName.substring(dotIndex),
        name = originalfileName.substring(0,dotIndex);
    cb(null, name + '-' + Date.now() + suffix);
  }
});

var upload = multer({storage: storage});
  
// Bootstrap application settings
require('./config/express')(app);

// render index page
app.get('/', function(req, res) {
  res.render('index');
});

// show olapic widget
app.get('/gallery', function(req, res) {
  res.render('gallery');
});

var getJsonFromJsonP = function (url, callback) {
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var jsonpData = body;
      var json;
      try
      {
         json = JSON.parse(jsonpData);
      }
      catch(e)
      {
        var startPos = jsonpData.indexOf('({');
        var endPos = jsonpData.indexOf('})');
        var jsonString = jsonpData.substring(startPos+1, endPos+1);
        json = JSON.parse(jsonString);
      }
      callback(null, json);
    } else {
      callback(error);
    }
  });
};

// render plp
app.get('/plp', function(req, res, next) {
  var q = req.query.q.replace(' ','%2B').replace('+','%2B'),
      page = req.query.page;
  getJsonFromJsonP("http://jsonp.wemakelive.com?callback=JSON_CALLBACK&url=http://www.tedbaker.com/uk/json/search?q=f:(),q:" + q + "%26page=" + page, function (err, data) {
    if(err){
      next(err);
    } else {
      var products = data.contents.data.results;
      res.render('plp', {products: products});  
    }
  });
});

// render pdp
app.get('/pdp', function(req, res, next) {
  var code = req.query.code;
  getJsonFromJsonP("http://jsonp.wemakelive.com?callback=JSON_CALLBACK&url=http://www.tedbaker.com/uk/json/product/getProduct.json?productCode=" + code, function (err, data) {
    if(err){
      next(err);
    } else {
      var product = data.contents.data;
      res.render('pdp', {p: product});
    }
  });
});

// render interaction page
app.get('/interact', function(req, res) {
  res.render('userinput');
});

var db = {};

app.get('/nfc/:id', function(req,res,next){
  var audit_trail = db[req.params.id];
  var target = audit_trail[audit_trail.length -1].target;
  if(!target){
    target = 'http://www.tedbaker.com/';
  }
  res.redirect(target);
});

// log the updates to the database
app.post('/log', function(req,res,next){
  //{guid: guid(), trail: audit_trail}
  console.log(req.body);
  db[req.body.guid] = [];
  db[req.body.guid] = req.body.trail;
  res.end('{"success" : "Updated Successfully", "status" : 200}');
});

// receive images from customers
app.post('/uploadimage', upload.single('imgFile'), function(req,res){
    res.end(req.file.filename);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.code = 404;
  err.message = 'Not Found' + req.path;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  var error = {
    code: err.code || 500,
    error: err.message || err.error
  };
  console.log('error:', error);

  res.status(error.code).json(error);
});

var port = process.env.VCAP_APP_PORT || process.env.PORT;
app.listen(port, process.env.ip);
console.log('listening at:', port);
