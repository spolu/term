/**
 * breach: app.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130402 @spolu    Added `terms` in scope and initial `spawn`
 * - 20130430 @spolu    Creation
 */
'use strict';

angular.module('breach', ['breach.directives', 'breach.filters', 'breach.services']);
angular.module('breach.directives', []);
angular.module('breach.filters', []);
angular.module('breach.services', []);

function TopCtrl($scope, $window, $timeout, _session) {


  //
  // #### _test_
  //
  $timeout(_session.spawn, 10);
};

