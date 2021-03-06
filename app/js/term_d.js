/**
 * breach: term_d.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130520 @spolu    Fix height resize causes the cursor to disappear #14
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
  // ### glyph_style
  // ```
  // @glyph  {array} a glyph
  // @x      {number} column number
  // @y      {numver} row number
  // @cursor {object} current cursor object
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

  $scope.glyph_style = function(glyph, x, y, cursor) {
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
    if(x === cursor.x && y === cursor.y) {
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
  // @line   {array} line of glyphs
  // @y      {number} line number
  // @cursor {object} current cursor object
  // ```
  // Renders a line of glyphs as div element
  //
  $scope.render_line = function(line, y, cursor) {
    var el = document.createElement('div');
    el.className = 'line';

    var html = '';
    var x = 0;
    line.forEach(function(glyph) {
      var style = $scope.glyph_style(glyph, x, y, cursor);
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
  // ### refresh_height
  // Sets the height of the term div according to the window height
  //
  $scope.refresh_height = function() {
    $($element).height($($window).height());
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
      var sentinel = Math.min(dirty[1] + 1, $scope.screen.nodes.length);
      for(var i = dirty[0]; i < sentinel && i < dirty[0] + slice.length; i++) {
        $scope.screen.nodes[i] = 
          $scope.render_line(slice[i - dirty[0]], i, cursor);
      }
      for(var i = sentinel - 1; i >= dirty[0] + slice.length; i--) {
        delete $scope.screen.nodes[i];
      }
      var df = null;
      for(var i = sentinel;i < (dirty[1] + 1); i++) {
        if(slice[i - dirty[0]]) {
          $scope.screen.nodes[i] = 
            $scope.render_line(slice[i - dirty[0]], i, cursor);
        }
      }
      $scope.screen.base = $scope.screen.nodes.length - _session.rows();
      $scope.redraw();
    }
  });

  $scope.$on('alternate', function(evt, id, is_alt) {
    if($scope.id === id) {
      if(is_alt) {
        $scope.alternate.className = 'container';
        $scope.main.className = 'container hidden';
        $scope.container = $scope.alternate;
        $scope.init();
      }
      else {
        $scope.alternate.className = 'container hidden';
        $scope.main.className = 'container';
        $scope.container = $scope.main;
      }
    }
  });

  //
  // ### $window#resize
  //
  $($window).resize(function() {
    $scope.refresh_height();
  });

  //
  // ### $element#mousewheel
  //
  /*
  $(document).ready(function(){
    $($element).bind('mousewheel', function(e){
      var c = $($scope.container);
      var h = c.height() - _session.row_height() * _session.rows();
      var top = c.position().top;
      top += e.originalEvent.wheelDeltaY / 2;
      top = top > 0 ? 0 : top;
      top = top < -h ? -h : top;
      c.css({
        top: top + 'px'
      });
    });
  });
  */

  //
  // ### redraw
  // Redraws the current container with the appropriate nodes given current
  // base and nodes list
  //
  $scope.redraw = function() {
    while($scope.screen.container.hasChildNodes()) {
      $scope.screen.container.removeChild($scope.screen.container.lastChild);
    }
    var df = document.createDocumentFragment();
    for(var i = $scope.screen.base; 
        i < $scope.screen.nodes.length && 
        i < $scope.screen.base + _session.rows();
        i++) {
      df.appendChild($scope.screen.nodes[i]);
    }
    $scope.screen.container.appendChild(df);
  };

  //
  // ### init
  // Initialise the current container (alternate or main)
  //
  $scope.init = function(alternate) {
    var buffer = _session.terms($scope.id).buffer;
    var cursor = _session.terms($scope.id).cursor;
    for(var i = 0; i < buffer.length; i ++) {
      $scope.screen.nodes[i] = $scope.render_line(buffer[i], i, cursor);
    }
    $scope.redraw();
  };


  //
  // #### _initialization_
  //
  /* main */
  $scope.main = {
    container: document.createElement('div'),
    nodes: [],
    base: 0
  };
  $scope.main.container.className = 'container';
  $($element).append($scope.main.container);

  /* alternate */
  $scope.alternate = {
    container: document.createElement('div'),
    nodes: [],
    base: 0
  };
  $scope.alternate.container.className = 'container hidden';
  $($element).append($scope.alternate);

  $scope.refresh_height();

  $scope.screen = $scope.main;
  $scope.init();
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
