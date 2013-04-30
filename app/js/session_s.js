/**
 * nvt: session_s.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130430 spolu    Creation
 */
'use strict';

//
// ## _session
//
angular.module('nvt.services').
  factory('_session', function($rootScope) {
    var s = require('../lib/session/session.js').session({ cols: 80, rows: 24 });

    var _session = {
      json: function(index) {
        return s.json(index);
      },
      spawn: function() {
        return s.spawn();
      },
      resize: function(cols, rows) {
      },
      write: function(keyCode) {
      },
      focus: function(index) {
        return s.focus(index);
      }
    };

    return _session;
});

