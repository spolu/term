/*
 * nvt: session.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130430 @spolu    Added cols/rows to spec
 * - 20130429 @spolu    Base implementation and event emission
 * - 20130414 @spolu    Basic architecture and documentation
 */
var common = require('../common.js');
var util = require('util');
var events = require('events');

'use strict';

// 
// ## Session
//
// The `session` object is in charge of keeping track of the opened terms. It 
// also creates the ptys when spawning a new term. It exposes an API to receive 
// keyboard input (and redirect it to the active terminal). It also triggers 
// the resizing of the terminals when needed.
//
// There is only one open terminal at a time so a session really is a list of
// terminals. That's why it can keep track of the size in rows of cols of these
// terminals.
//
// The session implements a stacked navigation, which means that the active term
// is always the one present at index 0. So there's no need to track the active
// index.
//
// TODO: 
// - Move to a file based storage of the current session
// - PAM integration
// ```
// @inherits events.EventEmitter
// @param spec { cols, rows }
//
// @emits `refresh` [index, top, bottom, slice]
// @emits `title`   [index, title]
//
// @emits `spawn`   [json]
// @emits `resize`  [cols, rows]
// @emits `focus`   [index]
// @emits `write`   [data]
// ```
//
var session = function(spec, my) {
  var _super = {};
  my = my || {};

  // 
  // #### _private members_
  //
  my.terms = [];
  my.cols = spec.cols || 80;
  my.rows = spec.rows || 24;

  // 
  // _public methods_
  //
  var spawn;    /* spawn(); */
  var json;     /* json(index); */
  var resize;   /* resize(cols, rows); */
  var write;    /* write(data); */
  var focus;    /* focus(index); */

  var push;     /* push(line, rows); */

  //
  // #### _that_
  //
  var that = new events.EventEmitter();

  //
  // ### spawn
  // Spawns a `sh` shell within a new `pty`, pass it to a new `term` object
  // constructor and push that `term` on the list of terms.
  //
  spawn = function() {
    var pty = require('pty.js').spawn('sh', [], {
      name: 'xterm_color',
      cols: my.cols,
      rows: my.rows,
      cwd: process.env.HOME,
      env: process.env
    });

    var term = require('./term.js').term({ 
      pty: pty,
      cols: my.cols,
      rows: my.rows
    });

    term.on('resize', function(geometry) {
      /* Nothing To Do. */
    });
    term.on('refresh', function(top, bottom, slice) {
      var idx = my.terms.indexOf(term);
      if(idx !== -1) {
        that.emit(idx, top, bottom, slice);
      }
    });
    term.on('title', function(title) {
      var idx = my.terms.indexOf(term);
      if(idx !== -1) {
        that.emit(idx, title);
      }
    });

    my.terms.unshift(term);

    that.emit('spwan', json(0));
  };

  //
  // ### json
  // ```
  // @index {number} the index of the terminal to dump [optional]
  // ```
  // Dumps an object representation of the terminal at index `index` or the
  // whole session if no index is specified
  //
  json = function(index) {
    if(typeof index === 'number' && my.terms[index]) {
      return {
        title: my.terms[index].title(),
        buffer: my.terms[index].buffer()
      }
    }
    else if(typeof index === 'undefined') {
      var session = { terms: [] };
      for(var i = 0; i < my.terms.length; i ++) {
        session.terms[i] = json(i);
      }
      return session;
    }
  };

  //
  // ### resize
  // ```
  // @cols {number} the number of cols
  // @rows {number} the number of rows
  // ```
  // Informs the session that the window size has changed. This will be 
  // forwarded to the underlying terminals.
  //
  resize = function(cols, rows) {
    my.terms.forEach(function(t) {
      t.resize(cols, rows);
    });
    that.emit('resize', cols, rows);
  };

  //
  // ### write
  // ```
  // @data the data to write to the active term's underlying pty socket
  // ```
  // Writes received data into the current term.
  //
  write = function(data) {
    if(my.terms.length > 0)
      my.terms[0].write(data);
    that.emit('write', data);
  };

  //
  // ### show
  // ```
  // @index the `term` to focus on
  // ```
  // Focuses on the terminal at the provided index.
  //
  focus = function(index) {
    that.emit('focus', index);
    var t = my.terms.splice(index, 1)[0];
    my.terms.unshift(t);
  };

  //
  // #### _initialization_
  //
  spawn();

  common.method(that, 'spawn', spawn, _super);
  common.method(that, 'json', json, _super);
  common.method(that, 'resize', resize, _super);
  common.method(that, 'write', write, _super);
  common.method(that, 'focus', focus, _super);

  return that;
};

exports.session = session;

