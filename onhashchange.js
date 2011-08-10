(function($,$$) {

  //setup the browser types
  var mt13 = window.MooTools && window.MooTools.version.test(/1\.3/);

  //check mootools 1.3
  if(mt13) { 
    if(!window.$empty) {//non compatibility mode
      $empty = Function.from;
      $clear = clearTimeout;
    }
    if(!window.$type) {
      $type = typeOf;
    }
  }
  else if(Browser.Engine) {
    Browser.ie6 = Browser.Engine.trident4;
    Browser.ie7 = Browser.Engine.trident5;
    Browser.opera = Browser.Engine.presto;
  }

//set the events
window.store('hashchange:interval',300);
window.store('hashchange:ieframe-src','./blank.html');
window.store('hashchange:implemented',!!('onhashchange' in window));

Element.Events.hashchange = {
  onAdd:function(fn) {
          //clear the event
          Element.Events.hashchange.onAdd = $empty;

          //check the element
          var self = $(this);
          var checker = $empty;
          if($type(self) != 'window') {
            return; //the window object only supports this
          }

          //this will prevent the browser from firing the url when the page loads (native onhashchange doesn't do this)
          window.store('hashchange:changed',false);

          //this global method gets called when the hash value changes for all browsers
          var hashchanged = function(hash,tostore) {
            window.store('hashchange:current',tostore || hash);
            if(window.retrieve('hashchange:changed')) {
              hash = hash.trim();
              if(hash.length==0) {
                var url = new String(window.location);
                if(url.indexOf('#')>=0)
                  hash = '#';
              }
              window.fireEvent('hashchange',[hash]);
            }
            else {
              window.store('hashchange:changed',true);
            }
          };

          //this is used for when a hash change method has already been defined (futureproof)
          if(typeof window.onhashchange == 'function' && fn !== window.onhashchange) {
            //bind the method to the mootools method stack
            window.addEvent('hashchange',window.onhashchange);

            //remove the event
            window.onhashchange = null;
          }

          //Oldschool IE browsers
          if(Browser.ie6 || Browser.ie7) { 

            //IE6 and IE7 require an empty frame to relay the change (back and forward buttons)
            //custom IE method
            checker = function(url,frame) {

              //clear the timer
              var checker = window.retrieve('hashchange:checker');
              var timer = window.retrieve('hashchange:timer');
              $clear(timer); //just incase
              timer = null;

              //IE may give a hash value, a path value or a url
              var isNull = frame && url.length == 0;
              var isEmpty = url == '#';
              var hash, compare, cleanurl = unescape(new String(window.location));

              if(isEmpty) {
                compare = hash = '#';
              }
              else if(isNull) {
                compare = hash = '';	
              }
              else {

                //setup the url
                url = url != null ? url : cleanurl;
                hash = url;

                if(url.length>0) { //not an empty hash
                  var index = url.indexOf('#');
                  if(index>=0)
                    hash = url.substr(index);
                }

                //check the hash
                compare = hash.toLowerCase();
              }

              //if the hash value is different, then it has changed
              var current = window.retrieve('hashchange:current');
              if(current != compare) {

                //update the url
                if(frame) {
                  url = cleanurl;
                  if(current) {
                    url = url.replace(current,hash);
                  }
                  else {
                    url += hash;
                  }
                  window.location = url;
                }

                //check the flag
                var hasChanged = !frame && window.retrieve('hashchange:changed');

                //change the hash
                hashchanged(hash,compare);

                if(hasChanged) {
                  //this will prevent the frame from changing the first time
                  window.retrieve('hashchange:ieframe').setPath(hash);
                }
              }

              //reset the timer
              timer = checker.delay(window.retrieve('hashchange:interval'));
              window.store('hashchange:timer',timer);

            };

            //create the frame
            var src = window.retrieve('hashchange:ieframe-src');
            var ieframe = new IFrame({
              'id':'hashchange-ie-frame',
                'src':src+'?start',
                'styles':{
                  'width':0,
                'height':0,
                'position':'absolute',
                'top':-9999,
                'left':-9999
                },
                'onload':function() {
                  //this shouldn't exist when a hash is changed, if it does then the frame has just loaded
                  var self = $('hashchange-ie-frame');
                  if(self.retrieve('loaded')) {
                    //examine the url
                    var url = unescape(new String(self.contentWindow.location));
                    var index = url.indexOf('?');
                    if(index>=0) {
                      var path = '', empty = false;
                      if(url.indexOf('?empty')>=0) {
                        path = '#';
                      }
                      else {
                        index = url.indexOf('?!');
                        if(index>=0) {
                          path = url.substr(index+2);
                          path = '#' + path;
                        }
                      }

                      var current = window.retrieve('hashchange:current');
                      if(current != path) {
                        window.retrieve('hashchange:checker')(path,true);
                      }
                    }
                  }
                  else {
                    self.store('loaded',true);
                  }
                }.bind(window)
            });

            //save the frame
            window.store('hashchange:ieframe',ieframe);
            ieframe.inject(document.body,'inside');

            var doc = ieframe.contentWindow;
            ieframe.setPath = function(path) {
              if(path.charAt(0)=='#') {
                path = path.substr(1);
                if(path.length==0) {
                  this.contentWindow.location = src + '?empty';
                  return;
                }
              }
              this.contentWindow.location = src + '?!' + escape(path);
            }.bind(ieframe);
          }
          else if(window.retrieve('hashchange:implemented')) { //Firefox 3.6, Chrome 5, IE8 and Safari 5 all support the event natively

            //check the hashcheck
            checker = window.onhashchange = function(hash) {

              //make sure the hash is a string
              hash = hash && typeof hash == 'string' ? hash : new String(window.location.hash);

              //this is important so that the URL hash has changed BEFORE this is fired
              hashchanged.delay(1,window,[hash]);

            }
          }
          else { //Others
            //opera requires a history mode to be set so that #hash values are recorded in history (back and forward buttons)
            if(Browser.opera) {
              history.navigationMode='compatible';
            }

            //set the inteval method
            checker = function(hash) {

              //clear the timer
              var checker = window.retrieve('hashchange:checker');
              var timer = window.retrieve('hashchange:timer');
              $clear(timer); //just incase
              timer = null;

              //compare the hash
              var hash = hash || new String(window.location.hash);
              var compare = hash.toLowerCase();
              if(hash.length==0 && new String(window.location).indexOf('#')>=0) {
                compare = '#';
              }
              var current = window.retrieve('hashchange:current');
              if(current != compare) {
                hashchanged(hash,compare);
              }

              //reset the timer
              timer = checker.delay(window.retrieve('hashchange:interval'));
              window.store('hashchange:timer',timer);

            }
          }

          //run the loop
          window.store('hashchange:checker',checker);
          checker();

          //setup a custom go event
          var sethash = function(hash) {
            if(hash.charAt(0)!='#')
              hash = '#' + hash;
            if(Browser.ie6 || Browser.ie7) { //ie6 and ie7
              var url = new String(window.location);
              var current = url.match(/#.+?$/);
              current = current && current[0] ? current[0] : '';
              if(current.length>0) {
                window.location = url.replace(current,hash);
              }
              else {
                window.location += hash;
              }
            }
            else { //other, more advanced browsers
              window.location.hash = hash;
            }

            //check the hash right away
            if(!window.retrieve('hashchange:implemented')) {
              window.retrieve('hashchange:checker')();
            }
          }

          //check ie browsers
          window.sethash = sethash;
        },

  onDelete:function() {
             if($type(this) == 'window') {
               var timer = window.retrieve('hashchange:timer');
               if(timer) {
                 $clear(timer); timer = null;
                 window.store('hashchange:timer',null);
               }
             }
           }
}

})(document.id,$$);
