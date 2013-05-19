/*
 * breach: session.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130517 @spolu    Cursor data forwarding
 * - 20130501 @spolu    API Change (no stack, term dictionary)
 * - 20130430 @spolu    Added cols/rows to spec
 * - 20130429 @spolu    Base implementation and event emission
 * - 20130414 @spolu    Basic architecture and documentation
 */
var common = require('./common.js');
var util = require('util');
var events = require('events');
var uuid = require('node-uuid');

'use strict';

// 
// ## Session
//
// The `session` object is in charge of keeping track of the opened terms. It 
// also creates the ptys when spawning a new term. It exposes an API to receive 
// keyboard input. It also triggers the resizing of the terminals when needed.
//
// The navigation or organization of the terminals is left to the client. A
// session really just is a dictionary of opened terminals
//
// TODO: 
// - Move to a file based storage of the current session
// - PAM integration
// ```
// @inherits events.EventEmitter
// @param spec {}
//
// @emits `refresh` [id, dirty, slice, cursor]
// @emits `title`   [id, title]
//
// @emits `spawn`   [id, term]
// @emits `resize`  [id, cols, rows]
// @emits `write`   [id, data]
// ```
//
var session = function(spec, my) {
  var _super = {};
  my = my || {};

  // 
  // #### _private members_
  //
  my.terms = {};

  // 
  // #### _public methods_
  //
  var spawn;     /* spawn(cols, rows); */
  var term;      /* term(id); */
  var term_mode; /* term_mode(id); */
  var resize;    /* resize(id, cols, rows); */
  var write;     /* write(id, data); */

  //
  // #### _that_
  //
  var that = new events.EventEmitter();

  //
  // ### spawn
  // ```
  // @cols {number} initial cols number
  // @rows {number} initial rows number
  // ```
  // Spawns a `bash` shell within a new `pty`, pass it to a new `term` object
  // constructor and push that `term` on the list of terms.
  //
  spawn = function(cols, rows) {
    var pty = require('pty.js').spawn('bash', [], {
      name: 'xterm',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME,
      env: process.env
    });

    var term = require('./term.js').term({ 
      pty: pty,
      cols: cols || 80,
      rows: rows || 24
    });

    var id = uuid.v4();

    term.on('resize', function(cols, rows) {
      pty.resize(cols, rows);
    });
    term.on('refresh', function(dirty, slice, cursor) {
      that.emit('refresh', id, dirty, slice, cursor);
    });
    term.on('title', function(title) {
      that.emit('title', id, title);
    });

    my.terms[id] = term;
    that.emit('spawn', id, that.term(id));

    return id;
  };

  //
  // ### term
  // ```
  // @id   {string} the terminal id
  // ```
  // Dumps an object representation of the terminal designated by id or the
  // whole session if no index is specified
  //
  term = function(id) {
    if(typeof id === 'string' && my.terms[id]) {
      return {
        id: id,
        title: my.terms[id].title(),
        mode: my.terms[id].mode(),
        buffer: my.terms[id].buffer().slice(0), /* copy */
        cursor: my.terms[id].cursor()
      }
    }
    else if(typeof id === 'undefined') {
      var session = { terms: {} };
      for(id in my.terms) {
        session.terms[id] = term(id);
      }
      return session;
    }
  };

  //
  // ### term_mode
  // ```
  // @id   {string} the terminal id
  // ```
  // Returns the mode for the terminal designated by id. The mode is a bitwise
  // representation of the current terminal mode (see term.js)
  //
  term_mode = function(id) {
    if(typeof id === 'string' && my.terms[id]) {
      return my.terms[id].mode();
    }
  };

  //
  // ### resize
  // ```
  // @id   {string} the terminal id or null for all terminals
  // @cols {number} the number of cols
  // @rows {number} the number of rows
  // ```
  // Informs the session that the window size has changed. This will be 
  // forwarded to the underlying terminals.
  //
  resize = function(id, cols, rows) {
    if(id) {
      if(my.terms[id]) {
        my.terms[id].resize(cols, rows);
        that.emit('resize', id, cols, rows);
      }
    }
    else {
      for(id in my.terms) {
        resize(id, cols, rows);
      }
    }
  };

  //
  // ### write
  // ```
  // @id   {string} the terminal id or null for all terminals
  // @data {buffer} the data to write to the active term's underlying pty socket
  // ```
  // Writes received data into the current term.
  //
  write = function(id, data) {
    if(my.terms[id]) {
      my.terms[id].pty().write(data);
      that.emit('write', id, data);
    }
  };


  common.method(that, 'spawn', spawn, _super);
  common.method(that, 'term', term, _super);
  common.method(that, 'term_mode', term_mode, _super);
  common.method(that, 'resize', resize, _super);
  common.method(that, 'write', write, _super);

  return that;
};

exports.session = session;

