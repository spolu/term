/**
 * breach: term_d.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130517 @spolu    Added basic scrolling and snapping
 * - 20130508 @spolu    Faster rendering using pure HTML
 * - 20130502 @spolu    Creation
 */
'use strict';

//
// ## TermCtrl
// `term` directive controller.
//
angular.module('breach.directives').
  controller('TermCtrl', function($scope, $element, $window, 
                                  _session, _colors) {

  //
  // ### snap
  // Snaps the term to the bottom of the container. (used when a new line is
  // added a the bottom of the buffer.
  //
  $scope.snap = function() {
    var c = $($scope.container);
    var d = c.height() - $($element).height();
    d = d > 0 ? d : 0;
    c.css({
      top: -d + 'px'
    });
  };


  //
  // ### glyph_style
  // ```
  // glyph {array} a glyph
  // ```
  // Computes the CSS style of a given glyph as an object
  //
  $scope.glyph_style = function(glyph) {
    var style = null;
    var bg = glyph[0] & 0x11f;
    var fg = (glyph[0] >> 9) & 0x11f;
    if(fg !== 257 || bg !== 256) {
      style = '';
      style += 'background-color: ' + _colors.palette[bg] + ';';
      style += 'color: ' + _colors.palette[fg] + ';';
    }
    return style;
  };

  //
  // ### render_line
  // ```
  // @line {array} line of glyphs
  // @lnum {number} line number
  // ```
  // Renders a line of glyphs as div element
  //
  $scope.render_line = function(line, lnum) {
    var el = document.createElement('div');
    el.className = 'line';
    el.id = $scope.id + '-' + lnum;

    var html = '';
    line.forEach(function(glyph) {
      var style = $scope.glyph_style(glyph);
      if(style) {
        html += '<span style="' + style + '">';
      }
      switch(glyph[1]) {
        case '&': {
          html += '&amp;';
          break;
        }
        case '<': {
          html += '&lt;';
          break;
        }
        case '>': {
          html += '&gt;';
          break;
        }
        default: {
          html += glyph[1] <= ' ' ? '&nbsp;' : glyph[1];
        }
      }
      if(style) {
        html += '</span>';
      }
    });
    el.innerHTML = html;
    return el;
  };

  //
  // ### $on#refresh
  // ```
  // @evt {event} the event triggering this handler
  // @id  {string} the term id associated with this event
  // @dirty {array} the dirty region [first_line, last_line]
  // @slice {array} the slice of buffer to replace
  // ```
  // Handles a refresh event and refreshes the terminal if needed
  //
  $scope.$on('refresh', function(evt, id, dirty, slice) {
    if($scope.id === id) {
      var i = dirty[0];
      for(;i < (dirty[1] + 1) && i < $scope.container.childNodes.length; i++) {
        var el = $scope.container.childNodes[i];
        if(slice[i - dirty[0]]) {
          var n = $scope.render_line(slice[i - dirty[0]], i);
          $scope.container.replaceChild(n, el);
        }
        else {
          $scope.container.removeChild(el);
        }
      }
      var df = null;
      for(;i < (dirty[1] + 1); i++) {
        if(slice[i - dirty[0]]) {
          df = df || document.createDocumentFragment();
          df.appendChild($scope.render_line(slice[i - dirty[0]], i));
        }
      }
      if(df) {
        $scope.container.appendChild(df);
      }
      $scope.snap();
    }
  });

  //
  // ### refresh_height
  // Sets the height of the term div according to the window height
  //
  $scope.refresh_height = function() {
    $($element).height($($window).height());
  };

  //
  // ### $window#resize
  //
  $($window).resize(function() {
    $scope.refresh_height();
    $scope.snap();
  });

  //
  // ### $element#mousewheel
  //
  $(document).ready(function(){
    $($element).bind('mousewheel', function(e){
      var c = $($scope.container);
      var h = c.height() - $($element).height();
      var top = c.position().top;
      top += e.originalEvent.wheelDeltaY / 2;
      top = top > 0 ? 0 : top;
      top = top < -h ? -h : top;
      c.css({
        top: top + 'px'
      });
    });
  });


  //
  // #### _initialization_
  //
  $scope.container = document.createElement('div');
  $scope.container.className = 'container';
  $($element).append($scope.container);

  $scope.refresh_height();

  $scope.buf = _session.terms($scope.id).buffer;
  var df = document.createDocumentFragment();
  for(var i = 0; i < $scope.buf.length; i ++) {
    df.appendChild($scope.render_line($scope.buf[i], i));
  }
  $scope.container.appendChild(df);

});

//
// ## term
// ```
// @=id     {string} the term id to render (see session_s.js)
// ```
// The `term` directive renders a terminal buffer using `_session` data and row
// & cols sizes specification.
//
angular.module('breach.directives').
  directive('term', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      id: '=id'
    },
    template: '<div class="term"></div>',
    controller: 'TermCtrl'
  };
});
