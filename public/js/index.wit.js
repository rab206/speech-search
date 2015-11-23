'use strict';

$(document).ready(function() {

  // jQuery variables attached to DOM elements
  var $error = $('.error'),
    $errorMsg = $('.errorMsg'),
    $loading = $('.loading'),
    $results = $('.results'),
    $connecting = $('.connecting');

  var changeClass = function(answers) {

    $loading.show();
    $error.hide();
    $results.hide();
    
    console.log(answers.top_class);
    performAction(answers);
    $('html, body').animate({ scrollTop: 0 }, 'fast');
    
  };
  
  var changeError = function(error){
    $error.show();
    $errorMsg.text(error ||
      'Sorry i do not understand, please try again');
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
    audit_trail.push(action);
    $.post('log', {guid: getDeviceId(), trail: audit_trail});
  }
  
  var page_actions = {
    'default': {
        'search': {sample : 'search for corner sofas', func: function(action) {
          var search = 'http://www.dfs.co.uk/shop/SolrNormalSearchCmd?&catalogId=10101&sPageView=NextPage&pageType=SR&langId=-1&storeId=10202&filterBy=&leanPage=Yes&searchTerm='+encodeURIComponent(action.speech) + '&currentPageNumber=0'
          action.context = 'search_results';
          changePage(search,action);
        }},
        'back': {sample : 'go back', func:function(action){
          if(history.length > 1)
            history.pop()
          var previous_action = history[history.length -1];
          refreshObject(previous_action.target,action);
        }},
        'help': {sample : 'tell me more about finance options', func:function(action) {
          var target = 'http://images.dfs.co.uk/i/dfs/ca_ifc_header.png';
          action.context = 'default';
          changePage(target,action);
        }}
    },
    'search_results': {
        'more_results': {sample : 'show more results', func:function(action) {
          console.log(history[history.length -1]['target']);
          var search = history[history.length -1]['target'],
              page_num = Number(search.substring(search.length - 1,search.length)) + 1,
              target = search.substring(0, search.length - 1) + page_num;
          action.context = 'search_results';
          changePage(target,action);
        }},
        'select': {sample : 'open the first product', func:function(action){
          var num = 1; //get from entity
          console.log(num);
          var target = $('#output .productRange li:nth-child(' + 2 + ')').children('a').eq(1).attr('href');
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
        'previous': function() { /* ... */ },
        'info': function() { /* ... */ }
    }
  };
  
  function defaultAction(action){
    /* display usage tips based on current page and default options */
    var questions = [];
    logAction(action);
    for(var i in page_actions[action.previous_context]){
      questions.push(page_actions[action.previous_context][i]['sample']);
    }
    if(action.previous_context != 'default'){
      for(var j in page_actions['default']){
        questions.push(page_actions['default'][j]['sample']);
      }
    }
    loadQuestions(questions);
    console.log("default action");
  }
  
  function changePage(target, action){
    refreshObject(target, action);
    history.push(action);
  }
  
  function refreshObject(target, action){
    if(action.context === 'search_results'){
      $.ajax({
          url: "http://jsonp.wemakelive.com",
          jsonp: "callback",
          dataType: "jsonp",
          data: {
              url: target
          },
          // Work with the response
          success: function( response ) {
             $loading.hide();
             $results.show();
             $('#output').html( response.contents ); // server response
          }
      });
    } else  {
      console.log(target);
      document.getElementById("output").innerHTML='<object height="800" width="1100" class="output" id="object" type="text/html" data="' + target + '" ></object>';
      $loading.hide();
      $results.show();
    }
    action.target = target;
    logAction(action);
  }
  
  function performAction(answers) {
    var top_action = answers.top_class,
        speech = answers.text,
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

  var loadQuestions = function (questions){
    questions.forEach(function(question){
      $('<a>').text(question).appendTo('.example-questions').append('&nbsp; &nbsp; &nbsp;');
    });
  };
  
  var defaultQuestions = [
    'Im looking for a 3 seater sofa',
    'Find black leather sofas',
    'Tell me about finance options',
    'Corner sofas'
  ]
  
  loadQuestions(defaultQuestions);
  
  var socket = new WebSocket("ws://localhost:9000");
  var isopen = false;
  socket.binaryType = "arraybuffer";
  socket.onopen = function() {
     console.log("Connected!");
     $connecting.hide();
     isopen = true;
  };
  
  // receive device id, errors and change class actions, how to determine different types?
  socket.onmessage = function(e) {
     if (typeof e.data == "string") {
        console.log("Text message received: " + e.data);
     } else {
        var arr = new Uint8Array(e.data);
        var hex = '';
        for (var i = 0; i < arr.length; i++) {
           hex += ('00' + arr[i].toString(16)).substr(-2);
        }
        console.log("Binary message received: " + hex);
     }
  };
  socket.onclose = function(e) {
     console.log("Connection closed.");
     $connecting.show();
     socket = null;
     isopen = false;
  };

  function socketSendMessage(message) {
    if (isopen) {
       socket.send(message);
       console.log("Text message sent:" + message);               
    } else {
       console.log("Connection not opened.");
    }
  }



});
