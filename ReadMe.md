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
                      emulator                    IPC     screen
<---------------------------------------------><-------><-------->

+-----+   +----------+
| pty |---| terminal |---+
+-----+   +----------+   |                      
                         |
+-----+   +----------+   |  +---------+  +----+         +--------+
| pty |---| terminal |---+--| session |--| UD | <=====> | client |
+-----+   +----------+   |  +---------+  +----+         +--------+
                         |
+-----+   +----------+   |
| pty |---| terminal |---+
+-----+   +----------+
```

Calling breach without a path argument spawns an `emulator` and a `screen`. The 
emulator will open a unix domain socket and wait for screens to connect. The 
`screen` will be spawned with the newly created unix domain socket path as
argument.

Calling breach with a unix domain socket path argument will only spawn a new
`screen` with this path as argument. The newly spawned screen will simply attach
to the existing emulator.

```
$ breach (creates ~/.breach-0) [spawns `breach-emulator` and `breach` (screen)]
$ breach (creates ~/.breach-1) [spawns `breach-emulator` and `breach` (screen)]
$ breach ~/.breach-0           [spawns only `breach` (screen)]
```

The terminals are emulated in the `emulator` and not the screens. Emulating in
the screens could have been more efficient (only pty data transiting) but would
prevent retrieving history (unless emulating on both sides).



