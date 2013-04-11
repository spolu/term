/*
 * ntty: term.js
 * Copyright (c) 2013, Stanislas Polu. All rights reserved. (MIT License)
 */
var fwk = require('fwk');
var events = require('events');
var util = require('util');
var pty = require('pty.js');
var factory = require('../factory.js').factory;

// Term
// ----
// @class represents the current state of an emulated temrinal
//
// The `term` object is in charge of emulating the data received
// from the **tty** and compute the current state of the terminal
//
// It also keeps track of its history
//
// @param spec {}
// 
var term = function(spec, my) {
  var _super = {};
  my = my || {};

  // #### Private members
  my.geometry = [0, 0];
  my.lines = [];
  my.width = my.rows;
  my.height = my.height;

  // Term Status
  my.x = 0;
  my.y = 0;
  my.dirty = [0, 0];
  my.def_attr = (257 << 9) | 256;
  my.cur_attr = my.def_attr;
  my.tabs = {};
  my.esc_params = [];
  my.cur_param = 0;

  // Term Behaviour
  my.convert_lf_to_clrf = false;

  // Term States

  // #### Public methods.
  var resize;      /* resize(cols, rows); */
  var write;       /* write(data); */

  // #### Private methods.
  var blank_line;     /* blank_line(); */
  var setup_stops;    /* setup_stops(); */
  var next_stop;      /* next_stop(); */
  var prev_stop;      /* prev_stop(); */
  var extend_dirty;   /* extend_dirty(y); */
  
  var that = new events.EventEmitter();

  /****************************************************************************************/
  /*                                PRIVATE FUNCTIONS                                     */
  /****************************************************************************************/

  // #### blank_line [private]
  // Generates a blank new line to be appended to the lines array
  // when a new line needs to be created
  blank_line = function() {
    var ch = [my.def_attr, ' '];
    var line = [];
    for(var i = 0; i < my.geometry[0]; i ++) {
      line[i] = ch;
    }
    return line;
  };

  // #### setup_stops [private]
  // Setups tabs stop object given the current geometry
  setup_stops = function() {
    /* not supposed to have any stop yet */
    var i = prev_stops(my.geometry[0]);
    for(; i < my.geometry[0]; i += 8) {
      my.tabs[i] = true;
    }
  };

  // #### next_stop [private]
  // Jumps to the next tab_stops from x. If x is not specified then
  // `my.x` is used instead
  prev_stop = function(x) {
    if(typeof x !== 'number') x = my.x;
    if(x > my.geometry[0]) x = my.geometry[0];
    if(x < 0) x = 0;
    while(!my.tabs[--x] && x > 0);
    return x;
  };

  // #### prev_stop [private]
  // Jumps to the previous tab_stops from x. If x is not specified then
  // `my.x` is used instead
  next_stop = function(x) {
    if(typeof x !== 'number') x = my.x;
    if(x > my.geometry[0]) x = my.geometry[0];
    if(x < 0) x = 0;
    while(!my.tabs[++x] && x < my.geometry[0]);
    return x;
  };

  // #### extend_dirty [private]
  // Extend dirty lines to the specified line
  extend_line = function(y) {
    if(y < my.dirty[0]) my.dirty[0] = y;
    if(y > my.dirty[1]) my.dirty[1] = y;
  };

  /****************************************************************************************/
  /*                                 PUBLIC METHODS                                       */
  /****************************************************************************************/

  // #### resize [public]
  // Resizes the current term emulator. This basically updates the 
  // `cols` and `rows private members
  resize = function(cols, rows) {
    var old_geometry = my.geometry;
    my.geometry = [cols, rows];

    setup_stops(old_geometry[0]);
    /* TODO: update lines */
    that.emit('resize', my.geometry);
  };
  
  // #### write [public]
  // Handles incoming data and updates the local lines array
  // @param data incoming buffer
  // 
  // Originally forked from:
  // Christopher Jeffrey's tty.s [https://github.com/chjj/tty.js]
  // Copyright (c) 2012-2013, Christopher Jeffrey
  write = function(data) {
    my.dirty = [my.y, my.y];
    var STATE = {
      MORMAL: 0,
      STATE_ESCAPED: 1,
      STATE_CSI: 2,
      STATE_OSC: 3,
      STATE_CHARSET: 4,
      STATE_DCS: 5,
      STATE_IGNORE: 6
    };
    var state = STATE.NORMAL;

    for(var i = 0; i < data.length; i++) {
      var ch = data[i];
      switch(state) {
        // STATE_NORMAL
        case STATE.NORMAL: {
          switch(ch) {
            // `\a`
            case '\x07': { 
              this.bell();
              break;
            }
            // `\n`, `\v`, `\f`
            case '\n':
            case '\x0b':
            case '\x0c': {
              if (this.convert_lf_to_crlf) {
                my.x = 0;
              }
              my.y++;
              if(!my.lines[my.y]) {
                my.lines.push(blank_line());
                /* TODO: add assert */
              }
              break;
            }
            // `\r`
            case '\r': {
              my.x = 0;
              break;
            }
            // `\b`
            case '\x08': {
              if (my.x > 0) {
                my.x--;
              }
              break;
            }
            // `\t`
            case '\t': {
              my.x = this.nextStop();
              break;
            }
            // `\e`
            case '\x1b': {
              state = STATE.ESCAPED;
              break;
            }
            // Any other character
            default: {
              if(ch >= ' ') {
                if(my.x >= my.geometry[0]) {
                  my.x = 0;
                  my.y++;
                  if(!my.lines[my.y]) {
                    my.lines.push(blank_line());
                    /* TODO: add assert */
                  }
                }
                my.lines[my.y][my.x] = [my.cur_attr, ch];
                extend_dirty(my.y);
              }
              break;
            }
          };
          break;
        }
        // STATE_ESCAPED
        case STATE.ESCAPED: {
          switch(ch) {
            // ESC [ Constrol Sequence Introducer
            case '[': {
              my.esc_params = [];
              my.cur_param = 0;
              state = STATE.CSI;
              break;
            }
            // ESC ] Operating System Command
            case '[': {
              my.esc_params = [];
              my.cur_param = 0;
              state = STATE.OSC;
              break;
            }
            // ESC P Device Control String
            case '[': {
              my.esc_params = [];
              my.cur_param = 0;
              state = STATE.DCS;
              break;
            }
            // ESC _ Application Program Command
            case '_':
            // ESC ^ Privacy Message
            case '^': {
              state = STATE.IGNORE;
              break;
            }
            // ESC c Full Reset
            case 'c': {
              /* TODO: reset() */
              break;
            }
            // ESC E Next Line
            case 'E': {
              my.x = 0;
              /* TODO: index(); */
              break;
            }
            // ESC D Index
            case 'D': {
              /* TODO: index(); */
              break;
            }
            // ESC M Reverse Index
            case 'M': {
              /* TODO: reverse_index(); */
              break;
            }
            // ESC 7 Save Cursor
            case '7': {
              /* TODO: save_cursor(); */
              state = STATE.NORMAL;
              break;
            }
            // ESC 8 Restore Cursor
            case '8': {
              /* TODO: restore_cusror(); */
              state = STATE.NORMAL;
              break;
            }
            // ESC # 3 DEC line height/width
            case '#': {
              state = STATE.NORMAL;
              i++;
              break;
            }
            // ESC H Tab Set (HTS is 0x88).
            case 'H': {
              /* TODO: tab_set(); */
              break;
            }
            default: {
              state = STATE.NORMAL;
              throw new Error('Unknown ESC control: ' + ch);
              break;
            }
          }
          break;
        }
        case STATE.OSC: {
          break;
        }
        case STATE.CSI: {
          break;
        }
        case STATE.DSC: {
          break;
        }
        case STATE.IGNORE: {
          // For PM and APC.
          if (ch === '\x1b' || ch === '\x07') {
            if (ch === '\x1b') i++;
            this.state = normal;
          }
          break;
        }
      } 
    }
    console.log(data);
  };

  // As part of the initialization we generate a first resize
  // to the initial `rows` and `cols` values `80x24`
  resize(80, 24);

  return that;
};

exports.term = term;
