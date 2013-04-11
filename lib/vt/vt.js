/**
 * mt: vt.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 */
var fwk = require('fwk');
var events = require('events');
var util = require('util');
var factory = require('../factory.js').factory;

'use strict';

// PARSE_STATE
// ---
// Helper class to represent the parser state
//
// ```
// @spec {object} { def_fun }
// ```
// 
var parse_state = function(spec, my) {
  var _super = {};
  my = my || {};

  // #### Private members
  //
  my.def_fun = spec.def_fun
  my.buf = null;
  my.pos = 0;
  my.fun = my.def_fun;
  my.args = [];

  // #### Public methods
  //
  var reset_fun;   /* reset_fun(); */
  var reset_buf;   /* reset_buf([buf]); */
  var reset_args   /* reset_args(); */
  var reset;       /* reset([buf]); */
  var int_arg;     /* int_arg(pos, [def_value]); */
  var advance;     /* advance(count); */
  var peek_buf;    /* peek_buf(); */
  var peek;        /* peek(); */
  var consume;     /* consume(); */
  var is_complete; /* is_complete(); */
  
  var that = {};


  // ### reset_fun
  // Resets the parser function only.
  // 
  reset_fun = function() {
    my.fun = my.def_fun;
  };

  // ### reset_buf
  // ```
  // @buf {string} optional value for buffer (defaults to null)
  // ```
  // Resets the buffer and position only.
  //
  reset_buf = function(buf) {
    my.buf = (typeof buf === 'string') ? buf : null;
    my.pos = 0;
  };

  // ### reset_args
  // ```
  // @arg {string} optional value for args[0]
  // ```
  // Resets the arguments list only
  //
  reset_args = function(arg) {
    my.args = [];
    if(typeof arg !== 'undefined') {
      my.args[0] = arg;
    }
  };

  // ### reset
  // ```
  // @buf {string} optional value for buffer
  // ```
  // Reset the parser state
  //
  reset = function(buf) {
    that.reset_fun();
    that.reset_buf(buf);
    that.reset_args();
  };

  // ### int_arg
  // ```
  // @pos {number} the argument number to retrieve
  // @def {numnber} the default value to return
  // ```
  // Get an argument as an integer.
  // 
  int_arg = function(pos, def) {
    var str = my.args[pos];
    if(str) {
      var ret = parseInt(str, 10);
      if(ret === 0)
        ret = def;
      return ret;
    }
    return def;
  };

  // ### advance
  // ```
  // @count {number} the number of bytes to advance
  // ```
  // Advances the parse position 
  //
  advance = function(count) {
    my.pos += count;
  };

  // ### peek_buf
  // Return the remaining portion of the buffer without affecting
  // the parse_state.
  //
  peek_buf = function() {
    return my.buf.substr(my.pos);
  };

  // ### peek
  // Return the next character of the buffer without affecting the 
  // parse_state.
  // 
  peek = function() {
    return my.buf.substr(my.pos, 1);
  };

  // ### consume_char
  // Return the next character in the buffer and advance the parse
  // position of one byte.
  //
  consume = function() {
    return my.buf.substr(my.pos++, 1);
  };

  // ### is_complete
  // Returns whether the buffer is empty or the position is past
  // the end.
  //
  is_complete = function() {
    return my.buf === null || my.buf.length <= my.pos;
  };


  fwk.method(that, 'reset_fun', reset_fun, _super);
  fwk.method(that, 'reset_buf', reset_buf, _super);
  fwk.method(that, 'reset_args', reset_args, _super);
  fwk.method(that, 'reset', reset, _super);
  fwk.method(that, 'int_arg',int_arg , _super);
  fwk.method(that, 'advance', advance, _super);
  fwk.method(that, 'peek_buf', peek_buf, _super);
  fwk.method(that, 'peek', peek, _super);
  fwk.method(that, 'consume', consume, _super);
  fwk.method(that, 'is_complete', is_complete, _super);

  fwk.getter(that, 'buf', my, 'buf');
  fwk.getter(that, 'pos', my, 'pos');
  fwk.getter(that, 'fun', my, 'fun');
  fwk.setter(that, 'fun', my, 'fun');

  return that;
};

// CURSOR_STATE
// ---
// Helper class to store and revert a cursor state used in DECSC
//
// ```
// @spec {object} { vt }
// ```
// 
var cursor_state = function(spec, my) {
  var _super = {};
  my = my || {};

  // #### Private members
  //
  my.vt = spec.vt

  // #### Public methods
  //
  var save;    /* save(); */
  var restore; /* save(); */
  
  var that = {};


  // ### save
  // Save the cursor state from the VT associaged
  //
  save = function() {
    // TODO
    // this.cursor = this.vt_.terminal.saveCursor();
    // this.textAttributes = this.vt_.terminal.getTextAttributes().clone();

    my.GL = my.vt.GL();
    my.GR = my.vt.GR();

    my.G0 = my.vt.G0();
    my.G1 = my.vt.G1();
    my.G2 = my.vt.G2();
    my.G3 = my.vt.G3();
  };

  // ### restore
  // Restores the previously saved cursor state to the VT associated
  //
  restore = function() {
    // TODO
    // this.vt_.terminal.restoreCursor(this.cursor);
    // this.vt_.terminal.setTextAttributes(this.textAttributes.clone());
  };

  // ### initialization
  // We first start by saving the current VT sate
  //
  save();

  fwk.method(that, 'save', save, _super);
  fwk.method(that, 'restore', restore, _super);

  return that;
};


// VT
// ---
// Escape sequence interpreter 
//
// The `vt` object is in charge of parsing and interpreting the
// sequence sent to the terminal and pass them to the terminal
// to execute cursor operations.
//
// #### Guides:
// 
// - [VT100] VT100 User Guide
//   http://vt100.net/docs/vt100-ug/chapter3.html
// - [VT510] VT510 Video Terminal Programmer Information
//   http://vt100.net/docs/vt510-rm/contents
// - [XTERM] Xterm Control Sequences
//   http://invisible-island.net/xterm/ctlseqs/ctlseqs.html
// - [CTRL]  Wikipedia: C0 and C1 Control Codes
//   http://en.wikipedia.org/wiki/C0_and_C1_control_codes
// - [CSI]   Wikipedia: ANSI Escape Code
//   http://en.wikipedia.org/wiki/Control_Sequence_Introducer
//
// ```
// @spec {object} { 
//     allow_width_change, 
//     osc_time_limit,
//     max_string_sequence,
//     warn
//  }
// ```
// 
var vt = function(spec, my) {
  var _super = {};
  my = my || {};

  // #### Protected methods
  // 
  var parse_unknown;  /* parse_unknown(); */

  // #### Private methods
  //
  var parse_unknown;                 /* parse_unknown(); */
  var parse_csi;                     /* parse_csi(); */
  var parse_until_string_terminator; /* parse_until_string_terminator */
  var dispatch;                      /* dispatch(); */
  var ignore;                        /* ignore(); */

  // #### Private members
  //
  my.parse_state = parse_state(parse_unknown);
  my.leading_modifier = '';
  my.trailing_modifier = '';
  my.allow_width_change = spec.allow_width_change || false;
  my.osc_time_limit = spec.osc_time_limit || 20000;
  my.max_string_sequence = spec.max_string_sequence || 1024;
  my.warn = spec.warn || true;

  // #### Public methods
  //
  var reset;      /* reset(); */
  var read;       /* read(); */
  
  var that = new events.EventEmitter();

  // ### reset
  // Resets the VT to its initial default state
  //
  reset = function() {
    my.G0 = require('./char_map.js').maps['B'];
    my.G1 = require('./char_map.js').maps['0'];
    my.G2 = require('./char_map.js').maps['B'];
    my.G3 = require('./char_map.js').maps['B'];

    my.GL = 'G0';
    my.GR = 'G0';

    my.saved_state = cursor_state({ vt: that });
  };

  // ### read
  // ```
  // @buf The string bufffer to read
  // ```
  // Reads a string of character, inteprets it and pass it the the
  // underlying terminal
  //
  read = function(buf) {
    my.parse_state.reset_buf(buf.toString('utf8'));

    while(!my.parse_state.is_complete()) {
      var fun = my.parse_state.fun();
      var buf = my.parse_state.buf();
      var pos = my.parse_state.pos();

      my.parse_state.fun();
      if(my.parse_state.fun() === fun &&
         my.parse_state.buf() === buf &&
         my.parse_state.pos() === pos) {
        throw new Error('Parser `fun` failed to alter state');
      }
    }
  };

  /********************************************************************************/
  /*                                  PARSERS                                     */
  /********************************************************************************/

  // ### parse_unknown
  // Default parse function. Scans the string for 1-byte control character
  // (C0/C1 from [CTRL]). Any plain text coming before the code will be printed
  // normally to the terminal, the the control character will be dispatched.
  //
  parse_unknown = function() {
    function print(str) {
      var str;
      if(my[my.GL].GL)
         str = my[my.GL].GL(str);
      if(my[my.GR].RL)
         str = my[my.GR].GR(str);
     that.emit('term_print', str);
    }

    var buf = my.parse_state.peek_buf();
    var next_control = buf.search(my.cc1_r);

    if(next_control === 0) {
      /* We just stumbled into a control character */
      dispatch('CC1', buf.substr(0, 1));
      my.parse_state.advance(1);
    }
    else if(next_control === -1) {
      /* No control character, we print */
      print(buf);
      my.parse_state.reset();
    }
    else {
      print(buf.substr(0, next_control));
      this.dipatch('CC1', buf.substr(next_control, 1));
      my.parse_state.advance(next_control + 1);
    }
  };


  // ### parse_csi
  // Parse a Control Sequence Introducer code and dispatch it
  //
  parse_csi = function() {
    var ch = my.parse_state.peek();
    var args = my.parse_state.args();

    if(ch >= '@' && ch <= '~') {
      /* This is the final character */
      dispatch('CSI', my.leading_modifier + my.trailing_modifier + ch);
      my.parse_state.reset_fun();
    }
    else if(ch === ';') {
      /* Parameter delimiter */
      if(my.trailing_modifier) {
        /* Parameter delimiter after the trailing modifier. paddlin' */
        parse_state.reset_fun();
      }
      else {
        if(!args.length) {
          /* They omitted the first param. we supply it */
          args.push('');
        }
        args.push('');
      }
    }
    else if (ch >= '0' && ch <= '9') {
      if(my.trailing_modifier) {
        parse_state.reset_fun();
      }
      else if(!args.length) {
        args[0] = ch;
      }
      else {
        args[args.length - 1] += ch;
      }
    }
    else if (ch >= ' ' && ch <= '?' && ch != ':') {
      if(!args.length) {
        my.leading_modifier += ch;
      }
      else {
        my.trailing_modifier += ch;
      }
    }
    else if (my.cc1_r.test(ch)) {
      dispatch('CC1', ch);
    }
    else {
      parse_state.reset_fun();
    }
    my.parse_state.advance(1);
  };

  // ### parse_until_string_terminator
  // ```
  // @return {boolean} if true, parsing is complete else it exceeded
  // ```
  // Skip over the string until the next String Terminator (ST, 'ESC \') or
  // Bell (BEL, '\x07')
  //
  parse_until_string_terminator = function() {
    var buf = my.parse_state.peek_buf();
    var next_terminator = buf.search(/(\x1b\\|\x07)/);
    var args = my.parse_state.args();

    if(!args.length) {
      args[0] = '';
      args[1] = new Date();
    }

    if(next_terminator === -1) {
      /* No terminator here, have to wait for the next string */
      args[0] += buf;

      var abort;
      if(args[0].length > my.max_string_sequence)
        abort = 'Too long: ' + args[0].length;
      if(args[0].indexOf('\x1b') !== -1)
        abort = 'Embedded escape: ' + args[0].indexOf('\x1b');
      if(new Date() - args[1] > my.osc_time_limit)
        abort = 'Timeout expired: ' + (new Date() - args[1]);

      if(abort) {
        console.log('`parse_until_string_terminator` aborting: ' + abort + ' [' + args[0] + ']');
        my.parse_state.reset(args[0]);
        return false;
      }
      
      my.parse_state.advance(buf.length);
      return true;
    }
    else if((args[0].length + next_terminator) > my.max_string_sequence) {
      /* Found the end of sequence but it's too long */
      my.parse_state.reset(args[0] + buf);
      return false;
    }
    else {
      /* Found the terminator. String is accumulated in args[0] */
      args[0] += buf.substr(0, next_terminator);
      my.parse_state.reset_fun();
      my.parse_state.advance(next_terminator +
                             (buf.substr(next_terminator, 1) === '\x1b' ? 2 : 1));
      return true;
    }
  };

  /********************************************************************************/
  /*                                 DISPATCH                                     */
  /********************************************************************************/

  // ### dispatch
  // ```
  // @type {string} the escape sequence type
  // @code {string} the escape sequence code
  // ```
  // Dispatch to the function that handles the given CC1, ESC, CSI or VT52 code
  //
  dispatch = function(type, code) {
    var handler = my[type][code];
    if(!handler || handler === ignore) {
      if(my.warn) {
        console.log('Unknown/Ignore ' + type + ' code: ' + JSON.stringify(code));
      }
      return;
    }
    if(type === 'CC1' && code > '\x7f') {
      /* We don't handle 8-bit controls. So let's just ignore */
      if(my.warn) {
        console.log('Ignored 8-bit control code: 0x' + 
                    code.charCodeAt(0).toString(16));
      }
      return;
    }
    return handler(code);
  };

  // ### ignore
  // Ignore handler use to ignore an action and test equality
  //
  ignore = function() {};

  /********************************************************************************/
  /*                              CONSTROL SEQUENCES                              */
  /********************************************************************************/

  // ### CC1
  // Collection of control chracters expressed in a single byte.
  //
  my.CC1 = {
    // Null (NUL)
    '\x00': function() {},
    // Enquiry (ENQ)
    '\x05': ignore,
    // Ring Bell (BEL)
    '\x07': function() {
      that.emit('term_ring_bell');
    },
    // Backspace (BS)
    '\x08': function() {
      that.emit('term_cursor_left', 1);
    },
    // Horizontal Tab (HT)
    '\x09': function() {
      that.emit('term_forward_tab_stop');
    },
    // Line Feed (LF)
    '\x0a': function() {
      that.emit('term_form_feed');
    },
    // Vertical Tab (VT)
    '\x0b': my.CC1['\x0a'],
    // Form Feed (FF)
    '\x0c': function() {
      that.emit('term_form_feed');
    },
    // Carriage Return (CR)
    '\x0d': function() {
      that.emit('term_set_cursor_column', 0);
    },
    // Shift Out (SO), aka Lock Shift 1 (LS1)
    '\x0e': function() {
      my.GL = 'G1';
    },
    // Shift In (SI), aka Lock Shift 0 (LS0)
    '\x0f': function() {
      my.GL = 'G0';
    },
    // Transmit On (XON)
    '\x11': ignore,
    // Transmit Off (XOFF)
    '\x13': ignore,
    // Cancel (CAN)
    '\x18': function() {
      my.parse_state.reset_fun();
      that.emit('term_print', '?');
    },
    // Substitute (SUB)
    '\x1a': my.CC1['\x18'],
    // Escape (ESC)
    '\x1b': function() {
      function parse_esc() {
        var ch = my.parse_state.consume();
        if(ch === '\x1b')
          return;
        dispatch('ESC', ch);
        if(my.parse_sate.fun() === parse_esc)
          my.parse_state.reset_fun();
      };
      my.parse_state.set_fun(parse_esc);
    },
    // Delete (DEL)
    '\x7f': ignore
  };

  // ### CC1 Regexp
  // Constructed to quickly scan the known 1-byte control chars
  //
  var acc = Object.keys(my.CC1).map(function(e) {
    return '\\x' + fwk.zpad(e.charCodeAt().toString(16), 2)
  }).join('');
  my.cc1_r = new RegExp('[' + acc + ']');


  // ### ESC
  // Collection of control two-byte and three-byte sequences 
  // starting with ESC.
  //
  my.ESC = {
    // Index (IND)
    'D': function() {
      that.emit('term_line_feed');
    },
    // Next Line (NEL)
    'E': function() {
      that.emit('term_cursor_column', 0)
      that.emit('term_cursor_down', 1);
    },
    // Horizontal Tabulation Set (HTS)
    'H': function() {
      that.emit('term_set_tab_stop_current');
    },
    // Reverse Index (RI)
    'M': function() {
      that.emit('term_reverse_line_feed');
    },
    // Single Shift 2 (SS2)
    'N': ignore,
    // Single Shift 3 (SS3)
    'O': ignore,
    // Device Control String (DCS)
    'P': function() {
      my.parse_state.reset_args();
      my.parse_state.set_fun(parse_until_string_terminator);
    }
    // Start of Pretected Area (SPA)
    'V': ignore,
    // End of Protected Area (EPA)
    'W': ignore,
    // Start of String (SOS)
    'X': ignore,
    // Single Character Introducer (SCI, also DECID)
    'Z': function() {
      // TODO: implement this one
      // this.terminal.io.sendString('\x1b[?1;2c');
    },
    // Control Sequence Introducer (CSI)
    '[': function() {
      my.parse_state.reset_args();
      my.leading_modifer = '';
      my.Trailing_modifier = '';
      my.parse_state.set_fun(parse_csi);
    },
    // String Terminator (ST)
    '\\': ignore,
    // Operating System Command (OSC)
    ']': function() {
      my.parse_state.reset_args();
      function parse_osc() {
        if(!parse_until_string_terminator()) {
          /* The string was too long or invalid */
          return;
        }
        else if(my.parse_state.fun() === parse_osc) {
          /* We're not done parsing the string yet */
          return;
        }
        else {
          /* We're done */
          var ary_r = /^(\d+);(.*)$/;
          var ary_m = my.parse_state.args()[0].match(ary_r);
          if(ary_m) {
            my.parse_state.args()[0] = ary_m[2];
            dispatch('OSC', ary[1]);
          }
          else {
            console.log('Invalid OSC: ' + my.parse_state.args()[0]);
          }
        }
      };
      my.parse_state.set_fun(parse_osc);
    },
    // Privacy Message (PM)
    '^': function() {
      my.parse_state.reset_args();
      my.parse_state.set_fun(parse_until_string_terminator);
    },
    // Application Program Control (APC)
    '_': function() {
      my.parse_state.reset_args();
      my.parse_state.set_fun(parse_until_string_terminator);
    },
    // xterm 'ESC 0x20' Sequence
    '\x20': function() {
      var parse = function() {
        var ch = my.parse_state.consume();
        if(my.warn) {
          console.log('Unimplemented Sequence: ESC 0x20 ' + ch);
        }
        my.parse_state.reset_fun();
      };
      my.parse_state.set_fun(parse);
    }
    // DEC 'ESC #' Sequences
    '#': function() {
      var parse = function() {
        var ch = my.parse_state.consume();
        if(ch === '8') {
          that.emit('term_fill', 'E');
        }
        else if('3456'.indexOf(ch) === -1) {
          /* Echo to terminal all non reserved sequences */
          that.emit('term_print', '\x1b#' + ch);
        }
        my.parse_state.reset_fun();
      };
      my.parse_state.set_fun(parse);
    },
    // 'ESC %' Sequences
    '%': function() {
      var parse = function() {
        var ch = my.parse_state.consume();
        if (my.warn) {
          console.log('Unknown/Unimplemented Seuqnce : ESC % ' + ch);
        }
        my.parse_state.reset_fun();
      };
      my.parse_state.set_fun(parse);
    },
    // Back Index (DECBI)
    '6': ignore,
    // Sace Cursor (DECSC)
    '7': function() {
      my.saved_state.save();
    },
    // Restore Cursor (DECRC)
    '8': function() {
      my.saved_state.restore();
    },
    // Application Keypad (DECPAM)
    '=': function() {
      that.emit('term_application_keypad', true);
    },
    // Normal Keypad (DECPNM)
    '>': function() {
      that.emit('term_application_keypad', false);
    },
    // Cursor to Lower Left (xterm only)
    'F': ignore,
    // Full Reset (RIS)
    'c': function() {
      reset()
      that.emit('term_reset');
    },
    // Memory Lock / Unlock
    'l': ignore,
    'm': ignore,
    // Lock Shift 2 (LS2)
    'n': function() {
      my.GL = 'G2';
    },
    // Lock Shift 3 (LS3)
    'o': function() {
      my.GL = 'G3';
    },
    // Lock Shift 3, Right (LS3R)
    'l': function() {
      my.GR = 'G3';
    },
    // Lock Shift 2, Right (LS2R)
    '}': function() {
      my.GR = 'G1';
    },
    // Lock Shift 1, Right (LS1R)
    '~': function() {
      my.GR = 'G1';
    },
  };
  // Character Set Selection (SCS) 
  my.ESC['('] =
  my.ESC[')'] =
  my.ESC['*'] =
  my.ESC['+'] =
  my.ESC['-'] =
  my.ESC['.'] =
  my.ESC['/'] = function(code) {
    var parse = function() {
      var ch = my.parse_state.consume();
      if(ch === '\x1b') {
        my.parse_state.reset_fun();
        my.parse_state.fun()();
        return;
      }
      if(ch in require('./char_map.js').maps) {
        if(code === '(') {
          my.G0 = require('./char_map.js').maps[ch];
        }
        else if(code ===')' || code === '-') {
          my.G1 = require('./char_map.js').maps[ch];
        }
        else if(code ==='*' || code === '.') {
          my.G2 = require('./char_map.js').maps[ch];
        }
        else if(code ==='+' || code === '/') {
          my.G3 = require('./char_map.js').maps[ch];
        }
      }
      else if(my.warn) {
        console.log('Invalid Character Set: ' + ch + ' for code: ' + code);
      }
      my.parse_state.reset_fun();
    };
    my.parse_state.set_fun(parse);
  };

  // ### OSC
  // Colleciton of OSC (Operating System Control) sequences.
  //
  my.OSC = {
    // Change Icon Name and Window Title
    '0': function() {
      that.emit('term_window_title', my.parse_state.args()[0]);
    },
    // Change Window Title
    '2': function() {
      that.emit('term_window_title', my.parse_state.args()[0]);
    },
    // Set/Read Color Palette
    '4': function() {
      /* Args Format: 'index1;rgb1 ... ;indexN;rgbN' */
      var args = my.parse_state.args[0].split(';');
      
      var n = Math.floor(args.length / 2);
      for(var i = 0; i < n; i++) {
        var idx = parseInt(args[i*2], 10);
        var val = args[i*2+1];
        if(val === '?') {
          if(my.warn) {
            console.log('Unimplemented OSC Color Palette Read');
          }
          conitnue;
        }
        val = require('./colors.js').x11_to_css(val);
        if(val) {
          that.emit('term_color_palette', idx, val);
        }
      }
    },
    // Set/Read System Clipboard
    '52': function() {
      var args_r = /^[cps01234567]+;(.*)$/;
      var args_m = my.parse_state.args()[0].match(args_r);
      if(!args_m)
        return;
      var data = new Buffer(args_m[1], 'base64').toString('utf8') 
      if(data && data.length > 0)
        that.emit('term_copy_to_clipboard', data);
    }
  };

  // ### CSI
  // Collection of CSI (Control Sequence Introducer) sequences.
  //
  my.CSI = {
    // Insert (blank) characters (ICH)
    '@': function() {
      that.emit('term_insert_space', my.parse_state.int_arg(0, 1));
    },
    // Cursor Up (CUU)
    'A': function() {
      that.emit('term_cursor_up', my.parse_state.int_arg(0, 1));
    }
    // ...
  };

  // ### VT52 sequences
  // Collection of VT52 sequences.
  //
  my.VT52 = {
    // ...
  };

  // #### Initialization
  //
  reset();

  fwk.getter(that, 'G0', my, 'G0');
  fwk.setter(that, 'G0', my, 'G0');
  fwk.getter(that, 'G1', my, 'G1');
  fwk.setter(that, 'G1', my, 'G1');
  fwk.getter(that, 'G2', my, 'G2');
  fwk.setter(that, 'G2', my, 'G2');
  fwk.getter(that, 'G3', my, 'G3');
  fwk.setter(that, 'G3', my, 'G3');

  fwk.getter(that, 'GR', my, 'GR');
  fwk.setter(that, 'GR', my, 'GR');
  fwk.getter(that, 'GL', my, 'GL');
  fwk.setter(that, 'GL', my, 'GL');

  return that;
};

