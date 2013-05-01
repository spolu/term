/**
 * nvt: session_s.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130501 @spolu    Changed API (id based, dict)
 * - 20130430 @spolu    Creation
 */
'use strict';

//
// ## _session
// Service in charge of exposing the underlying session object
//
angular.module('nvt.services').
  factory('_session', function($rootScope, $window) {
  //
  // ### compute_cols
  // ```
  // @w {number} a width in pixel
  // ```
  // Computes the number of cols to fit in a given window width in pixel
  //
  var compute_cols = function(w) {
    return Math.floor(w / 10);
  };

  //
  // ### compute_rows
  // ```
  // @h {number} a height in pixel
  // ```
  // Computes the number of rows to fit in a given window height in pixel
  //
  var compute_rows = function(h) {
    return Math.floor(h / 15);
  };

  var terms = {};

  var session = require('../lib/session/session.js').session({});

  $($window).resize(function() {
    /*
    session.resize(compute_cols($($window).width()),
                   compute_rows($($window).height()));
    */
  });

  session.on('spawn', function(id, term) {
    console.log('SPAWN: [' + id + ']');
    terms[id] = term;
  });

  session.on('refresh', function(id, dirty, slice) {
    console.log('REFRESH [' + id + ']: ' + dirty);
    terms[id].buffer.splice(dirty[0], dirty[1] - dirty[0], slice);
  });

  session.on('title', function(id, title) {
    console.log('REFRESH [' + id + ']');
    terms[id].title = title;
  });


  //
  // #### _test_
  //
  session.spawn(compute_cols($($window).width()),
                compute_rows($($window).height()));

  var _session = {
    terms: function() {
      return terms;
    },
    spawn: function() {
      return session.spawn();
    },
    write: function(keyCode) {
    },
    cols: function() {
      return compute_cols($($window).width());
    },
    rows: function() {
      return compute_rows($($window).height());
    }
  };

  return _session;
});

