/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express    = require('express'),
  app          = express(),
  extend       = require('util')._extend

// Bootstrap application settings
require('./config/express')(app);


// render index page
app.get('/', function(req, res) {
  res.render('index');
});

var db = {};

app.get('/nfc/:id', function(req,res,next){
  // req.params.id
  var audit_trail = db[req.params.id];
  res.redirect(audit_trail[audit_trail.length -1].target);
});

app.post('/log', function(req,res,next){
  //{guid: guid(), trail: audit_trail}
  console.log(req.body);
  db[req.body.guid] = req.body.trail;
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.code = 404;
  err.message = 'Not Found';
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

app.listen(process.env.PORT, process.env.ip);
console.log('listening at:', process.env.PORT);
