/*
 * mt: session.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130414 spolu    basic architecture and documentation
 */
var common = require('../common.js');
var util = require('util');
var events = require('events');
var factory = require('../factory.js').factory;
var pty = require('pty.js');

'use strict';

// 
// ## Session
//
// Represents an mt session
//
// The `session` object is in charge of keeping track of the opened term. It 
// also creates the ptys when spawning a new term. It exposes an API to receive 
// keyboard input (and redirect it to the active terminal). It also triggers 
// the resizing of the terminals when needed.
//
// There is only one open terminal at a time so a session really is a list of
// terminals. That's why it can keep track of the size in rows of cols of these
// terminals.
// ```
// @inherits {}
// @param spec {}
// ```
//
var session = function(spec, my) {
  var _super = {};
  my = my || {};

  // 
  // #### _private members_
  //
  my.terms = [];
  my.active = -1;
  my.cols = 80;
  my.rows = 24;

  // 
  // _public methods_
  //
  var resize;   /* resize(w, h); */
  var write;    /* write(data); */
  var spawn;    /* spawn(); */
  var focus;    /* focus(index); */

  var active;   /* active(); */

  var push;     /* push(line, rows); */

  //
  // #### _that_
  //
  var that = new events.EventEmitter();

  //
  // ### spawn
  // ```
  // @return {number} the new term index
  // ```
  // Spawns a `sh` shell within a new `pty`, pass it to a new `term` object
  // constructor and push that `term` on the list of terms.
  //
  spawn = function() {
    var pty = pty.spawn('sh', [], {
      name: 'xterm_color',
      cols: my.rows,
      rows: my.cols,
      cwd: process.env.HOME,
      env: process.env
    });

    var term = require('./vt.js').vt({ pty: pty });

    my.terms.push(term);

    return my.terms.length - 1;
  };

  //
  // ### resize
  // ```
  // @rows the number of rows
  // @cols the number of cols
  // ```
  // Informs the session that the window size has changed. This will be 
  // forwarded to the underlying terminals.
  resize = function(rows, cols) {
    my.terms.forEach(function(t) {
      t.resize(rows, cols);
    });
  };

  //
  // ### write
  // ```
  // @data the data to write to the active term's underlying pty socket
  // ```
  // Writes received data into the current term.
  //
  write = function(data) {
    var active = that.active();
    if(active)
      active.write(data);
  };

  //
  // ### show
  // ```
  // @index the `term` to focus on
  // ```
  // Focuses on the terminal at the provided index.
  //
  focus = function(index) {
  };

  //
  // ### active
  // ``` 
  // @return {term} the active term
  // ```
  // Returns the currently active terminal
  //
  active = function() {
    if(my.active >= 0 && my.term[my.active]) {
      return my.terms[my.active];
    }
  };

  //
  // ### push
  // ```
  // @line the first line of the zone to push
  // @rows the number of rows of the zone to push
  // ```
  // Pushes to the client the provided zone of the screen. If the zone is 
  // not specified then then whole screen is pushed
  //
  push = function(line, rows) {
  };

  //
  // #### _initialization_
  //
  my.terms.push(term({}));
  my.active = 0;

  common.method(that, 'resize', resize, _super);
  common.method(that, 'write', write, _super);

  common.method(that, 'focus', focus, _super);
  common.method(that, 'active', active, _super);

  return that;
};

exports.session = session;

