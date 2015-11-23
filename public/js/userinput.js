'use strict';

$(document).ready(function() {  
  
  // jQuery variables attached to DOM elements
  // var $error = $('.error'),
  //   $errorMsg = $('.errorMsg'),
  //   $loading = $('.loading'),
  //   $results = $('.results'),
    //$output = $('.output'),
    //$question = $('.questionText'),
  var $connecting = $('.connecting'),
      $connected  = $('.connected'),
      $mic        = $('.mic'),
      $question   = $('.questionText');

  var device_id;
  
  function getDeviceId() {
    if(!device_id) {
      // get device id via socket
      device_id = 1;
    }
    return device_id;
  }
  
  var wsuri = "ws://crossbar-rab206.c9.io/ws";  
  var sess;
  
  // the WAMP connection to the Router
  //
  var connection = new autobahn.Connection({
    url: wsuri,
    realm: "realm1"
  });
  
  // fired when connection is established and session attached
  connection.onopen = function (session, details) {
    console.log("connected to crossbar");
    $connecting.hide();
    $mic.show();
    $connected.prop('disabled',false);
    sess = session;
  };
  
  connection.onclose = function (session, details){
    $connecting.show();
    sess = null;
  };

  connection.open();

  $('#file-selector').change(function(){
    var file = document.getElementById('file-selector').files[0];
    uploadImage(file);
  });
  
  $('#file-selector-selfie').change(function(){
    var file = document.getElementById('file-selector-selfie').files[0];
    uploadImage(file);
  });
  
  $('#fetchPage').on("click",function(){
     window.open('/nfc/1','_blank');
  });
  
  function uploadImage (file){
    if (!file) {
			return false;
		}
		$('.uploading').show();
		$('.upload').hide();
		var formData = new FormData();
		// file = resizeImage(file, file.name);
		formData.append("imgFile", file);

		return $.ajax({
			url: "uploadimage",
			type: "POST",
			data: formData,
			processData: false,
			contentType: false,
			success: function(response){
			  alert("upload success");
			  console.log(response);
			  sess.publish('com.ted.uploadimage', [response], {}, { acknowledge: true}).then(
          function(publication) {
            console.log("published, publication ID is ", publication);
            $('.uploading').hide();
		        $('.upload').show();
          },
          function(error) {
             console.log("publication error", error);
          }
       );
			},
			error: function(response){
			  alert(response.json);
			}
		});
  }
  
  function resizeImage(img, imgName){
    var fileReader = new FileReader();
    var canvas = document.createElement("canvas");
    fileReader.onload = function (original) {
        var img = new Image();
        img.onload = function () {
            var MAX_WIDTH = 1024;
            var MAX_HEIGHT = 768;
            var width = img.width;
            var height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(this, 0, 0, width, height);
            this.src = canvas.toDataURL();
            document.body.appendChild(this);
        };
        img.src = original;
    };
    fileReader.readAsDataURL(img);
    return canvas.mozGetAsFile(imgName);
  }
  
  function sendSpeechToScreen(response){
    sess.publish('com.ted.speech', [response]);
    console.log("sent to screen");
  }
  
  var mic = new Wit.Microphone(document.getElementById("microphone"));
    var info = function (msg) {
      document.getElementById("info").innerHTML = msg;
      console.log(msg);
    };
    var error = function (msg) {
      document.getElementById("error").innerHTML = msg;
      console.log(msg);
    };
    mic.onready = function () {
      $mic.addClass('ready');
      info("Microphone is ready to record");
    };
    mic.onaudiostart = function () {
      $mic.removeClass('ready');
      info("Recording started");
      error("");
    };
    mic.onaudioend = function () {
      info("Recording stopped, processing started");
    };
    mic.onresult = function (intent, entities, res) {
      $mic.addClass('ready');
      if(intent){
        sendSpeechToScreen(res);
      }
      
      var r = kv("intent", intent);

      for (var k in entities) {
        var e = entities[k];

        if (!(e instanceof Array)) {
          r += kv(k, e.value);
        } else {
          for (var i = 0; i < e.length; i++) {
            r += kv(k, e[i].value);
          }
        }
      }

      document.getElementById("result").innerHTML = r;
    };
    mic.onerror = function (err) {
      error("Error: " + err);
    };
    mic.onconnecting = function () {
      info("Microphone is connecting");
    };
    mic.ondisconnected = function () {
      info("Microphone is not connected");
    };

    mic.connect("REM6LQOCI3BDXQB6EUZNXCY7TSKKN4XH");

    function kv (k, v) {
      if (toString.call(v) !== "[object String]") {
        v = JSON.stringify(v);
      }
      return k + "=" + v + "\n";
    }

});
