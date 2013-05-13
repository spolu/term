/**
 * nvt: keymap_f.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130512 @spolu    Map utility functions & implementation
 * - 20130510 @spolu    Creation
 */
'use strict';

//
// ### 'keymap'
// ```
// @e    {event} the keydown event
// @mode {number} the terminal mode
// ```
//
angular.module('nvt.filters').
  filter('keymap', function($window) {
    return function(e, mode) {

      var TERM_MODE = {
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

      var ESC = '\x1b';
      var CSI = '\x1b[';
      var SS3 = '\x1bO';

      var DEFAULT = 'DEFAULT';
      var PASS = 'PASS';

      //
      // ### resolve
      // ```
      // @action {string|function} an action to resolve
      // @e      {event} the keydown event
      // ```
      // Resolves an action given a keydown event. If the action is a funciton
      // then it is called with the proper arguments. Otherwise it's a string
      // and we have finished the resolution
      //
      var resolve = function(action, e) {
        if(typeof action === 'function')
          return action(e);
        return action;
      };

      //
      // ### mod
      // ```
      // @a {action} 
      // @b {action}
      // ```
      // If no modifier resolve `a`, otherwise resolve `b`
      //
      var mod = function(a, b) {
        return function(e) {
          var action = !(e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) ?
            a : b;
          return resolve(action, e);
        };
      };


      //
      // ### sh
      // ```
      // @a {action}
      // @b {action}
      // ```
      // If not e.shiftKey a, else b.
      //
      var sh = function(a, b) {
        return function(e) {
          var action = !e.shiftKey ? a : b
          return resolve(action, e);
        };
      };

      //
      // ### bs
      // ```
      // @a {action}
      // @b {action}
      // ```
      // If term mode `CRLF` is not set then a, else b.
      //
      var bs = function(a, b) {
        return function(e) {
          var action = !(mode & TERM_MODE.CRLF) ? a : b
          return resolve(action, e);
        };
      };

      // 
      // ### ak
      // ```
      // @a {action}
      // @b {action}
      // ```
      // If term mode `APPKEYPAD` is not set then a, else b. If the key is
      // modified then the application keypad mode is ignored
      //
      var ak = function(a, b) {
        return function(e) {
          var action = (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey ||
                        !(mode & TERM_MODE.APPKEYPAD)) ? a : b;
          return resolve(action, e);
        };
      };

      // 
      // ### ac
      // ```
      // @a {action}
      // @b {action}
      // ```
      // If term mode `APPCURSOR` is not set then a, else b. If the key is
      // modified then the application cursor mode is ignored
      //
      var ac = function(a, b) {
        return function(e) {
          var action = (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey ||
                        !(mode & TERM_MODE.APPCURSOR)) ? a : b;
          return resolve(action, e);
        };
      };

      //
      // ### sel
      // ```
      // @a {action}
      // @b {action}
      // ```
      // If there is no selection (browser) then `a` otherwise `b`
      //
      var sel = function(a, b) {
        return function(e) {
          var action = $window.document.getSelection().isCollapsed ? a : b;
          return resolve(action, e);
        };
      };

      //
      // ### ctl
      // ```
      // @ch {string} input character to translate
      // ```
      // Compute a control character for a given character.
      //
      var ctl = function(ch) { 
        return String.fromCharCode(ch.charCodeAt(0) - 64) 
      };


      var map = {
        0:   ['[UNKNOWN]', '' , '', '', ''],

        /* First row */
        27:  ['[ESC]', ESC,                       '', '',          ''],
        112: ['[F1]',  mod(SS3 + 'P', CSI + 'P'), '', CSI + '23~', ''],
        113: ['[F2]',  mod(SS3 + 'Q', CSI + 'Q'), '', CSI + '24~', ''],
        114: ['[F3]',  mod(SS3 + 'R', CSI + 'R'), '', CSI + '25~', ''],
        115: ['[F4]',  mod(SS3 + 'S', CSI + 'S'), '', CSI + '26~', ''],
        116: ['[F5]',  CSI + '15~',               '', CSI + '28~', ''],
        117: ['[F6]',  CSI + '17~',               '', CSI + '29~', ''],
        118: ['[F7]',  CSI + '18~',               '', CSI + '31~', ''],
        119: ['[F8]',  CSI + '19~',               '', CSI + '32~', ''],
        120: ['[F9]',  CSI + '20~',               '', CSI + '33~', ''],
        121: ['[F10]', CSI + '21~',               '', CSI + '34~', ''],
        122: ['[F11]', CSI + '23~',               '', CSI + '42~', ''],
        123: ['[F12]', CSI + '24~',               '', CSI + '43~', ''],

        /* Second row */
        192: ['`~',     DEFAULT, sh(ctl('@'),         ctl('^')), DEFAULT],
        49:  ['1!',     DEFAULT, sh(PASS, '1'),       DEFAULT,   DEFAULT],
        50:  ['2@',     DEFAULT, sh(PASS, ctl('@')),  DEFAULT,   DEFAULT],
        51:  ['3#',     DEFAULT, sh(PASS, ctl('[')),  DEFAULT,   DEFAULT],
        52:  ['4$',     DEFAULT, sh(PASS, ctl('\\')), DEFAULT,   DEFAULT],
        53:  ['5%',     DEFAULT, sh(PASS, ctl(']')),  DEFAULT,   DEFAULT],
        54:  ['6^',     DEFAULT, sh(PASS, ctl('^')),  DEFAULT,   DEFAULT],
        55:  ['7&',     DEFAULT, sh(PASS, ctl('_')),  DEFAULT,   DEFAULT],
        56:  ['8*',     DEFAULT, sh(PASS, '\x7f'),    DEFAULT,   DEFAULT],
        57:  ['9(',     DEFAULT, sh(PASS, 9),         DEFAULT,   DEFAULT],
        48:  ['0)',     DEFAULT, PASS,                DEFAULT,   DEFAULT],
        189: ['-_',     DEFAULT, PASS,                DEFAULT,   DEFAULT],
        187: ['=+',     DEFAULT, PASS,                DEFAULT,   DEFAULT],

        /* Backspace */
        8:   ['[BKSP]', bs('\x7f', '\b'), bs('\b', '\x7f'), DEFAULT, DEFAULT],

        /* Third row */
        9:   ['[TAB]', '\t',    PASS,      PASS,    DEFAULT],
        81:  ['qQ',    DEFAULT, ctl('Q'),  DEFAULT, DEFAULT],
        87:  ['wW',    DEFAULT, ctl('W'),  DEFAULT, DEFAULT],
        69:  ['eE',    DEFAULT, ctl('E'),  DEFAULT, DEFAULT],
        82:  ['rR',    DEFAULT, ctl('R'),  DEFAULT, DEFAULT],
        84:  ['tT',    DEFAULT, ctl('T'),  DEFAULT, DEFAULT],
        89:  ['yY',    DEFAULT, ctl('Y'),  DEFAULT, DEFAULT],
        85:  ['uU',    DEFAULT, ctl('U'),  DEFAULT, DEFAULT],
        73:  ['iI',    DEFAULT, ctl('I'),  DEFAULT, DEFAULT],
        79:  ['oO',    DEFAULT, ctl('O'),  DEFAULT, DEFAULT],
        80:  ['pP',    DEFAULT, ctl('P'),  DEFAULT, DEFAULT],
        219: ['[{',    DEFAULT, ctl('['),  DEFAULT, DEFAULT],
        221: [']}',    DEFAULT, ctl(']'),  DEFAULT, DEFAULT],
        220: ['\\|',   DEFAULT, ctl('\\'), DEFAULT, DEFAULT],

        /* Fourth row */
        20:  ['[CAPS]',  PASS,    PASS,     PASS,    DEFAULT],
        65:  ['aA',      DEFAULT, ctl('A'), DEFAULT, DEFAULT],
        83:  ['sS',      DEFAULT, ctl('S'), DEFAULT, DEFAULT],
        68:  ['dD',      DEFAULT, ctl('D'), DEFAULT, DEFAULT],
        70:  ['fF',      DEFAULT, ctl('F'), DEFAULT, DEFAULT],
        71:  ['gG',      DEFAULT, ctl('G'), DEFAULT, DEFAULT],
        72:  ['hH',      DEFAULT, ctl('H'), DEFAULT, DEFAULT],
        74:  ['jJ',      DEFAULT, ctl('J'), DEFAULT, DEFAULT],
        75:  ['kK',      DEFAULT, ctl('K'), DEFAULT, DEFAULT],
        76:  ['lL',      DEFAULT, ctl('L'), DEFAULT, DEFAULT],
        186: [';:',      DEFAULT, PASS,     DEFAULT, DEFAULT],
        222: ['\'"',     DEFAULT, PASS,     DEFAULT, DEFAULT],
        13:  ['[ENTER]', '\r',    PASS,     PASS,    DEFAULT],

        /* Fifth row */
        // Fifth row.  This includes the copy/paste shortcuts.  On some
        // platforms it's Ctrl-C/V, on others it's Meta-C/V.  We assume either
        // Ctrl-C/Meta-C should pass to the browser when there is a selection,
        // and Ctrl-Shift-V/Meta-*-V should always pass to the browser (since
        // these seem to be recognized as paste too).
        16:  ['[SHIFT]', PASS,    PASS,                   PASS,    DEFAULT],
        90:  ['zZ',      DEFAULT, ctl('Z'),               DEFAULT, DEFAULT],
        88:  ['xX',      DEFAULT, sel(ctl('X'), PASS),    DEFAULT, DEFAULT],
        67:  ['cC',      DEFAULT, '\x03',                 DEFAULT, DEFAULT],
        86:  ['vV',      DEFAULT, sh(ctl('V'), PASS),     DEFAULT, DEFAULT],
        66:  ['bB',      DEFAULT, sh(ctl('B'), PASS),     DEFAULT, DEFAULT],
        78:  ['nN',      DEFAULT, '\x0e',                 DEFAULT, DEFAULT],
        77:  ['mM',      DEFAULT, ctl('M'),               DEFAULT, DEFAULT],
        188: [',<',      DEFAULT, PASS,                   DEFAULT, DEFAULT],
        190: ['.>',      DEFAULT, PASS,                   DEFAULT, DEFAULT],
        191: ['/?',      DEFAULT, sh(ctl('_'), ctl('?')), DEFAULT, DEFAULT],

        // Sixth and final row.
        17: ['[CTRL]', PASS,    PASS,     PASS,    PASS],
        18: ['[ALT]',  PASS,    PASS,     PASS,    PASS],
        91: ['[LAPL]', PASS,    PASS,     PASS,    PASS],
        32: [' ',      DEFAULT, ctl('@'), DEFAULT, DEFAULT],
        92: ['[RAPL]', PASS,    PASS,     PASS,    PASS],

        // These things.
        42:  ['[PRTSCR]', PASS, PASS, PASS, PASS],
        145: ['[SCRLK]',  PASS, PASS, PASS, PASS],
        19:  ['[BREAK]',  PASS, PASS, PASS, PASS],

        // The block of six keys above the arrows.
        35: ['[END]',    ak(CSI + 'F', SS3 + 'F'), DEFAULT, DEFAULT, DEFAULT],
        36: ['[HOME]',   ak(CSI + 'H', SS3 + 'H'), DEFAULT, DEFAULT, DEFAULT],
        45: ['[INSERT]', CSI + '2~',               DEFAULT, DEFAULT, DEFAULT],
        46: ['[DEL]',    CSI + '3~',               DEFAULT, DEFAULT, DEFAULT],
        33: ['[PGUP]',   CSI + '5~',               DEFAULT, DEFAULT, DEFAULT],
        34: ['[PGDOWN]', CSI + '6~',               DEFAULT, DEFAULT, DEFAULT],

        // Arrow keys.  When unmodified they respect the application cursor state,
        // otherwise they always send the CSI codes.
        38: ['[UP]',    ac(CSI + 'A', SS3 + 'A'), DEFAULT, DEFAULT, DEFAULT],
        40: ['[DOWN]',  ac(CSI + 'B', SS3 + 'B'), DEFAULT, DEFAULT, DEFAULT],
        39: ['[RIGHT]', ac(CSI + 'C', SS3 + 'C'), DEFAULT, DEFAULT, DEFAULT],
        37: ['[LEFT]',  ac(CSI + 'D', SS3 + 'D'), DEFAULT, DEFAULT, DEFAULT],

        144: ['[NUMLOCK]', PASS, PASS, PASS, PASS],

        // With numlock off, the keypad generates the same key codes as the arrows
        // and 'block of six' for some keys, and null key codes for the rest.

        // Keypad with numlock on generates unique key codes...
        96:  ['[KP0]', ak(DEFAULT, CSI + '2~'), DEFAULT, DEFAULT, DEFAULT],
        97:  ['[KP1]', ak(DEFAULT, SS3 + 'F'),  DEFAULT, DEFAULT, DEFAULT],
        98:  ['[KP2]', ak(DEFAULT, CSI + 'B'),  DEFAULT, DEFAULT, DEFAULT],
        99:  ['[KP3]', ak(DEFAULT, CSI + '6~'), DEFAULT, DEFAULT, DEFAULT],
        100: ['[KP4]', ak(DEFAULT, CSI + 'D'),  DEFAULT, DEFAULT, DEFAULT],
        101: ['[KP5]', ak(DEFAULT, CSI + 'E'),  DEFAULT, DEFAULT, DEFAULT],
        102: ['[KP6]', ak(DEFAULT, CSI + 'C'),  DEFAULT, DEFAULT, DEFAULT],
        103: ['[KP7]', ak(DEFAULT, SS3 + 'H'),  DEFAULT, DEFAULT, DEFAULT],
        104: ['[KP8]', ak(DEFAULT, CSI + 'A'),  DEFAULT, DEFAULT, DEFAULT],
        105: ['[KP9]', ak(DEFAULT, CSI + '5~'), DEFAULT, DEFAULT, DEFAULT],
        107: ['[KP+]', ak(DEFAULT, SS3 + 'k'),  DEFAULT, DEFAULT, DEFAULT],
        109: ['[KP-]', ak(DEFAULT, SS3 + 'm'),  DEFAULT, DEFAULT, DEFAULT],
        106: ['[KP*]', ak(DEFAULT, SS3 + 'j'),  DEFAULT, DEFAULT, DEFAULT],
        111: ['[KP/]', ak(DEFAULT, SS3 + 'o'),  DEFAULT, DEFAULT, DEFAULT],
        110: ['[KP.]', ak(DEFAULT, CSI + '3~'), DEFAULT, DEFAULT, DEFAULT]
      };

      var def = map[e.keyCode];
      if(!def) {
        console.warn('No definition for keyCode: ' + e.keyCode);
      }

      var mod = {
        shift: e.shitKey,
        control: e.ctrlKey,
        alt: e.altKey,
        meta: e.metaKey
      };
      var action = null;

      if(mod.control) {
        action = def[2];
        mod.control = false;
      }
      else if(mod.alt) {
        action = def[3];
        mod.alt = false;
      }
      else if(mod.meta) {
        action = def[4];
        mod.meta = false;
      }
      else {
        action = def[1];
      }

      if(action === PASS || 
         (action === DEFAULT && !(mod.control || mod.alt || mod.meta))) {
        /* If this is supposed to be handled by the browser or this is an    */
        /* unmodified default action (that will be handled by the `keypress` */
        /* event), then we return this handler.                              */
        return;
      }

      /* We disable the propagation of this event as this has to be entirely */
      /* handled by this keymap.                                             */
      e.preventDefault();
      e.stopPropagation();

      if(action === DEFAULT)
        action = null;

      return action;
    };
});
