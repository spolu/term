/**
 * nvt: term_d.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
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
  // ```
  // Renders a line of glyphs into an html string
  //
  $scope.render_line = function(line, number) {
    var html = '';
    html += '<div class="line" id="' + $scope.id + '-' + number + '">';
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
  //
  $scope.$on('refresh', function(id, dirty, slice) {
    /* TODO: refresh of lines */
  });


  //
  // #### _initialization_
  //
  $scope.buf = _session.terms($scope.id).buffer;
  var html = '';
  $scope.buf.forEach(function(line) {
    html += $scope.render_line(line);
  });
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
