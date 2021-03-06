/**
 * breach: session_s.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130517 @spolu    Cursor handling and event forwarding
 * - 20130510 @spolu    Key handling support
 * - 20130502 @spolu    Refresh and resize handling
 * - 20130501 @spolu    Changed API (id based, dict)
 * - 20130430 @spolu    Creation
 */
'use strict';

//
// ## _session
// Service in charge of exposing the underlying session object
//
angular.module('breach.services').
  factory('_session', function($rootScope, $window, $filter) {
  //
  // ### col_width
  //
  var col_width = 7;
  //
  // ### row_height
  //
  var row_height = 12;

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

  var session = require('../lib/session.js').session({});
  var terms = {};

  //
  // ### handle of resize
  // Resize is handled only on row/col boundary triggering a call to the
  // underlying session resize method
  //
  var cols = compute_cols($($window).width());
  var rows = compute_rows($($window).height());

  $($window).resize(function() {
    if(cols !== compute_cols($($window).width()) ||
       rows !== compute_rows($($window).height())) {
      cols = compute_cols($($window).width());
      rows = compute_rows($($window).height());
      session.resize(null, cols, rows);
    }
  });

  //
  // ### spawn
  // Event triggered when a new terminal is spawned within the current session
  //
  session.on('spawn', function(id, term) {
    terms[id] = term;
    /*
    console.log('SPAWN: [' + id + ']');
    console.log('STATE [' + id + '] ' + 
                terms[id].buffer[0].length + 'x' + terms[id].buffer.length);
    */
    $rootScope.$broadcast('spawn', id, term);
  });

  //
  // ### refresh
  // Event triggered when a terminal need to refresh part of his buffer
  //
  session.on('refresh', function(id, dirty, slice, cursor) {
    if((dirty[1] - dirty[0] + 1) < slice.length)
      throw new Error('dirty < slice');
    terms[id].cursor = cursor;
    var args = [dirty[0], dirty[1] - dirty[0] + 1].concat(slice);
    Array.prototype.splice.apply(terms[id].buffer, args);
    /*
    console.log('REFRESH [' + id + '] [' + dirty[0] + ', ' + dirty[1] + '] ' + 
                                     '(' + slice.length + ') ' + 
                                     '{' + cursor.x + ', ' + cursor.y + '}');
    console.log('STATE [' + id + '] ' + 
                terms[id].buffer[0].length + 'x' + terms[id].buffer.length);
    */
    $rootScope.$apply(function() {
      $rootScope.$broadcast('refresh', id, dirty, slice, cursor);
    });
  });

  //
  // ### alternate
  // Event triggered when a terminal sets itself in alternate screen mode
  //
  session.on('alternate', function(id, is_alt, buffer) {
    terms[id].buffer = buffer;
    /*
    console.log('ALTERNATE [' + id + '] ' + is_alt);
    */
    $rootScope.$apply(function() {
      $rootScope.$broadcast('alternate', id, is_alt);
    });
  });

  //
  // ### title
  // Event triggered when the title of a terminal is set
  //
  session.on('title', function(id, title) {
    /*
    console.log('TITLE [' + id + '] ' + title);
    console.log('STATE [' + id + '] ' + 
                terms[id].buffer.length + ' ' + terms[id].buffer[0].length);
    */
    terms[id].title = title;
    $rootScope.$apply(function() {
      $rootScope.$broadcast('title', id, title);
    });
  });


  var _session = {
    terms: function(id) {
      if(id) {
        if(terms[id]) return terms[id];
        else return null;
      }
      return terms;
    },

    //
    // ### spawn
    // Spawns a new term in the current session
    //
    spawn: function() {
      return session.spawn(cols, rows);
    },

    //
    // ### keydown
    // ```
    // @id  {string} the id of the targeted terminal
    // @evt {event} the keypress event
    // ```
    // `keydown` events are used for escape sequences
    //
    keydown: function(id, evt) {
      var str = $filter('keymap')(evt, session.term_mode(id));
      if(typeof str === 'string' && str.length > 0)
        session.write(id, str);
    },

    //
    // ### keypress
    // ```
    // @id  {string} the id of the targeted terminal
    // @evt {event} the keypress event
    // ```
    // `keypress` events are used for normal unescaped characters
    //
    keypress: function(id, evt) {
      session.write(id, String.fromCharCode(evt.charCode));
      evt.preventDefault();
      evt.stopPropagation();
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

