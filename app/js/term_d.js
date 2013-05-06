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

  $scope.buffer = function() {
    var buf = _session.terms($scope.id).buffer;
    return buf;
  };
  $scope.style = function(glyph) {
    var style = '';
    var bg = glyph[0] & 0x11f;
    style += 'background-color: ' + _colors.palette[bg] + ';';
    var fg = (glyph[0] >> 9) & 0x11f;
    style += 'color: ' + _colors.palette[fg] + ';';
    return style;
  };

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
    templateUrl: 'partials/term_d.html',
    controller: 'TermCtrl'
  };
});
