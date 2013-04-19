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
// ## CHAR_ATTRS
// Bitwise values for character attribute. Each glyph in the term is a tuple
// `[c, attr, fg_color, bg_color]`. Attributes are bitwise encoded by these
// values.
//
var CHAR_ATTRS = {
  NULL: 0,
  REVERSE: 1,
  UNDERLINE: 2,
  BOLD: 4,
  GFX: 8,
  ITALIC: 16,
  BLINK: 32
};

var CURSOR_STATE = { 
  DEFAULT: 0,
  WRAPNEXT: 1,
  ORIGIN: 2 /* ignored for now */
};
    
var TERM_MODE {
  WRAP: 1,
  INSERT: 2,
  APPKEYPAD: 4,
  ALTSCREEN: 8,
  CRLF: 16,
  MOUSEBTN: 32,
  MOUSEMOTION: 64,
  MOUSE: 32|64,
  REVERSE: 128,
  KBDLOCK: 256,
  HIDE: 512,
  ECHO: 1024,
  APPCURSOR: 2048,
  MOUSESGR: 4096,
};
    

// 
// ## Term
//
// Represents the state of an emulated temrinal
//
// The `term` object is in charge of emulating the data received from the *tty*
// and compute the current state of the terminal (with help of vt.js)
//
// It also keeps track of the entire scrollback history composed of lines of
// glyphs. 
//
// Glyphs are tuples of the type: `[[CHAR_ATTR, fg_color, bg_color], char]`
//
// ```
// @param spec { pty }
// ```
// 
var term = function(spec, my) {
  var _super = {};
  my = my || {};

  //
  // #### _private members_
  //
  my.geometry = [0, 0];  /* [cols, rows] */
  my.pty = spec.pty;
  my.vt = require('../vt/vt.js').vt({});

  my.mode = TERM_MODE.WRAP;
  my.cursor = {
    mode: CHAR_ATTRS.NULL,
    fg: '',
    gb: '',
    x: 0,
    y: 0,
    state: CURSOR_STATE.DEFAULT
  };
  my.tabs = {};
  my.buffer = [];
  my.base = 0;
  my.dirty = [];

  my.saved_cursor = null;

  // 
  // #### _public methods_
  //
  var resize;      /* resize(cols, rows); */
  var write;       /* write(data); */

  //
  // #### _private methods_
  //
  var is_set;         /* is_set(mode); */
  var glyph;          /* glyph(char); */
  var reset;          /* reset(); */
  var move_to;        /* move_to(x,y); */
  var setup_stops;    /* setup_stops(); */
  var next_stop;      /* next_stop(); */
  var prev_stop;      /* prev_stop(); */
  var dirty;          /* dirty(y); */

  var blank_line;     /* blank_line(); */
  var put_char;       /* put_char(c); */
  
  //
  // _that_
  //
  var that = new events.EventEmitter();

  /****************************************************************************/
  /*                          PRIVATE FUNCTIONS                               */
  /****************************************************************************/

  //
  // ### is_set
  // ```
  // @mode {number} checks if the `mode` is currently set
  // ```
  // Helper function to check if a mode is set (bitwise operations)
  //
  is_set = function(mode) {
    return ((my.mode & mode) != 0);
  };

  //
  // ### glyph
  // ```
  // @char {string} character to build the glyph from [optional, default: ' ']
  // @mode {number} override char attribute   [optional]
  // @fg   {string} override foreground color [optional]
  // @bg   {string} override background color [optional]
  // ```
  // Builds a new glyph with the current cursor character attributes
  //
  glyph = function(char, mode, fb, bg) {
    return [
      [
        mode || my.cursor.mode, 
        fb || my.cursor.fg, 
        bg || my.cursor.bg
      ], 
      char || ' '
    ];
  };

  //
  // ### reset
  // Resets the terminal
  //
  reset = function() {
    my.mode = TERM_MODE.WRAP;
    my.cursor = {
      attr: CHAR_ATTRS.NULL,
      fg: 'rgb(255, 255, 255)',
      gb: 'rgb(0, 0, 0)',
      x: 0,
      y: 0,
      state: CURSOR_STATE.DEFAULT
    };
    my.tabs = {};
    my.buffer = [];
    my.base = 0;
    my.dirty = [];

    setup_stops();
  };


  //
  // ### save_cursor
  // Saves the current cursor state
  //
  save_cursor = function() {
    my.saved_cursor = cursor;
  };

  //
  // ### restore_cursor
  // Restores the saved cursor
  //
  restore_cursor = function() {
    my.cursor = my.saved_cursor;
    move_to(my.cursor.x, my.cursor.y);
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
  // ### dirty
  // ```
  // @y {number} extend dirtiness to buffer line 
  // ```
  // Make the specified buffer line dirty
  //
  dirty = function(y) {
    if(my.dirty.length === 0) {
      my.dirty = [y, y];
    }
    else { 
      if(my.dirty[0] > y) my.dirty[0] = y;
      if(my.dirty[1] < y) my.dirty[1] = y;
    }
  };

  //
  // ### blank_line
  // Generates a blank new line to be appended to the lines array when a new 
  // line needs to be created
  //
  blank_line = function() {
    var g = glyph();
    var line = [];
    for(var i = 0; i < my.geometry[0]; i ++) {
      line[i] = g;
    }
    return line;
  };

  //
  // ### move_to
  // ```
  // @x {number} 
  // @y {number} 
  // ```
  // Moves to the specified position clamping it if necessary
  //
  move_to = function(x, y) {
    /* TODO: CURSOR_STATE.ORIGIN ignored for now */
    my.cursor.state &= ~CURSOR_STATE.WRAPNEXT;
    my.cursor.x = common.clamp(x, 0, my.geometry[0]);
    my.cursor.y = common.clamp(y, 0, my.geometry[1]);
  };

  //
  // ### new_line
  // ```
  // @first_col {boolean} moves to first column
  // ```
  // Moves one line down (and first_col if specified) and scrolls if needed.
  //
  new_line = function(first_col) {
    var y = my.cursor.y;
    if(my.cursor.y === my.buffer.length - my.base) {
      /* TODO: scroll */
    }
    else {
      y += 1;
    }
    move_to(first_col ? 0 : my.cursor.x, y);
  };

  //
  // ### put_char
  // ```
  // @c {string} charchter to put
  // ```
  // Puts a single char taking care of wrapping
  //
  put_char = function(c) {
    if(is_set(TERM_MODE.WRAP) && 
       (my.cursor.state & CURSOR_STATE.WRAPNEXT)) {
      new_line(true);
    }
    if(is_set(TERM_MODE.INSERT) && my.cursor.x + 1 < my.geometry[0]) {
      my.buffer[my.cursor.y].splice(my.cursor.x, 0, [glyph()]);
    }
    my.buffer[my.cursor.y][my.cursor.x] = glyph(c);
    if(my.cursor.x + 1 < my.geometry[0]) {
      move_to(my.cursor.x + 1, my.cursor.y);
    }
    else {
      my.cursor.state |= CURSOR_STATE.WRAPNEXT;
    }
    dirty(my.cursor.y);
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
  // ### initialize
  // Creates a `vt` instance and registers handlers and perform an initial
  // resize
  //
  init = function() {
    /* `pty` handlers */
    my.pty.on('buf', function(buf) {
      vt.read(buf);
    });

    /* `vt` handlers */
    vt.on('print', function() {});
    vt.on('fill', function() {});
    vt.on('send_string', function() {});

    vt.on('save_cursor', function() {});
    vt.on('restore_cursor', function() {});
    vt.on('reset_cursor', function() {});

    vt.on('clear_home', function() {});
    vt.on('clear', function() {});
    vt.on('reset', function() {});
    vt.on('soft_reset', function() {});

    vt.on('set_width', function() {});

    vt.on('ring_bell', function() {});
    vt.on('cursor_left', function() {});
    vt.on('cursor_down', function() {});
    vt.on('cursor_up', function() {});
    vt.on('cursor_right', function() {});
    vt.on('set_cursor_column', function() {});
    vt.on('set_cursor_position', function() {});
    vt.on('set_absolute_cursor_row', function() {});
    vt.on('report_cursor_position', function() {});

    vt.on('line_feed', function() {});
    vt.on('reverse_line_feed', function() {});
    vt.on('forward_tab_stop', function() {});
    vt.on('backward_tab_stop', function() {});
    vt.on('clear_tab_stop', function() {});
    vt.on('clear_all_tab_stops', function() {});
    vt.on('form_feed', function() {});
    vt.on('set_tab_stop_current', function() {});
    vt.on('copy_to_clipboard', function() {});
    vt.on('vt_scroll_up', function() {});
    vt.on('vt_scroll_down', function() {});

    vt.on('erase_below', function() {});
    vt.on('erase_above', function() {});
    vt.on('erase_to_right', function() {});
    vt.on('erase_to_left', function() {});
    vt.on('erase_line', function() {});
    vt.on('delete_lines', function() {});
    vt.on('delete_chars', function() {});
    vt.on('insert_space', function() {});
    vt.on('insert_lines', function() {});

    /* ANSI Modes */
    vt.on('set_insert_mode', function() {});
    vt.on('set_auto_carriage_return', function() {});
    /* DEC Modes */
    vt.on('set_application_cursor', function() {});
    vt.on('set_vt_scroll_region', function() {});
    vt.on('set_reverse_video', function() {});
    vt.on('set_origin_mode', function() {});
    vt.on('set_wrap_around', function() {});
    vt.on('set_cursor_blink', function() {});
    vt.on('set_cursor_visible', function() {});
    vt.on('set_allow_width_change', function() {});
    vt.on('set_reverse_wrap_around', function() {});
    vt.on('set_keyboard_backspace_sends_backspace', function() {});
    vt.on('set_scroll_on_output', function() {});
    vt.on('set_scroll_on_keystroke', function() {});
    vt.on('set_keyboard_meta_sends_escape', function() {});
    vt.on('set_keyboard_alt_sends_escape', function() {});
    vt.on('set_alternate_mode', function() {});

    vt.on('set_application_keypad', function() {});
    vt.on('set_window_title', function() {});

    /* Character Attributes */
    vt.on('char_attr_reset', function() {});
    vt.on('char_attr_report_color_palette', function() {});
    vt.on('char_attr_set_color_palette', function() {});
    vt.on('char_attr_set_bold', function() {});
    vt.on('char_attr_set_underline', function() {});
    vt.on('char_attr_set_blink', function() {});
    vt.on('char_attr_set_inverse', function() {});
    vt.on('char_attr_set_invisible', function() {});
    vt.on('char_attr_set_foreground_index', function() {});
    vt.on('char_attr_set_background_index', function() {});

    /* Finally resize to default size */
    resize(80, 24);
  }

  //
  // #### _initialization_
  //
  init();

  common.getter(that, 'pty', my, 'pty');

  return that;
};

exports.term = term;
