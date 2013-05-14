/**
 * breach: stack_d.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130506 @spolu    Creation & Base key handling
 */
'use strict';

//
// ## StackCtrl
// `stack` directive controller.
//
angular.module('breach.directives').
  controller('StackCtrl', function($scope, $element, _session, _colors) {

  $scope.stack = [];
  $scope.nav = false;

  for(var id in _session.terms()) {
    $scope.stack.push(id);
  }

  $scope.$on('spawn', function(id, term) {
    $scope.stack.unshift(id);
  });

  $scope.switch_nav = function() {
    $scope.nav = !$scope.nav;
  };

  $('body').keypress(function(evt) {
    /* CTRL-G to activate/deactivate nav */
    if(evt.keyCode == 7 && evt.ctrlKey) {
      $scope.$apply(function() {
        $scope.switch_nav();
      });
    }
    else if(!$scope.nav && $scope.stack.length > 0) { 
      _session.keypress($scope.stack[0], evt);
    }
  });
  $('body').keydown(function(evt) {
    if(!$scope.nav && $scope.stack.length > 0) { 
      _session.keydown($scope.stack[0], evt);
    }
  });

});

//
// ## stack
// ```
// ```
// The `stack` directive renders a visible terminal buffer using `_session` or
// a navigation menu. It also captures user input.
//
angular.module('breach.directives').
  directive('stack', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
    },
    templateUrl: 'partials/stack_d.html',
    controller: 'StackCtrl'
  };
});
