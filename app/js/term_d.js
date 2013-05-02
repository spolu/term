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
// ## TermController
// `term` directive controller.
//
angular.module('nvt.directives').
  controller('TermCtrl', function($scope, $element, _session) {

  $scope.buffer = function() {
    var buf = _session.terms($scope.id).buffer;
    return buf;
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
