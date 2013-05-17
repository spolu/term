/**
 * breach: term_d.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130517 @spolu    Cursor display
 *                      Added basic scrolling and snapping
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
  // @glyph {array} a glyph
  // @x     {number} column number
  // @y     {numver} row number
  // ```
  // Computes the CSS style of a given glyph as an object
  //
  var CHAR_ATTRS = {
    NULL: 0,
    REVERSE: 1,
    UNDERLINE: 2,
    BOLD: 4,
    GFX: 8,
    ITALIC: 16,
    BLINK: 32
  };

  $scope.glyph_style = function(glyph, x, y) {
    var style = null;
    if((glyph[0] >> 18) & CHAR_ATTRS.BOLD) {
      style = style || '';
      style += 'font-weight: bold;';
    }
    if((glyph[0] >> 18) & CHAR_ATTRS.UNDERLINE) {
      style = style || '';
      style += 'text-decoration: underline;';
    }
    if((glyph[0] >> 18) & CHAR_ATTRS.ITALIC) {
      style = style || '';
      style += 'font-style: italic;';
    }
    if(x === $scope.cursor.x && y === $scope.cursor.y) {
      style = style || '';
      style += 'background-color: ' + _colors.palette[257] + ';';
      style += 'color: ' + _colors.palette[256] + ';';
      return style;
    }
    var bg = glyph[0] & 0x11f;
    var fg = (glyph[0] >> 9) & 0x11f;
    if(fg !== 257 || bg !== 256) {
      style = style || '';
      style += 'background-color: ' + _colors.palette[bg] + ';';
      style += 'color: ' + _colors.palette[fg] + ';';
    }
    if((glyph[0] >> 18) & CHAR_ATTRS.REVERSE) {
      style = style || '';
      style += 'background-color: ' + _colors.palette[fg] + ';';
      style += 'color: ' + _colors.palette[bg] + ';';
    }
    return style;
  };

  //
  // ### render_line
  // ```
  // @line {array} line of glyphs
  // @y    {number} line number
  // ```
  // Renders a line of glyphs as div element
  //
  $scope.render_line = function(line, y) {
    var el = document.createElement('div');
    el.className = 'line';

    var html = '';
    var x = 0;
    line.forEach(function(glyph) {
      var style = $scope.glyph_style(glyph, x, y);
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
      x++;
    });
    el.innerHTML = html;
    return el;
  };

  //
  // ### $on#refresh
  // ```
  // @evt    {event} the event triggering this handler
  // @id     {string} the term id associated with this event
  // @dirty  {array} the dirty region [first_line, last_line]
  // @slice  {array} the slice of buffer to replace
  // @cursor {object} the cursor object
  // ```
  // Handles a refresh event and refreshes the terminal if needed
  //
  $scope.$on('refresh', function(evt, id, dirty, slice, cursor) {
    if($scope.id === id) {
      $scope.cursor = cursor;
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
  $scope.cursor = _session.terms($scope.id).cursor;
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
