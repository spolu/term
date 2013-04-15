/*
 * mt: term.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130415 spolu    comments and basic architecture
 */
var common = require('common');
var events = require('events');
var util = require('util');
var pty = require('pty.js');
var factory = require('../factory.js').factory;

// 
// ## Term
//
// Represents the state of an emulated temrinal
//
// The `term` object is in charge of emulating the data received from the *tty*
// and compute the current state of the terminal (with help of vt.js)
//
// It also keeps track of its history 
// ```
// @param spec {}
// ```
// 
var term = function(spec, my) {
  var _super = {};
  my = my || {};

  //
  // #### _private members_
  //
  my.geometry = [0, 0];
  my.lines = [];

  my.x = 0;
  my.y = 0;
  my.dirty = [0, 0];
  my.tabs = {};

  my.convert_lf_to_clrf = false;


  // 
  // #### _public methods_
  //
  var resize;      /* resize(cols, rows); */
  var write;       /* write(data); */

  //
  // #### _private methods_
  //
  var blank_line;     /* blank_line(); */
  var setup_stops;    /* setup_stops(); */
  var next_stop;      /* next_stop(); */
  var prev_stop;      /* prev_stop(); */
  var extend_dirty;   /* extend_dirty(y); */
  
  //
  // _that_
  //
  var that = new events.EventEmitter();

  /****************************************************************************/
  /*                          PRIVATE FUNCTIONS                               */
  /****************************************************************************/

  //
  // ### blank_line
  // Generates a blank new line to be appended to the lines array when a new 
  // line needs to be created
  //
  blank_line = function() {
    var ch = [my.def_attr, ' '];
    var line = [];
    for(var i = 0; i < my.geometry[0]; i ++) {
      line[i] = ch;
    }
    return line;
  };

  //
  // ### setup_stops
  // Setups tabs stop object given the current geometry
  //
  setup_stops = function() {
    /* not supposed to have any stop yet */
    var i = prev_stops(my.geometry[0]);
    for(; i < my.geometry[0]; i += 8) {
      my.tabs[i] = true;
    }
  };

  //
  // ### prev_stop
  // ```
  // @x {number} position from which to jump [optional]
  // ```
  // Jumps to the previous tab_stops from x. If x is not specified then `my.x` 
  // is  used instead
  //
  prev_stop = function(x) {
    if(typeof x !== 'number') x = my.x;
    if(x > my.geometry[0]) x = my.geometry[0];
    if(x < 0) x = 0;
    while(!my.tabs[--x] && x > 0);
    return x;
  };

  //
  // ### next_stop
  // ```
  // @x {number} position from which to jump [optional]
  // ```
  // Jumps to the next tab_stops from x. If x is not specified then `my.x` is  
  // used instead
  //
  next_stop = function(x) {
    if(typeof x !== 'number') x = my.x;
    if(x > my.geometry[0]) x = my.geometry[0];
    if(x < 0) x = 0;
    while(!my.tabs[++x] && x < my.geometry[0]);
    return x;
  };

  //
  // ### extend_dirty
  // ```
  // @y line to which dirtiness should be extended
  // ```
  // Extend dirty lines to the specified line
  //
  extend_dirty = function(y) {
    if(y < my.dirty[0]) my.dirty[0] = y;
    if(y > my.dirty[1]) my.dirty[1] = y;
  };

  /****************************************************************************/
  /*                           PUBLIC METHODS                                 */
  /****************************************************************************/

  //
  // ### resize
  // ```
  // @cols {number} number of cols for the new geometry
  // @rows {number} number of rows for the new geometry
  // ```
  // Resizes the current term emulator. This basically updates the `cols` and 
  // `rows private members
  //
  resize = function(cols, rows) {
    var old_geometry = my.geometry;
    my.geometry = [cols, rows];

    setup_stops(old_geometry[0]);
    /* TODO: update lines */
    that.emit('resize', my.geometry);
  };
  

  //
  // #### _initialization_
  //
  resize(80, 24);

  return that;
};

exports.term = term;
