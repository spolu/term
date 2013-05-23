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

  var CHAR_ATTRS = {
    NULL: 0,
    REVERSE: 1,
    UNDERLINE: 2,
    BOLD: 4,
    GFX: 8,
    ITALIC: 16,
    BLINK: 32
  };

  //
  // ### glyph_style
  // ```
  // @attr {number} a glyph character attribute
  // ```
  // Computes the CSS style of a given glyph as an object
  //
  $scope.glyph_style = function(attr) {
    var style = null;
    if((attr >> 18) & CHAR_ATTRS.BOLD) {
      style = style || '';
      style += 'font-weight: bold;';
    }
    if((attr >> 18) & CHAR_ATTRS.UNDERLINE) {
      style = style || '';
      style += 'text-decoration: underline;';
    }
    if((attr >> 18) & CHAR_ATTRS.ITALIC) {
      style = style || '';
      style += 'font-style: italic;';
    }
    var bg = attr & 0x11f;
    var fg = (attr >> 9) & 0x11f;
    if(fg !== 257 || bg !== 256) {
      style = style || '';
      style += 'background-color: ' + _colors.palette[bg] + ';';
      style += 'color: ' + _colors.palette[fg] + ';';
    }
    if((attr >> 18) & CHAR_ATTRS.REVERSE) {
      style = style || '';
      style += 'background-color: ' + _colors.palette[fg] + ';';
      style += 'color: ' + _colors.palette[bg] + ';';
    }
    return style;
  };

  // 
  // ### ctohtml
  // ```
  // @char {string} a character
  // ```
  // Transforms a character into a html string
  //
  $scope.ctohtml = function(char) {
    switch(char[1]) {
      case '&': {
        return '&amp;';
      }
      case '<': {
        return '&lt;;';
      }
      case '>': {
        return '&gt;';
      }
      default: {
        return char <= ' ' ? '&nbsp;' : char;
      }
    }
  };

  //
  // ### compress_line
  // ```
  // @line {array} line of glyphs
  // ```
  // Compress the line of glyph into an array of [string, style] words
  //
  $scope.compress_line = function(line) {
    /* Prune the postfixing spaces. To avoid mutating the original buffer, we */
    /* slice it before pruning it. We use the is_blank function to decide     */
    /* wether the character can be pruned or not                              */
    var line = line.slice(0);
    var is_blank = function(glyph) {
      return (line[line.length - 1][1] <= ' ' &&
              line[line.length - 1][0] & 0x11f === 256 &&
              (line[line.length - 1][0] >> 18) & CHAR_ATTRS.REVERSE);
    };
    while(line.length > 0 && is_blank(line[line.length - 1]))
      line.pop();
    if(line.length === 0)
      return [];

    var words = [];

    var cur_style = line[0][0];
    var cur_string = $scope.ctohtml(line[0][1]);
    for(var i = 1; i < line.length; i ++) {
      if(cur_style === line[i][0]) {
        cur_string += $scope.ctohtml(line[i][1]);
      }
      else {
        words.push([cur_string, $scope.glyph_style(cur_style)]);
        cur_style = line[i][0];
        cur_string = $scope.ctohtml(line[i][1]);
      }
    }
    words.push([cur_string, $scope.glyph_style(cur_style)]);

    return words;
  };

  //
  // ### render_line
  // ```
  // @line   {array} line of glyphs
  // ```
  // Renders a line of glyphs as div element
  //
  $scope.render_line = function(line) {
    var words = $scope.compress_line(line);
    var el = document.createElement('div');
    el.className = 'line';

    var html = '';
    words.forEach(function(word) {
      if(word[1]) {
        html += '<span style="' + word[1] + '">';
      }
      html += word[0];
      if(word[1]) {
        html += '</span>';
      }
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
        /* direct update */
        if(i >= $scope.screen.base) {
          var n = $scope.screen.container.childNodes[i - $scope.screen.base];
          $scope.screen.container.insertBefore($scope.screen.nodes[i], n);
          $scope.screen.container.removeChild(n);
        }
      }
      for(var i = sentinel - 1; i >= dirty[0] + slice.length; i--) {
        var n = $scope.screen.nodes[i];
        delete $scope.screen.nodes[i];
        /* direct update */
        $scope.screen.container.removeChild(n);
      }
      var df = null;
      for(var i = sentinel; i < (dirty[1] + 1); i++) {
        if(slice[i - dirty[0]]) {
          $scope.screen.nodes[i] = 
            $scope.render_line(slice[i - dirty[0]], i, cursor);
          /* direct update */
          $scope.screen.container.appendChild($scope.screen.nodes[i]);
          if($scope.screen.container.childNodes.length > _session.rows()) {
            var n = $scope.screen.container.childNodes[0]
            $scope.screen.container.removeChild(n);
            $scope.screen.base++;
          }
        }
      }
      $scope.screen.base = $scope.screen.nodes.length - _session.rows();
    }
  });

  $scope.$on('alternate', function(evt, id, is_alt) {
    if($scope.id === id) {
      if(is_alt) {
        $scope.alternate.container.className = 'container';
        $scope.main.container.className = 'container hidden';
        $scope.screen = $scope.alternate;
        $scope.init();
      }
      else {
        $scope.alternate.container.className = 'container hidden';
        $scope.main.container.className = 'container';
        $scope.screen = $scope.main;
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
    $scope.screen.nodes = [];
    while ($scope.screen.container.firstChild) {
      $scope.screen.container.removeChild($scope.screen.container.firstChild);
    } 
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
  $($element).append($scope.alternate.container);

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
