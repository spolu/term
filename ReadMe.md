## Breach

A new Terminal Emulator

### Build

```
npm install
cd node_modules/pty.js
nw-gyp build 
```

### Architecture

Breach is based on node-webkit. It is splitted in two processes. One in charge
of handling session information and terminal emulation, the `emulator` and one
in charge of rendering the terminal to the user, the `screen`, based on
node-webkit. 

```
            emulator              IPC     screen
<------------------------------><------><-------->

+-----+
| pty |---+                   
+-----+   |                      
          |
+-----+   |  +---------+  +----+        +--------+
| pty |---+--| session |--| fd | <====> | client |
+-----+   |  +---------+  +----+        +--------+
          |
+-----+   |
| pty |---+
+-----+
```

Calling breach alone or on a file that does not exists creates an `emulator`
that will create that file and use it for IPC communication with its attached
`screens`.

If the file already exists, then only a `screen` is created which is then
attached to the existing `emulator`.

```
$ breach (creates ~/.breach-0)
$ breach (creates ~/.breach-1)
$ breach ~/.breach-0
```

