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
  controller('StackCtrl', function($scope, $element, $timeout, _session) {

  $scope.stack = [];
  $scope.nav = false;
  $scope.active = -1;

  for(var id in _session.terms()) {
    $scope.stack.push(id);
    $scope.active = $scope.stack.length - 1;
  }

  //
  // $on#spawn
  // ```
  // @evt  {event} the event triggering this handler
  // @id   {string} the newly spanwed term id
  // @term {object} the term object representation
  // ```
  // Handles new terminal spawns
  //   
  $scope.$on('spawn', function(evt, id, term) {
    $scope.stack.unshift(id);
    $scope.active = 0;
  });

  //
  // ### switch_nav
  // Switches the navigation mode
  //
  $scope.switch_nav = function() {
    $scope.nav = !$scope.nav;
  };

  // 
  // ### $#keypress
  // ```
  // @evt {event} the event triggering this handler
  // ```
  // Forwards the `keypress` events to the session for the currently active term
  // or intercepts and handles them if in navigation mode
  //
  $('body').keypress(function(evt) {
    /* CTRL-G to activate/deactivate nav */
    if(evt.keyCode == 7 && evt.ctrlKey) {
      $scope.$apply(function() {
        $scope.switch_nav();
      });
    }
    else if(!$scope.nav) {
      if($scope.stack.length > 0) { 
        _session.keypress($scope.stack[0], evt);
      }
    }
    else {
      /* TODO: handle keys */
      switch(evt.keyCode) {
        case 73: {
          require('nw.gui').Window.get().showDevTools();
          break;
        }
      };
    }
  });

  $(document).bind('paste', function(evt) {
    if(!$scope.nav) {
      var textarea = document.createElement('textarea');
      textarea.className = 'paste';
      $($element).append(textarea);
      $(textarea).focus();
      $timeout(function() {
        var paste = $(textarea).val();
        $(textarea).remove();
        _session.write($scope.stack[$scope.active], paste);
      }, 1);
    }
  });


  // 
  // ### $on#keydown
  // ```
  // @evt {event} the event triggering this handler
  // ```
  // Forwards the `keydown` events to the session for the currently active term
  //
  $('body').keydown(function(evt) {
    if(!$scope.nav) {
      if($scope.stack.length > 0) { 
        _session.keydown($scope.stack[0], evt);
      }
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
