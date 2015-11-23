'use strict';

$(document).ready(function() {  
  
  // jQuery variables attached to DOM elements
  var $error = $('.error'),
    $errorMsg = $('.errorMsg'),
    $loading = $('.loading'),
    $results = $('.results'),
    $defaultExamples = $('#defaultExamples'), 
    $examples = $('#examples'),
    $connecting = $('.connecting');
    
  var processWitResponse = function(answers) {
    $loading.show();
    $error.hide();
    $results.hide();
    
    performAction(answers);
    $('html, body').animate({ scrollTop: 0 }, 'fast');
  };
  
  var witError = function(error){
    $error.show();
    $errorMsg.text(error ||
      'Sorry i could not understand the question, please try again');
    $loading.hide();
  };
  
  var history = [{context:'default'}];
  var audit_trail = [];
  var device_id;
  
  function getDeviceId() {
    if(!device_id) {
      // get device id via socket
      device_id = 1;
    }
    return device_id;
  }
  
  function logAction(action){
    var date = new Date();
    action.timestamp = date;
    audit_trail.push(action);
    $.post('log', {guid: getDeviceId(), trail: audit_trail});
  }
  
  var page_actions = {
    'default': {
        'search_ted': {sample : 'search for blue leggings', func: function(action) {
          var search_term;
          if(action.answers.entities.search_entity[0] && action.answers.entities.search_entity[0].value) {
            search_term = action.answers.entities.search_entity[0].value;
          } else if(action.answers.entities.search_entity.value){
            search_term = action.answers.entities.search_entity.value;
          } else {
            search_term = action.speech;
          }
          var target = 'http://www.tedbaker.com/uk/search?q=f%3A()%2Cq%3A' + search_term + "&page=0";
          search_term = search_term.replace(' ','%2B');
          var search = "/plp?q=" + search_term + "&page=0";
          action.context = 'search_results';
          action.json = search;
          changePage(target, action);
        }},
        'previous': {sample : 'go back', func:function(action){
          if(history.length > 1)
            history.pop();
          var previous_action = history[history.length -1];
          console.log(previous_action);
          action.context = previous_action.context;
          action.json = previous_action.json;
          refreshObject(previous_action.target, action);
        }},
        'inspiration': {sample : 'inspire me', func:function(action){
          var target = '/gallery';
          action.context = 'inspiration';
          changePage(target, action);
        }}
    },
    'search_results': {
        'more_results': {sample : 'show more results', func:function(action) {
          var prevJson = history[history.length -1]['json'],
              prevTarget = history[history.length -1]['target'],
              page_num = Number(prevJson.substring(prevJson.length - 1, prevJson.length)) + 1,
              json = prevJson.substring(0, prevJson.length - 1) + page_num,
              target = prevTarget.substring(0, prevTarget.length - 1) + page_num;
          
          action.json = json;
          action.context = 'search_results';
          changePage(target, action);
        }},
        'select': {sample : 'open the first product', func:function(action){
          var num;
          if(action.answers.entities.number){
            if(action.answers.entities.number.value){
              num = action.answers.entities.number.value;
            } else {
              num = action.answers.entities.number[0].value;
            }
          } else if(action.answers.entities.ordinal) {
            if(action.answers.entities.ordinal.value) {
              num = action.answers.entities.ordinal.value;
            } else {
              num = action.answers.entities.ordinal[0].value;
            }
          } else {
            num = nthToNum(action.speech.match(new RegExp(Object.keys(nth).join('|'),'g'))[0]);
          }
          var json = $('#output #productList li:nth-child(' + num + ')').find('a').attr('href'),
              target = $('#output #productList li:nth-child(' + num + ')').find('input').val();
          action.json = json;
          action.context = 'product_viewer';
          changePage(target, action);
        }}
    },
    'lister': {
        'select': function() { /* ... */ },
        'filter': function() { /* ... */ },
        'sort': function() { /* ... */ }
    },
    'product_viewer': {
        'next': function() { /* ... */ },
        'info': function() { /* ... */ }
    },
    'inspiration': {
    }
  };
  
  var nth = {
    'first': 1,
    'second': 2,
    'third': 3,
    'fourth': 4,
    'fifth': 5,
    'sixth': 6,
    'seventh': 7,
    'eighth': 8
  };
  
  function nthToNum(text){
    return nth[text];
  }
  
  function defaultAction(action){
    logAction(action);
    console.log("default action");
  }
  
  function changePage(target, action){
    console.log("loading: " + target);
    refreshObject(target, action);
    history.push(action);
  }
  
  /**
   * This is a short term fix to get the pages back into the site.
   * In a proper implementation we would use REST services or equivalent
   **/
  function refreshObject(target, action){
    console.log(target);
    if(action.context === 'upload'){
      document.getElementById("output").innerHTML='<img width="1100" class="uploadedImage" id="uploadedImage" src="' + target + '" />';
      $loading.hide();
      $results.show();
    } if(action.context === 'search_results' || action.context === 'product_viewer'){
      $('#output').load(action.json);
      $loading.hide();
      $results.show();
    } else {
      document.getElementById("output").innerHTML='<object height="800" width="800" class="output" id="object" type="text/html" data="' + target + '" ></object>';
      $loading.hide();
      $results.show();
    }
    action.target = target;
    logAction(action);
    loadQuestions(action.context);
  }
  
  function performAction(answers) {
    var top_action = answers.intent,
        speech = answers._text,
        context = history[history.length-1]['context'],
        action_object = {};
    action_object.top_action = top_action;
    action_object.previous_context = context;
    action_object.speech = speech;
    action_object.answers = answers;
    if (top_action) {
        if (top_action in page_actions[context]) {
          page_actions[context][top_action]['func'](action_object);
        } else if(top_action in page_actions['default']){
          page_actions['default'][top_action]['func'](action_object);
        } else {
          console.log('undefined action ' + context + ': ' + top_action);
          defaultAction(action_object);
        }
    } else {
        console.log('undefined context: ' + context);
        defaultAction(action_object);
    }
  }
  
  var loadQuestions = function (context){
     /* display usage tips based on current page and default options */
    var questions = [];
    if(context != 'default'){
      for(var i in page_actions[context]){
        questions.push(page_actions[context][i]['sample']);
      }
    }
    $examples.text('');
    questions.forEach(function(question){
      $('<li>').text(question).appendTo($examples);
    });
  };
  
  var questions = [];
  for(var j in page_actions['default']){
    questions.push(page_actions['default'][j]['sample']);
  }
  questions.forEach(function(question){
    $('<li>').text(question).appendTo($defaultExamples);
  });
  
  function on_text (args) {
    var outcomes;
    if(args[0].outcome){
      var json = args[0];
      outcomes = json.outcome;
      outcomes._text = json.msg_body;
    } else {
      json = JSON.parse(args[0]);
      outcomes = json.outcomes[0];
    }
    if(outcomes){
      var confidence = outcomes.confidence;
      if(confidence > 0.3){        
        processWitResponse(outcomes); 
      } else {
        witError();
      }
    } else {
      witError();
    }
  }
  
  function on_image (args) {
    var imageName = args[0];
    if(imageName){
      var action = {
        top_action: 'upload',
        speech: 'upload image',
        context: 'upload',
        previous_context: history[history.length-1]['context']
      };
      refreshObject('/uploads/' + imageName, action);
    }
  }


  // for use with jasper
  //var wsuri = "ws://127.0.0.1:8080/ws"; 
  // for use with phone
  var wsuri = "ws://crossbar-rab206.c9.io/ws"; 
  // the WAMP connection to the Router
  //
  var connection = new autobahn.Connection({
    url: wsuri,
    realm: "realm1"
  });
  
  // fired when connection is established and session attached
  //
  connection.onopen = function (session, details) {
    $connecting.hide();
    
    
    // SUBSCRIBE to a topic and receive events
    session.subscribe('com.ted.speech', on_text).then(
      function (sub) {
        console.log('subscribed to topic');
      },
      function (err) {
        console.log('failed to subscribe to topic', err);
      }
    );
    
        // SUBSCRIBE to a topic and receive events
    session.subscribe('com.ted.uploadimage', on_image).then(
      function (sub) {
        console.log('subscribed to topic');
      },
      function (err) {
        console.log('failed to subscribe to topic', err);
      }
    );
  };
  
  connection.onclose = function (session, details){
    $connecting.show();
  };

  connection.open();

});


