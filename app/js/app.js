/**
 * nvt: app.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130430 spolu    Creation
 */
'use strict';

angular.module('nvt', ['nvt.directives', 'nvt.filters', 'nvt.services']);
angular.module('nvt.directives', []);
angular.module('nvt.filters', []);
angular.module('nvt.services', []);

function TopCtrl($scope, _session) {
  console.log(JSON.stringify(_session.json()));
};

