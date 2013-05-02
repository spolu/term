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
  // ### col_width
  //
  var col_width = 8;
  //
  // ### row_height
  //
  var row_height = 14;

  //
  // ### compute_cols
  // ```
  // @w {number} a width in pixel
  // ```
  // Computes the number of cols to fit in a given window width in pixel
  //
  var compute_cols = function(w) {
    return Math.floor(w / col_width);
  };

  //
  // ### compute_rows
  // ```
  // @h {number} a height in pixel
  // ```
  // Computes the number of rows to fit in a given window height in pixel
  //
  var compute_rows = function(h) {
    return Math.floor(h / row_height);
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
    $rootScope.$broadcast('spawn', id, term);
  });

  session.on('refresh', function(id, dirty, slice) {
    console.log('REFRESH [' + id + ']: ' + dirty);
    $rootScope.$digest(function() {
      terms[id].buffer.splice(dirty[0], dirty[1] - dirty[0], slice);
    });
    $rootScope.$broadcast('refresh', id, dirty, slice);
  });

  session.on('title', function(id, title) {
    console.log('TITLE [' + id + ']: ' + title);
    terms[id].title = title;
    $rootScope.$broadcast('title', id, title);
  });


  var _session = {
    terms: function(id) {
      if(id) {
        if(terms[id]) return terms[id];
        else return null;
      }
      return terms;
    },
    spawn: function() {
      return session.spawn(compute_cols($($window).width() - 2),
                           compute_rows($($window).height()) - 2);
    },
    write: function(keyCode) {
    },
    cols: function() {
      return compute_cols($($window).width());
    },
    rows: function() {
      return compute_rows($($window).height());
    },
    col_width: function() {
      return col_width;
    },
    row_height: function() {
      return row_height;
    }
  };

  return _session;
});

