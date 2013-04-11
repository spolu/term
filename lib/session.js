/**
 * ntty: session.js
 * Copyright (c) 2013, Stanislas Polu (MIT License)
 */
var fwk = require('fwk');
var events = require('events');
var util = require('util');
var factory = require('../factory.js').factory;
var pty = require('pty.js');

// Session
// -------
// @class represents the ntty session
//
// The `session` object is in charge of keeping track of the opened ptys.
// It exposes an API to receive keyboard input (and redirect it to the 
// active pty) and update the size of the display (and trigger resize
// on all ptys)
//
// @param spec {}
//
var session = function(spec, my) {
  var _super = {};
  my = my || {};

  // Private members
  my.ptys = [];
  my.active = -1;
  my.cols = 80;
  my.rows = 24;

  // Public methods.
  var resize;   /* resize(w, h); */
  var write;    /* write(data); */

  var focus;    /* show(index); */
  var active;   /* active(); */
  var push;     /* push(); */

  var that = new events.EventEmitter();

  // #### spawn
  // Spawns a `sh` shell within a new `pty` and push it to
  // the list of active ptys
  spawn = function() {
    var pty = pty.spawn('sh', [], {
      name: 'xterm_color',
      cols: my.rows,
      rows: my.cols,
      cwd: process.env.HOME,
      env: process.env
    });

    pty.on('data', function() {});

    my.ptys.push(pty);
  };

  // #### resize
  // Informs the session that the window size has changed. This will
  // be forwarded to the underlying terminals.
  // @param rows the number of rows
  // @param cols the number of cols
  resize = function(rows, cols) {
    my.ptys.forEach(function(pty) {
      pty.resize(rows, cols);
    });
  };

  // #### write
  // Writes a data received from the UI into the current term.
  // @param data the data to write to the active term's underlying pty socket
  write = function(data) {
    var active = that.active();
    if(active)
      active.write(buf);
  };

  // #### show
  // Focuses on the terminal at the provided index.
  // @param index the `term` to focus on
  focus = function(index) {
  };

  // #### active
  // @return the active term
  active = function() {
    if(my.active >= 0 && my.term[my.active]) {
      return my.terms[my.active];
    }
  };

  // #### push
  // Pushes to the client the provided zone of the screen. If the zone is 
  // not specified then then whole screen is pushed
  // @param line the first line of the zone to push
  // @param rows the number of rows of the zone to push
  push = function(line, rows) {
  };

  my.terms.push(term({}));
  my.active = 0;

  fwk.method(that, 'resize', resize, _super);
  fwk.method(that, 'write', write, _super);

  fwk.method(that, 'focus', focus, _super);
  fwk.method(that, 'active', active, _super);

  return that;
};

exports.session = session;
