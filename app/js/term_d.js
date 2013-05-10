/**
 * nvt: term_d.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130508 @spolu    Faster rendering using pure HTML
 * - 20130502 @spolu    Creation
 */
'use strict';

//
// ## TermCtrl
// `term` directive controller.
//
angular.module('nvt.directives').
  controller('TermCtrl', function($scope, $element, _session, _colors) {

  //
  // ### glyph_style
  // ```
  // glyph {array} a glyph
  // ```
  // Computes the CSS style of a given glyph
  //
  $scope.glyph_style = function(glyph) {
    var style = '';
    var bg = glyph[0] & 0x11f;
    style += 'background-color: ' + _colors.palette[bg] + ';';
    var fg = (glyph[0] >> 9) & 0x11f;
    style += 'color: ' + _colors.palette[fg] + ';';
    return style;
  };

  //
  // ### render_line
  // ```
  // @line {array} line of glyphs
  // @lnum {number} line number
  // ```
  // Renders a line of glyphs into an html string
  //
  $scope.render_line = function(line, lnum) {
    var html = '';
    html += '<div class="line" id="' + $scope.id + '-' + lnum + '">';
    line.forEach(function(glyph) {
      html += '<div class="glyph" style="' + $scope.glyph_style(glyph) + '">';
      html +=   glyph[1];
      html += '</div>';
    });
    html += '</div>';
    return html;
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
      for(var i = dirty[0]; i < dirty[1] + 1; i++) {
        if($($element).find('#' + $scope.id + '-' + i).length === 0) {
          if(slice[i - dirty[0]]) {
            var html = $scope.render_line(slice[i - dirty[0]], i);
            $($element).append(html);
          }
        }
        else {
          if(slice[i - dirty[0]]) {
            var html = $scope.render_line(slice[i - dirty[0]], i);
            $($element).find('#' + $scope.id + '-' + i).html(html);
          }
          else {
            $($element).find('#' + $scope.id + '-' + i).remove();
          }
        }
      }
    }
  });


  //
  // #### _initialization_
  //
  $scope.buf = _session.terms($scope.id).buffer;
  var html = '';
  for(var i = 0; i < $scope.buf.length; i ++) {
    html += $scope.render_line($scope.buf[i], i);
  }
  $($element).html(html);


});

//
// ## term
// ```
// @=id     {string} the term id to render (see session_s.js)
// ```
// The `term` directive renders a terminal buffer using `_session` data and row
// & cols sizes specification.
//
angular.module('nvt.directives').
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
