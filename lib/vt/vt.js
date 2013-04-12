/*
 * mt: vt.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130410 spolu    fork from hterm
 */
var common = require('../common.js');
var events = require('events');
var util = require('util');

'use strict';

//
// ## state
//
// Helper class to represent the parser state
// ```
// @spec {object} { def_fun }
// ```
// 
var state = function(spec, my) {
  var _super = {};
  my = my || {};

  //
  // #### _private members_
  //
  my.def_fun = spec.def_fun
  my.buf = null;
  my.pos = 0;
  my.fun = my.def_fun;
  my.args = [];

  //
  // #### _public methods_
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
  
  //
  // #### _that_
  //
  var that = {};


  //
  // ### reset_fun
  // Resets the parser function only.
  // 
  reset_fun = function() {
    my.fun = my.def_fun;
  };

  //
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

  //
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

  //
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

  //
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

  //
  // ### advance
  // ```
  // @count {number} the number of bytes to advance
  // ```
  // Advances the parse position 
  //
  advance = function(count) {
    my.pos += count;
  };

  //
  // ### peek_buf
  // Return the remaining portion of the buffer without affecting the state.
  //
  peek_buf = function() {
    return my.buf.substr(my.pos);
  };

  //
  // ### peek
  // Return the next character of the buffer without affecting the state.
  // 
  peek = function() {
    return my.buf.substr(my.pos, 1);
  };

  //
  // ### consume_char
  // Return the next character in the buffer and advance the parse
  // position of one byte.
  //
  consume = function() {
    return my.buf.substr(my.pos++, 1);
  };

  //
  // ### is_complete
  // Returns whether the buffer is empty or the position is past
  // the end.
  //
  is_complete = function() {
    return my.buf === null || my.buf.length <= my.pos;
  };


  common.method(that, 'reset_fun', reset_fun, _super);
  common.method(that, 'reset_buf', reset_buf, _super);
  common.method(that, 'reset_args', reset_args, _super);
  common.method(that, 'reset', reset, _super);
  common.method(that, 'int_arg',int_arg , _super);
  common.method(that, 'advance', advance, _super);
  common.method(that, 'peek_buf', peek_buf, _super);
  common.method(that, 'peek', peek, _super);
  common.method(that, 'consume', consume, _super);
  common.method(that, 'is_complete', is_complete, _super);

  common.getter(that, 'buf', my, 'buf');
  common.getter(that, 'pos', my, 'pos');
  common.getter(that, 'fun', my, 'fun');
  common.setter(that, 'fun', my, 'fun');

  return that;
};



//
// ## vt
//
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

  //
  // #### _protected methods_
  // 
  var parse_unknown;  /* parse_unknown(); */

  // 
  // #### _private methods_
  //
  var cursor_save;                   /* cursor_save(); */
  var cursor_restore;                /* cursor_reset(); */
  var parse_unknown;                 /* parse_unknown(); */
  var parse_csi;                     /* parse_csi(); */
  var parse_until_string_terminator; /* parse_until_string_terminator */
  var dispatch;                      /* dispatch(); */
  var ignore;                        /* ignore(); */
  var set_ansi_mode;                 /* set_ansi_mode(code, state); */
  var set_dec_mode;                  /* set_dec_mode(code, state); */

  //
  // #### _private members_
  //
  my.state = state(parse_unknown);
  my.leading_modifier = '';
  my.trailing_modifier = '';
  my.allow_width_change = spec.allow_width_change || false;
  my.osc_time_limit = spec.osc_time_limit || 20000;
  my.max_string_sequence = spec.max_string_sequence || 1024;
  my.warn = spec.warn || true;
  my.saved_state = {};

  //
  // #### _public methods_
  //
  var reset;      /* reset(); */
  var read;       /* read(); */
  
  var that = new events.EventEmitter();

  //
  // ### cursor_save
  // Saves the cursor state and emits a `save_cursor` event for the terminal
  // to save its actual cursor state.
  //
  save_cursor = function() {
    my.saved_state = {
      GL: my.GL,
      GR: my.GR,

      G0: my.G0,
      G1: my.G1,
      G2: my.G2,
      G4: my.G3
    };

    /* Saves cursor and text attributes */
    that.emit('term_save_cursor');
  };

  //
  // ### cursor_restore
  // Restores the cursor state and emits a `restor_cursor` event for the
  // terminal to restor its cursor state.
  // 
  restore_cursor = function() {
    my.GL = my.saved_state.GL;
    my.GR = my.saved_state.GR;

    my.G0 = my.saved_state.G0;
    my.G1 = my.saved_state.G1;
    my.G2 = my.saved_state.G2;
    my.G3 = my.saved_state.G3;

    /* Restores cursor and text attributes */
    that.emit('term_restore_cursor');
  }


  //
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

    my.saved_state = {
      GL: my.GL,
      GR: my.GR,
      G0: my.G0,
      G1: my.G1,
      G2: my.G2,
      G4: my.G3
    };

    /* Resets cursor and text atttributes */
    that.emit('term_reset_cursor');
  };

  //
  // ### read
  // ```
  // @buf The string bufffer to read
  // ```
  // Reads a string of character, inteprets it and pass it the the
  // underlying terminal
  //
  read = function(buf) {
    my.state.reset_buf(buf.toString('utf8'));

    while(!my.state.is_complete()) {
      var fun = my.state.fun();
      var buf = my.state.buf();
      var pos = my.state.pos();

      my.state.fun();
      if(my.state.fun() === fun &&
         my.state.buf() === buf &&
         my.state.pos() === pos) {
        throw new Error('Parser `fun` failed to alter state');
      }
    }
  };

  /****************************************************************************/
  /*                               PARSERS                                    */
  /****************************************************************************/

  //
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

    var buf = my.state.peek_buf();
    var next_control = buf.search(my.cc1_r);

    if(next_control === 0) {
      /* We just stumbled into a control character */
      dispatch('CC1', buf.substr(0, 1));
      my.state.advance(1);
    }
    else if(next_control === -1) {
      /* No control character, we print */
      print(buf);
      my.state.reset();
    }
    else {
      print(buf.substr(0, next_control));
      this.dipatch('CC1', buf.substr(next_control, 1));
      my.state.advance(next_control + 1);
    }
  };


  //
  // ### parse_csi
  // Parse a Control Sequence Introducer code and dispatch it
  //
  parse_csi = function() {
    var ch = my.state.peek();
    var args = my.state.args();

    if(ch >= '@' && ch <= '~') {
      /* This is the final character */
      dispatch('CSI', my.leading_modifier + my.trailing_modifier + ch);
      my.state.reset_fun();
    }
    else if(ch === ';') {
      /* Parameter delimiter */
      if(my.trailing_modifier) {
        /* Parameter delimiter after the trailing modifier. paddlin' */
        my.state.reset_fun();
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
        my.state.reset_fun();
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
      my.state.reset_fun();
    }
    my.state.advance(1);
  };

  //
  // ### parse_until_string_terminator
  // ```
  // @return {boolean} if true, parsing is complete else it exceeded
  // ```
  // Skip over the string until the next String Terminator (ST, 'ESC \') or
  // Bell (BEL, '\x07')
  //
  parse_until_string_terminator = function() {
    var buf = my.state.peek_buf();
    var next_terminator = buf.search(/(\x1b\\|\x07)/);
    var args = my.state.args();

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
        console.log('`parse_until_string_terminator` aborting: ' + 
                    abort + ' [' + args[0] + ']');
        my.state.reset(args[0]);
        return false;
      }
      
      my.state.advance(buf.length);
      return true;
    }
    else if((args[0].length + next_terminator) > my.max_string_sequence) {
      /* Found the end of sequence but it's too long */
      my.state.reset(args[0] + buf);
      return false;
    }
    else {
      /* Found the terminator. String is accumulated in args[0] */
      args[0] += buf.substr(0, next_terminator);
      my.state.reset_fun();
      my.state.advance(next_terminator +
                             (buf.substr(next_terminator, 1) === '\x1b' ? 
                              2 : 1));
      return true;
    }
  };

  /****************************************************************************/
  /*                               DISPATCH                                   */
  /****************************************************************************/

  //
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
        console.log('Unknown/Ignore ' + type + ' code: ' + code);
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

  /****************************************************************************/
  /*                                  MODES                                   */
  /****************************************************************************/

  //
  // ### set_ansi_mode
  // ```
  // @code {string} the code of the ANSI mode to switch to
  // @state {boolean} mode state
  // ```
  // Set one o the ANSI defined terminal mode bits
  //
  set_ansi_mode = function(code, state) {
    if(code === '4')
      that.emit('term_set_insert_mode', state)
    else if(code === '20')
      that.emit('term_set_auto_carriage_return', state)
    else if(my.warn)
      console.log('Unimplemented ANSI Mode: ' + code);
  };

  //
  // ### set_dec_mode
  // ```
  // @code {string} the code of the DEC mode to switch to
  // @state {boolean} mode state
  // ```
  // Invoked in response to DECSET/DECRST.
  // Expected values for code:
  //     1 - Application Cursor Keys (DECCKM).
  //     2 - [!] Designate USASCII for character sets G0-G3 (DECANM), and set
  //         VT100 mode.
  //     3 - 132 Column Mode (DECCOLM).
  //     4 - [x] Smooth (Slow) Scroll (DECSCLM).
  //     5 - Reverse Video (DECSCNM).
  //     6 - Origin Mode (DECOM).
  //     7 - Wraparound Mode (DECAWM).
  //     8 - [x] Auto-repeat Keys (DECARM).
  //     9 - [!] Send Mouse X & Y on button press.
  //    10 - [x] Show toolbar (rxvt).
  //    12 - Start Blinking Cursor (att610).
  //    18 - [!] Print form feed (DECPFF).
  //    19 - [x] Set print extent to full screen (DECPEX).
  //    25 - Show Cursor (DECTCEM).
  //    30 - [!] Show scrollbar (rxvt).
  //    35 - [x] Enable font-shifting functions (rxvt).
  //    38 - [x] Enter Tektronix Mode (DECTEK).
  //    40 - Allow 80 - 132 Mode.
  //    41 - [!] more(1) fix (see curses resource).
  //    42 - [!] Enable Nation Replacement Character sets (DECNRCM).
  //    44 - [!] Turn On Margin Bell.
  //    45 - Reverse-wraparound Mode.
  //    46 - [x] Start Logging.
  //    47 - [!] Use Alternate Screen Buffer.
  //    66 - [!] Application keypad (DECNKM).
  //    67 - Backarrow key sends backspace (DECBKM).
  //  1000 - Send Mouse X & Y on button press and release.  (MOUSE_REPORT_CLICK)
  //  1001 - [!] Use Hilite Mouse Tracking.
  //  1002 - Use Cell Motion Mouse Tracking.  (MOUSE_REPORT_DRAG)
  //  1003 - [!] Use All Motion Mouse Tracking.
  //  1004 - [!] Send FocusIn/FocusOut events.
  //  1005 - [!] Enable Extended Mouse Mode.
  //  1010 - Scroll to bottom on tty output (rxvt).
  //  1011 - Scroll to bottom on key press (rxvt).
  //  1034 - [x] Interpret "meta" key, sets eighth bit.
  //  1035 - [x] Enable special modifiers for Alt and NumLock keys.
  //  1036 - Send ESC when Meta modifies a key.
  //  1037 - [!] Send DEL from the editing-keypad Delete key.
  //  1039 - Send ESC when Alt modifies a key.
  //  1040 - [x] Keep selection even if not highlighted.
  //  1041 - [x] Use the CLIPBOARD selection.
  //  1042 - [!] Enable Urgency window manager hint when Control-G is received.
  //  1043 - [!] Enable raising of the window when Control-G is received.
  //  1047 - [!] Use Alternate Screen Buffer.
  //  1048 - Save cursor as in DECSC.
  //  1049 - Save cursor as in DECSC and use Alternate Screen Buffer, clearing
  //         it first. (This may be disabled by the titeInhibit resource). This
  //         combines the effects of the 1047 and 1048 modes. Use this with
  //         terminfo-based applications rather than the 47 mode.
  //  1050 - [!] Set terminfo/termcap function-key mode.
  //  1051 - [x] Set Sun function-key mode.
  //  1052 - [x] Set HP function-key mode.
  //  1053 - [x] Set SCO function-key mode.
  //  1060 - [x] Set legacy keyboard emulation (X11R6).
  //  1061 - [!] Set VT220 keyboard emulation.
  //  2004 - [!] Set bracketed paste mode.
  //   
  // [!] - Not currently implemented, may be in the future.
  // [x] - Will not implement.
  //
  set_dec_mode = function(code, state) {
    switch(code) {
      case '1': {
        that.emit('term_set_application_cursor', state);
        break;
      }
      case '3': {
        if(my.allow_width_change) {
          that.emit('term_set_width', state ? 132 : 80);
          that.emit('term_clear_home');
          that.emit('term_vt_scroll_region', null, null);
        }
        break;
      }
      case: '5': {
        that.emit('term_set_reverse_video', state);
        break;
      }
      case '6': {
        that.emit('term_set_origin_mode', sate);
        break;
      }
      case '7': {
        that.emit('term_set_wrap_around', state);
        break;
      }
      case '12': {
        that.emit('term_set_cursor_blink', state);
        break;
      }
      case '25': {
        that.emit('term_set_cursor_visible', state);
        break;
      }
      case '40': {
        that.emit('term_set_allow_width_change', state);
        break;
      }
      case '45': {
        that.emit('term_set_reverse_wrap_around', state);
        break;
      }
      case '67': {
        that.emit('term_set_keyboard_backspace_sends_backspace', state);
        break;
      }
      case '1000': {
        /* TODO: mouse */
        reak;
      }
      case '1002': {
        /* TODO: mouse */
        break;
      },
      case '1010': {
        that.emit('term_set_scroll_on_output', state);
        break;
      }
      case '1011': {
        that.emit('term_set_scoll_on_keystroke', state);
        break;
      }
      case '1036': {
        that.emit('term_set_keyboard_meta_sends_escape', state);
        break;
      }
      case '1039': {
        that.emit('term_set_keyboard_alt_sends_escape', state);
        break;
      }
      case '47':
      case '1047': {
        that.emit('term_set_alternate_mode', state);
        break;
      }
      case '1048': {
        save_cursor();
        break;
      }
      case '1049': {
        if(state) {
          save_cursor();
          that.emit('term_set_alternate_mode', state);
          that.emit('term_clear');
        }
        else {
          that.emit('term_set_alternate_mode', state);
          restore_cursor();
        }
        break;
      }
      default: {
        if(my.warn)
          console.log('Unimplemented DEC Private Mode: ' + code);
      }
    }
  };



  /****************************************************************************/
  /*                             CONTROL SEQUENCES                            */
  /****************************************************************************/

  //
  // ### ignore
  // Ignore handler use to ignore an action and test equality
  //
  ignore = function() {};

  //
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
      my.state.reset_fun();
      that.emit('term_print', '?');
    },
    // Substitute (SUB)
    '\x1a': my.CC1['\x18'],
    // Escape (ESC)
    '\x1b': function() {
      function parse_esc() {
        var ch = my.state.consume();
        if(ch === '\x1b')
          return;
        dispatch('ESC', ch);
        if(my.parse_sate.fun() === parse_esc)
          my.state.reset_fun();
      };
      my.state.set_fun(parse_esc);
    },
    // Delete (DEL)
    '\x7f': ignore
  };

  //
  // ### CC1 Regexp
  // Constructed to quickly scan the known 1-byte control chars
  //
  var acc = Object.keys(my.CC1).map(function(e) {
    return '\\x' + common.zpad(e.charCodeAt().toString(16), 2)
  }).join('');
  my.cc1_r = new RegExp('[' + acc + ']');


  //
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
      that.emit('term_set_cursor_column', 0);
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
      my.state.reset_args();
      my.state.set_fun(parse_until_string_terminator);
    }
    // Start of Pretected Area (SPA)
    'V': ignore,
    // End of Protected Area (EPA)
    'W': ignore,
    // Start of String (SOS)
    'X': ignore,
    // Single Character Introducer (SCI, also DECID)
    'Z': function() {
      that.emit('term_send_string', '\x1b[?1;2c');
    },
    // Control Sequence Introducer (CSI)
    '[': function() {
      my.state.reset_args();
      my.leading_modifer = '';
      my.Trailing_modifier = '';
      my.state.set_fun(parse_csi);
    },
    // String Terminator (ST)
    '\\': ignore,
    // Operating System Command (OSC)
    ']': function() {
      my.state.reset_args();
      function parse_osc() {
        if(!parse_until_string_terminator()) {
          /* The string was too long or invalid */
          return;
        }
        else if(my.state.fun() === parse_osc) {
          /* We're not done parsing the string yet */
          return;
        }
        else {
          /* We're done */
          var ary_r = /^(\d+);(.*)$/;
          var ary_m = my.state.args()[0].match(ary_r);
          if(ary_m) {
            my.state.args()[0] = ary_m[2];
            dispatch('OSC', ary[1]);
          }
          else {
            console.log('Invalid OSC: ' + my.state.args()[0]);
          }
        }
      };
      my.state.set_fun(parse_osc);
    },
    // Privacy Message (PM)
    '^': function() {
      my.state.reset_args();
      my.state.set_fun(parse_until_string_terminator);
    },
    // Application Program Control (APC)
    '_': function() {
      my.state.reset_args();
      my.state.set_fun(parse_until_string_terminator);
    },
    // xterm 'ESC 0x20' Sequence
    '\x20': function() {
      var parse = function() {
        var ch = my.state.consume();
        if(my.warn) {
          console.log('Unimplemented Sequence: ESC 0x20 ' + ch);
        }
        my.state.reset_fun();
      };
      my.state.set_fun(parse);
    }
    // DEC 'ESC #' Sequences
    '#': function() {
      var parse = function() {
        var ch = my.state.consume();
        if(ch === '8') {
          that.emit('term_fill', 'E');
        }
        else if('3456'.indexOf(ch) === -1) {
          /* Echo to terminal all non reserved sequences */
          that.emit('term_print', '\x1b#' + ch);
        }
        my.state.reset_fun();
      };
      my.state.set_fun(parse);
    },
    // 'ESC %' Sequences
    '%': function() {
      var parse = function() {
        var ch = my.state.consume();
        if (my.warn) {
          console.log('Unknown/Unimplemented Seuqnce : ESC % ' + ch);
        }
        my.state.reset_fun();
      };
      my.state.set_fun(parse);
    },
    // Back Index (DECBI)
    '6': ignore,
    // Save Cursor (DECSC)
    '7': function() {
      save_cursor();
    },
    // Restore Cursor (DECRC)
    '8': function() {
      restore_cursor();
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
  //
  // Character Set Selection (SCS) 
  //
  my.ESC['('] =
  my.ESC[')'] =
  my.ESC['*'] =
  my.ESC['+'] =
  my.ESC['-'] =
  my.ESC['.'] =
  my.ESC['/'] = function(code) {
    var parse = function() {
      var ch = my.state.consume();
      if(ch === '\x1b') {
        my.state.reset_fun();
        my.state.fun()();
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
      my.state.reset_fun();
    };
    my.state.set_fun(parse);
  };

  //
  // ### OSC
  // Colleciton of OSC (Operating System Control) sequences.
  //
  my.OSC = {
    // Change Icon Name and Window Title
    '0': function() {
      that.emit('term_window_title', my.state.args()[0]);
    },
    // Change Window Title
    '2': function() {
      that.emit('term_window_title', my.state.args()[0]);
    },
    // Set/Read Color Palette
    '4': function() {
      /* Args Format: 'index1;rgb1 ... ;indexN;rgbN' */
      var args = my.state.args[0].split(';');
      
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
      var args_m = my.state.args()[0].match(args_r);
      if(!args_m)
        return;
      var data = new Buffer(args_m[1], 'base64').toString('utf8') 
      if(data && data.length > 0)
        that.emit('term_copy_to_clipboard', data);
    }
  };

  //
  // ### CSI
  // Collection of CSI (Control Sequence Introducer) sequences.
  //
  my.CSI = {
    // Insert (blank) characters (ICH)
    '@': function() {
      that.emit('term_insert_space', my.state.int_arg(0, 1));
    },
    // Cursor Up (CUU)
    'A': function() {
      that.emit('term_cursor_up', my.state.int_arg(0, 1));
    },
    // Cursor Down (CUD)
    'B': function() {
      that.emit('term_cursor_down', my.state.int_args(0, 1));
    },
    // Cursor Forward (CUF)
    'C': function() {
      that.emit('term_cursor_right', my.state.int_args(0, 1));
    },
    // Cursor Backward (CUB)
    'C': function() {
      that.emit('term_cursor_left', my.state.int_args(0, 1));
    },
    // Cursor Next Line (CNL)
    'E': function() {
      that.emit('term_cursor_down', my.state.int_args(0, 1));
      that.emit('term_set_cursor_column', 0);
    },
    // Cursor Preceding Line (CPL)
    'F': function() {
      that.emit('term_cursor_up', my.state.int_args(0, 1));
      that.emit('term_set_cursor_column', 0);
    },
    // Cursor Character Absolute (CHA)
    'G': function() {
      that.emit('term_set_cursor_column', my.state.int_args(0, 1) - 1);
    },
    // Cursor Position (CUP)
    'H': function() {
      that.emit('term_set_cursor_position', 
                my.state.int_args(0, 1),
                my.state.int_args(1, 1));
    },
    // Cursor Forward Tabulation (CHT)
    'I': function() {
      var count = my.state.int_args(0, 1);
      /* TODO check clamp terminal side */
      for (var i = 0; i < count; i++) {
        /* `forward tab stop` must stop at terminal width boundary */
        that.emit('term_forward_tab_stop');
      }
    },
    // Erase in Display (ED, DECSED)
    'J': function(code) {
      var args = my.state.args()[0];

      if(!arg || arg === '0') {
        that.emit('term_erase_below');
      }
      else if(arg === '1') {
        that.emit('term_erase_above');
      }
      else if(arg === '2') {
        that.emit('term_clear');
      }
      else if(arg === '3') {
        /* xterm "Erase saved lines" -> clear */
        that.emit('term_clear');
      }
      else {
        that.emit('term_print', '\x1b[' + code + args[0]);
      }
    },
    // Erase in Line (EL, DECSEL)
    'K': function(code) {
      var args = my.state.args()[0];

      if(!arg || arg === '0') {
        that.emit('term_erase_to_right');
      }
      else if(arg === '1') {
        that.emit('term_erase_to_left');
      }
      else if(arg === '2') {
        that.emit('term_erase_line');
      }
      else {
        that.emit('term_print', '\x1b[' + code + args[0]);
      }
    }
    // Insert Lines (IL)
    'L': function() {
      that.emit('term_insert_lines', my.state.int_arg(0, 1));
    },
    // Delete Lines (DL)
    'M': function() {
      that.emit('term_delete_lines', my.state.int_arg(0, 1));
    },
    // Delete Characters (DCH)
    'P': function() {
      that.emit('term_delete_chars', my.state.int_arg(0, 1));
    },
    // Scroll Up (SU)
    'S': function() {
      that.emit('term_vt_scroll_up', my.state.int_arg(0, 1));
    },
    // Scroll Down (SD)
    'T': function() {
      if(my.state.args().length <= 1)
        that.emit('term_vt_scroll_down', my.state.int_arg(0, 1));
    },
    // Reset Title Mode Features
    '>T': ignore,
    // Erase Characters (ECH)
    'X': function() {
      that.emit('term_erase_to_right', my.state.int_arg(0, 1))
    },
    // Cursor Bakcward Tabulation (CBT)
    'Z': function() {
      var count = my.state.int_args(0, 1);
      /* TODO check clamp terminal side */
      for (var i = 0; i < count; i++) {
        /* `forward tab stop` must stop at terminal width boundary */
        that.emit('term_backward_tab_stop');
      }
    },
    // Character Position Absolute (HPA)
    '`': function() {
      that.emit('term_set_cursor_column', my.state.int_arg(0, 1) - 1);
    },
    // Repeat Graphic Character
    'b': ignore,
    // Send Device Attribute (Primary DA)
    'c': function() {
      /* Hard coded to VT100. Upgradable to VT200 w/ implementation */
      if(!my.state.args()[0] || my.state.args()[0] === '0') {
        that.emit('term_send_string', '\x1b[?1;2c');
      }
    },
    // Send Device Attribute (Secondary DA)
    '>c': function() {
      that.emit('term_send_string', '\x1b[>0;256;0c');
    },
    // Line Position Absolute (VPA)
    'd': function() {
      that.emit('term_set_absolute_cursor_row', my.state.int_args(0, 1) - 1);
    },
    // Tab Clear (TBC)
    'g': function() {
      if(!my.state.args()[0] || my.state.args()[0] === '0') {
        that.emit('term_clear_tab_stop_at_cursor', false);
      }
      else if(my.state.args()[0] === '3') {
        that.emit('term_clear_all_tab_stops');
      }
    },
    // Set Mode (SM)
    'h': function() {
      for(var i = 0; i < my.state.args().length; i ++) {
        set_ansi_mode(my.state.args()[i], true);
      }
    },
    // DEC Private Mode Set (DECSET)
    '?h': function() {
      for(var i = 0; i < my.state.args().length; i ++) {
        set_dec_mode(my.state.args()[i], true);
      }
    },
    // Media Copy (MC)
    'i': ignore,
    // Media Copy (MC, DEC Specific)
    '?i': ignore,
    // Reset Mode (RM)
    'l': function() {
      for(var i = 0; i < my.state.args().length; i ++) {
        set_ansi_mode(my.state.args()[i], false);
      }
    },
    // DEC Private Mode Reset (DECRST)
    '?l': function() {
      for(var i = 0; i < my.state.args().length; i ++) {
        set_dec_mode(my.state.args()[i], false);
      }
    },
    // Character Attributes (SGR)
    'm': function() {
      /* TODO: With Terminal Attributes */
      /*       Substantial one          */
    },
    // Set xterm-specific keyboard modes
    '>m': ignore,
    // Device Status Report (DSR, DEC Specific)
    '?n': function() {
      if(my.state.args()[0] === '6') {
      }
    },




      
    
    // ...
  };
  //
  // Aliases
  //
  my.CSI['?J'] = my.CSI['J'];
  my.CSI['?K'] = my.CSI['K'];
  // Horizontal and Vertical Position (HVP)
  my.CSI['f'] = my.CSI['H'];

  //
  // ### VT52 sequences
  // Collection of VT52 sequences.
  //
  my.VT52 = {
    // ...
  };

  //
  // #### _initialization_
  //
  reset();

  common.getter(that, 'G0', my, 'G0');
  common.setter(that, 'G0', my, 'G0');
  common.getter(that, 'G1', my, 'G1');
  common.setter(that, 'G1', my, 'G1');
  common.getter(that, 'G2', my, 'G2');
  common.setter(that, 'G2', my, 'G2');
  common.getter(that, 'G3', my, 'G3');
  common.setter(that, 'G3', my, 'G3');

  common.getter(that, 'GR', my, 'GR');
  common.setter(that, 'GR', my, 'GR');
  common.getter(that, 'GL', my, 'GL');
  common.setter(that, 'GL', my, 'GL');

  return that;
};

exports.vt = vt;

