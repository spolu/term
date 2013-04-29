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
  ORIGIN: 2
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

  /* See `reset` for the initialization of the private variables relative */
  /* to the terminal state.                                               */

  my.saved_cursor = null;
  my.saved_screen = null;

  // 
  // #### _public methods_
  //
  var resize;      /* resize(cols, rows); */
  var init;        /* init(); */

  //
  // #### _private methods_
  //
  var IS_SET;         /* IS_SET(x, bit); */
  var SET;            /* SET(x, bit); */
  var UNSET;          /* UNSET(x, bit); */

  var glyph;          /* glyph(char); */
  var reset;          /* reset(); */
  var soft_reset;     /* soft_reset(); */
  var move_to;        /* move_to(x,y); */
  var setup_stops;    /* setup_stops(); */
  var next_stop;      /* next_stop(); */
  var prev_stop;      /* prev_stop(); */
  var dirty;          /* dirty(y); */
  var clear_region;   /* clear_region(x, y, cols, rows, char_value); */
  var delete_char;    /* delete_char(n); */
  var insert_char;    /* insert_char(n); */

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
  // ### IS_SET
  // ```
  // @ x  {number} variable
  // @bit {number} checks if the `bit` is currently set in `mode`
  // ```
  // Helper function to check if a mode bit is set (bitwise operations)
  //
  IS_SET = function(x, bit) {
    return ((x & bit) != 0);
  };

  //
  // ### SET
  // ```
  // @x   {number} mode variable
  // @bit {number} mode bit to set
  // ```
  // Helper function to set a mode bit (bitwise operations)
  //
  SET = function(x, bit) {
    x |= bit;
  };

  //
  // ### UNSET
  // ```
  // @x   {number} mode variable
  // @bit {number} mode bit to unset
  // ```
  // Helper function to unset a mode bit (bitwise operations)
  //
  UNSET = function(x, bit) {
    x &= ~bit;
  };

  //
  // ### glyph
  // ```
  // @char {string} character to build the glyph from [optional, default: ' ']
  // @attr {number} override char attribute [optional]
  // ```
  // Builds a new glyph with the current cursor character attributes
  //
  glyph = function(char, attr) {
    return [
      (typeof attr !== 'undefined') ? attr : my.cursor.attr,
      (typeof char !== 'undefined') ? char : ' '
    ];
  };

  //
  // ### reset
  // Resets the terminal
  //
  reset = function() {
    my.mode = TERM_MODE.WRAP;
    my.cursor = {
      attr: 256 | (257 << 9) | (CHAR_ATTRS.NULL << 18),
      x: 0,
      y: 0,
      state: CURSOR_STATE.DEFAULT
    };
    my.tabs = {};
    my.buffer = [];
    my.title = null;

    my.base = 0;
    my.top = 0;
    my.bottom = my.geometry[1] - 1;

    my.dirty = [];

    /* Resize to fill buffer & setup stops */
    resize(my.geometry[0], my.geometry[1]);
  };

  //
  // ### soft_reset
  // Soft resets the terminal
  //
  soft_reset = function() {
    my.mode = TERM_MODE.WRAP;
    /* Reset scroll region */
    my.top = 0;
    my.bottom = my.geometry[1] - 1;
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
  // ```
  // @pos {number} position from which to set tabs [optional]
  // ```
  // Setups tabs stop object given the current geometry. If `pos` is not defined
  // then tabs are reset entirely.
  //
  setup_stops = function(pos) {
    var i = 0;
    if(typeof pos !== 'number') {
      my.tabs = {};
    }
    else {
      i = prev_stops(Math.round(pos));
    }
    for(; i < my.geometry[0]; i += 8) {
      my.tabs[i] = true;
    }
  };
  

  //
  // ### prev_stop
  // ```
  // @x {number} position from which to jump [optional]
  // ```
  // Jumps to the previous tab_stops from x. If x is not specified then 
  // `my.cursor.x` is  used instead
  //
  prev_stop = function(x) {
    if(typeof x !== 'number') x = my.cursor.x;
    while(!my.tabs[--x] && x > 0);
    x = common.clamp(x, 0, my.geometry[0]-1);
    return x;
  };

  //
  // ### next_stop
  // ```
  // @x {number} position from which to jump [optional]
  // ```
  // Jumps to the next tab_stops from x. If x is not specified then 
  // `my.cursor.x` is used instead
  //
  next_stop = function(x) {
    if(typeof x !== 'number') x = my.cursor.x;
    while(!my.tabs[++x] && x < my.geometry[0]);
    x = common.clamp(x, 0, my.geometry[0]-1);
    return x;
  };

  //
  // ### dirty
  // ```
  // @y {number} extend dirtiness to buffer line 
  // ```
  // Make the specified buffer line dirty. We're in `buffer` line number 
  // referential (not visible screen).
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
  // ### scroll
  // ```
  // @n {number} number of lines to scroll
  // ```
  // Scrolls `n` lines. If `n>0`, it scrolls up, otherwise scrolls down. 
  // (`scroll(0)` has no effect)
  //
  scroll = function(n) {
    if(n >= 0) {
      for(var i = 0; i < n; i ++) {
        var row = ++my.base + my.bottom;
        my.buffer.splice(row, 0, blank_line());
      }
      /* TODO: handle my.top if needed              */
      /* if(my.top !== 0) {                         */
      /*   if(my.base > 0) my.base--;               */
      /*   my.buffer.splice(my.base + my.top, 1);   */
      /* }                                          */
    }
    else {
      var n = -n;
      for(var i = 0; i < n; i ++) {
        my.buffer.splice(my.base + my.bottom, 1);
        my.buffer.splice(my.base + my.top, 0, blank_line());
      }
    }
    dirty(my.base + my.top);
    dirty(my.base + my.bottom);
    /* TODO: selscroll? */
  };

  //
  // ### move_to
  // ```
  // @x        {number} cols position
  // @y        {number} rows position
  // @absolute {boolean} move with scroll region
  // ```
  // Moves to the specified position clamping it if necessary
  //
  move_to = function(x, y, absolute) {
    var miny = 0;
    var maxy = my.geometry[1] - 1;
    if(IS_SET(my.cursor.state, CURSOR_STATE.ORIGIN)) {
      miny = my.top;
      maxy = my.bottom;
      if(!absolute) y += my.top;
    }
    UNSET(my.cursor.state, CURSOR_STATE.WRAPNEXT);
    my.cursor.x = common.clamp(x, 0, my.geometry[0]);
    my.cursor.y = common.clamp(y, miny, maxy);
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
    if(my.cursor.y >= my.bottom) {
      scroll(1);
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
    if(IS_SET(my.mode, TERM_MODE.WRAP) && 
       (my.cursor.state & CURSOR_STATE.WRAPNEXT)) {
      new_line(true);
    }
    if(IS_SET(my.mode, TERM_MODE.INSERT) && 
       my.cursor.x + 1 < my.geometry[0]) {
      my.buffer[my.cursor.y].splice(my.cursor.x, 0, [glyph()]);
    }
    my.buffer[my.cursor.y][my.cursor.x] = glyph(c);
    if(my.cursor.x + 1 < my.geometry[0]) {
      move_to(my.cursor.x + 1, my.cursor.y);
    }
    else {
      SET(my.cursor.state, CURSOR_STATE.WRAPNEXT);
    }
    dirty(my.cursor.y);
  };

  //
  // ### clear_region
  // ```
  // @x {number} cols origin of region to clear [optional]
  // @y {number} rows origin of region to clear [optional]
  // @cols {number} number of columns to clear [optional]
  // @rows {number} number of rows to clear [optional]
  // @char_value {string} default char value to clear with [optional]
  // ```
  // Clears the region by resetting all glyphes to `char_value` if defined. It
  // clears the screen region independently of scroll region. If no parameter is
  // specified, it clears the entire screen;
  //
  clear_region = function(x, y, cols. rows, char_value) {
    x = (typeof x !== 'undefined') ? x : 0;
    y = (typeof y !== 'undefined') ? y : 0;
    x = common.clamp(x, 0, my.geomtry[0] - 1);
    y = common.clamp(y, 0, my.geomtry[1] - 1);

    cols = (typeof cols !== 'undefined') ? cols : my.geometry[0];
    rows = (typeof rows !== 'undefined') ? rows : my.geometry[1];
    x_end = common.clamp(x + cols, 0, my.geometry[0]);
    y_end = common.clamp(y + rows, 0, my.geometry[1]);

    for(var j = my.base + y; j < my.base + y_end; j ++) {
      for(var i = x; i < x_end; i ++) {
        my.buffer[j][i] = glyph(char_value);
      }
    }

    dirty(my.base + y);
    dirty(my.base + y_end);
  };

  //
  // ### delete_chars
  // ```
  // @n {number} number of characters to remove on the right
  // ```
  // Deletes `n` characters on the right sliding the whole line
  //
  delete_chars = function(n) {
    while(n--) {
      my.buffer[my.base + my.cursor.y].splice(my.cursor.x, 1);
      my.buffer[my.base + my.cursor.y].push(glyph());
    }
    dirty(my.base + my.cursor.y);
  };

  //
  // ### insert_chars
  // ```
  // @n {number} number of blank chars to insert
  // ```
  // Inserts `n` blank characters after the cursor. It clamps the insertion to
  // the current buffer geometry.
  //
  insert_chars = function(n) {
    var x = my.cursor.x
    while(n-- && x < my.geometry[0]) {
      my.buffer[my.base + my.cursor.y].splice(x++, 0, glyph());
      my.buffer[my.base + my.cursor.y].pop();
    }
    dirty(my.base + my.cursor.y);
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
  resize = function(cols, rows, silent) {
    if(cols < 1) cols = 1;
    if(rows < 1) rows = 1;

    var old = my.geometry;
    my.geometry = [Math.round(cols), Math.round(rows)];

    /* Resize rows */
    var len = this.buffer.length;
    while(len--) {
      if(my.geometry[0] >= old[0]) {
        while(my.buffer[i].length < my.geometry[0]) {
          my.buffer[i] = glyph();
        }
      }
      else {
        while(my.buffer[i].length > my.geometry[0]) {
          my.buffer[i].pop();
        }
      }
    }

    /* setup stops */
    setup_stops(old[0]);

    /* Resize Rows */
    while(my.buffer.length < my.geometry[1] + my.base) {
      my.buffer.push(blank_line());
    }
    while(my.buffer.length > my.geometry[1] + my.base) {
      my.buffer.pop();
    }
    
    /* Clamp cursor */
    move_to(my.cursor.x, my.cursor.y);
    /* Reset scroll region */
    my.top = 0;
    my.bottom = my.geometry[1] - 1;
    /* Set scoll region as dirty */
    dirty(my.base + my.top);
    dirty(my.base + my.bottom);

    if(!silent)
      that.emit('resize', my.geometry[0], my.geometry[1]);
  };


  //
  // ### initialize
  // Creates a `vt` instance and registers handlers and perform an initial
  // resize
  //
  init = function() {
    /**************************************************************************/
    /*                            DATA TRANSFER                               */
    /**************************************************************************/
    my.pty.on('buf', function(buf) {
      vt.read(buf);
    });
    vt.on('print', function(str) {
      /* Supposed to be of length 1 */
      for(var i = 0; i < str.length; i ++) {
        put_char(str[i]);
      }
    });
    vt.on('write', function(data) {
      my.pty.write(data);
    });

    /**************************************************************************/
    /*                           CURSOR STORAGE                               */
    /**************************************************************************/
    vt.on('save_cursor', function() {
      save_cursor();
    });
    vt.on('restore_cursor', function() {
      restore_cursor();
    });

    /**************************************************************************/
    /*                          BUFFER MANAGEMENT                             */
    /**************************************************************************/
    vt.on('clear_home', function() {
      clear_region();
      move_to(0, 0);
    });
    vt.on('clear', function() {
      clear_region();
    });

    vt.on('reset', function() {
      reset();
    });
    vt.on('soft_reset', function() {
      soft_reset();
    });

    vt.on('resize', function(cols, rows) {
      resize(cols || my.geometry[0], rows || my.geometry[1]);
    });
    vt.on('fill', function(char_value) {
      clear_region(0, 0, my.geometry[0], my.geometry[1], char_value);
    });

    /**************************************************************************/
    /*                           CURSOR MOVEMENT                              */
    /**************************************************************************/
    vt.on('ring_bell', function() {
      /* TODO */
    });
    vt.on('cursor_left', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      move_to(my.cursor.x - n, my.cursor.y);
    });
    vt.on('cursor_down', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      move_to(my.cursor.x, my.cursor.y + n);
    });
    vt.on('cursor_up', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      move_to(my.cursor.x, my.cursor.y - n);
    });
    vt.on('cursor_right', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      move_to(my.cursor.x + n, my.cursor.y);
    });
    vt.on('set_cursor_column', function(x) {
      /* Absolute */
      move_to(x, my.cursor.y, true);
    });
    vt.on('set_cursor_row', function(y) {
      /* Absolute */
      move_to(my.cursor.x, y, true);
    });
    vt.on('set_cursor_position', function(x, y) {
      /* absolute move (take into account scroll region) */
      move_to(x, y, true);
    });

    vt.on('report_cursor_position', function() {
      var row = my.cursor.x + 1;
      var col = my.cursor.y + 1;
      my.pty.write('\x1b[' + row + ';' + col + 'R');
    });

    /**************************************************************************/
    /*                             LINE & TABS                                */
    /**************************************************************************/
    vt.on('line_feed', function() {
      new_line();
    });
    vt.on('reverse_line_feed', function() {
      if(my.cursor.y === my.top)
        scroll(-1);
      else
        move_to(my.cursor.x, my.cursor.y - 1);
    });
    vt.on('form_feed', function() {
      new_line(IS_SET(my.mode, TERM_MODE.CRLF));
    });

    vt.on('forward_tab_stop', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      while(n--)
        my.cursor.x = next_stop();
    });
    vt.on('backward_tab_stop', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      while(n--)
        my.cursor.x = prev_stop();
    });
    vt.on('clear_tab_stop', function() {
      delete my.tabs[my.cursor.x];
    });
    vt.on('clear_all_tab_stops', function() {
      my.tabs = {};
    });
    vt.on('set_tab_stop_current', function() {
      my.tabs[my.cursor.x] = true;
    });

    /**************************************************************************/
    /*                              CLIPBOARD                                 */
    /**************************************************************************/
    vt.on('copy_to_clipboard', function() {
      /* TODO: ignore for now */
    });

    /**************************************************************************/
    /*                               SCROLL                                   */
    /**************************************************************************/
    vt.on('scroll_up', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      scroll(n);
    });
    vt.on('scroll_down', function(n) {
      n = (typeof n !== 'undefined' ) ? n : 1;
      scroll(-n);
    });

    /**************************************************************************/
    /*                              DELETION                                  */
    /**************************************************************************/
    vt.on('erase_below', function() {
      clear_region(my.cursor.x, my.cursor.y, my.geometry[0] - my.cursor.x, 1);
      if(my.cursor.y + 1 >= my.geometry[1]) return;
      clear_region(0, my.cursor.y + 1, 
                   my.geometry[0], my.geometry[1] - (my.cursor.y + 1));
    });
    vt.on('erase_above', function() {
      clear_region(0, my.cursor.y, my.cursor.x, 1);
      if(my.cursor.y - 1 <= 0) return;
      clear_region(0, 0, my.geometry[0], my.cursor.y - 1);
    });
    vt.on('erase_right', function(n) {
      n = (typeof n !== 'undefined') 
                   ? n : my.geometry[0] - my.cursor.x;
      clear_region(my.cursor.x, my.cursor.y, n, 1);
    });
    vt.on('erase_left', function() {
      clear_region(0, my.cursor.y, my.cursor.x, 1);
    });
    vt.on('erase_line', function() {
      clear_region(0, my.cursor.y, my.geometry[0], 1);
    });
    vt.on('delete_lines', function(n) {
      n = (typeof n !== 'undefined') ? n : 1;
      if(my.cursor.y < my.top || my.cursor.y > my.bottom)
        return;
      scroll(n);
    });
    vt.on('insert_lines', function(n) {
      n = (typeof n !== 'undefined') ? n : 1;
      if(my.cursor.y < my.top || my.cursor.y > my.bottom)
        return;
      scroll(-n);
    });
    vt.on('delete_chars', function(n) {
      n = (typeof n !== 'undefined') ? n : 1;
      delete_chars(n);
    });
    vt.on('insert_chars', function() {
      n = (typeof n !== 'undefined') ? n : 1;
      insert_chars(n);
    });

    /**************************************************************************/
    /*                             ANSI MODES                                 */
    /**************************************************************************/
    vt.on('set_insert_mode', function(state) {
      if(state) SET(my.mode, TERM_MODE.INSERT);
      else UNSET(my.mode, TERM_MODE.INSERT);
    });
    vt.on('set_auto_carriage_return', function() {
      if(state) SET(my.mode, TERM_MODE.CRLF);
      else UNSET(my.mode, TERM_MODE.CRLF);
    });

    /**************************************************************************/
    /*                             DEC MODES                                  */
    /**************************************************************************/
    vt.on('set_application_cursor', function() {
      if(state) SET(my.mode, TERM_MODE.APPCURSOR);
      else UNSET(my.mode, TERM_MODE.APPCURSOR);
      /* TODO: handle */
    });
    vt.on('set_scroll_region', function(top, bottom) {
      if(top) my.top = common.clamp(0, term.geometry[1] - 1);
      if(bottom) my.bottom = common.clamp(0, term.geometry[1] - 1);
    });
    vt.on('set_reverse_video', function(state) {
      var m = my.mode;
      if(state) SET(m, TERM_MODE.REVERSE);
      else UNSET(m, TERM_MODE.REVERSE);
      if(m !== my.mode) {
        my.mode = m;
        /* TODO: handle */
      }
    });
    vt.on('set_origin_mode', function(state) {
      if(state) SET(my.cursor.state, CURSOR_STATE.ORIGIN);
      else UNSET(my.cursor.state, CURSOR_STATE.ORIGIN);
    });
    vt.on('set_wrap_around', function(state) {
      if(state) SET(my.mode, TERM_MODE.WRAP);
      else UNSET(my.mode, TERM_MODE.WRAP);
    });
    vt.on('set_cursor_blink', function(state) {
      /* TODO: ignore for now */
    });
    vt.on('set_cursor_visible', function(state) {
      if(state) UNSET(my.mode, TERM_MODE.HIDE);
      else SET(my.mode, TERM_MODE.HIDE);
        /* TODO: handle */
    });
    vt.on('set_allow_width_change', function() {
      /* TODO: ignore for now */
    });
    vt.on('set_reverse_wrap_around', function() {
      /* TODO: ignore for now */
    });
    vt.on('set_keyboard_backspace_sends_backspace', function() {
      /* TODO: ignore for now */
    });
    vt.on('set_scroll_on_output', function() {
      /* TODO: ignore for now */
    });
    vt.on('set_scroll_on_keystroke', function() {
      /* TODO: ignore for now */
    });
    vt.on('set_keyboard_meta_sends_escape', function() {
      /* TODO: ignore for now */
    });
    vt.on('set_keyboard_alt_sends_escape', function() {
      /* TODO: ignore for now */
    });
    vt.on('set_alternate_mode', function(alt) {
      if(alt) {
        my.saved_screen = {
          mode: my.mode,
          buffer: my.buffer,
          ybase: my.ybase,
          cursor: my.cursor,
          bottom: my.bottom,
          top: my.top,
          tabs: my.tabs
        }
        reset();
        SET(my.mode, TERM_MODE.ALTSCREEN);
      }
      else {
        if(my.saved_screen) {
          my.mode = my.saved_screen.mode;
          my.buffer = my.saved_screen.buffer;
          my.ybase = my.saved_screen.ybase;
          my.cursor = my.saved_screen.cursor;
          my.bottom = my.saved_screen.bottom;
          my.top = my.saved_screen.top;
          my.tabs = my.saved_screen.tabs;
          dirty(0);
          dirty(my.buffer.length);
        }
        UNSET(my.mode, TERM_MODE.ALTSCREEN);
      }
    });

    vt.on('set_application_keypad', function() {
      if(state) SET(my.mode, TERM_MODE.APPKEYPAD);
      else UNSET(my.mode, TERM_MODE.APPKEYPAD);
      /* TODO: handle */
    });
    vt.on('set_window_title', function(title) {
      my.title = title;
      /* TODO: handle */
    });

    /**************************************************************************/
    /*                          CHARACTER ATTRS                               */
    /**************************************************************************/
    vt.on('char_attr_reset', function() {
      my.cursor.attr = 256 | (257 << 9) | (CHAR_ATTRS.NULL << 18);
    });
    vt.on('char_attr_set_bold', function(state) {
      if(state) SET(my.cursor.attr, CHAR_ATTRS.BOLD << 18);
      else UNSET(my.cursor.attr, CHAR_ATTRS.BOLD << 18);
    });
    vt.on('char_attr_set_italic', function(state) {
      if(state) SET(my.cursor.attr, CHAR_ATTRS.ITALIC << 18);
      else UNSET(my.cursor.attr, CHAR_ATTRS.ITALIC << 18);
    });
    vt.on('char_attr_set_underline', function(state) {
      if(state) SET(my.cursor.attr, CHAR_ATTRS.UNDERLINE << 18);
      else UNSET(my.cursor.attr, CHAR_ATTRS.UNDERLINE << 18);
    });
    vt.on('char_attr_set_blink', function(state) {
      if(state) SET(my.cursor.attr, CHAR_ATTRS.BLINK << 18);
      else UNSET(my.cursor.attr, CHAR_ATTRS.BLINK << 18);
    });
    vt.on('char_attr_set_reverse', function(state) {
      if(state) SET(my.cursor.attr, CHAR_ATTRS.REVERSE << 18);
      else UNSET(my.cursor.attr, CHAR_ATTRS.REVERSE << 18);
    });
    vt.on('char_attr_set_invisible', function(state) {
      /* TODO: ignore for now */
    });

    vt.on('char_attr_set_foreground_index', function(idx) {
      if(idx) {
        UNSET(my.cursor.attr, 0x11f << 9);
        SET(my.cursor.attr, idx << 9)
      }
      else {
        UNSET(my.cursor.attr, 0x11f << 9);
        SET(my.cursor.attr, 0 << 9); /* NOOP */
      }
    });
    vt.on('char_attr_set_background_index', function(idx) {
      if(idx) {
        UNSET(my.cursor.attr, 0x11f);
        SET(my.cursor.attr, idx)
      }
      else {
        UNSET(my.cursor.attr, 0x11f);
        SET(my.cursor.attr, 256);
      }
    });

    /* Finally resize to default size */
    resize(80, 24, true);
  };

  //
  // #### _initialization_
  //
  init();

  common.getter(that, 'pty', my, 'pty');

  return that;
};

exports.term = term;

