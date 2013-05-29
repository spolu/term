## Breach

A new Terminal Emulator

## Build

```
npm install
cd node_modules/pty.js
nw-gyp build 
```

### Architecture

Breach is splitted in two main programs and a wrapper:
```
breach-session  # emulator, multiplexer, server
breach-screen   # renderer
breach          # wrapper
```
`breach-session` is in charge of handling session information, terminal 
emulation, and serving it over HTTP for screens to attach. 

`breach-screen` is in charge of rendering the terminal to the user. It is based 
on node-webkit and can attach to local or remote sessions.

`breach` is a wrapper that will launch `breach-session`, `breach-screen` or both
depending on the arguments it is given.

```
                      session                              screen
[<-------------------------------------------->]         [<------>]

+-----+   +----------+
| pty |---| terminal |---+
+-----+   +----------+   |                      
                         |
+-----+   +----------+   |  +---------+  +-----+   net   +--------+
| pty |---| terminal |---+--| session |--| srv | <=====> | client |
+-----+   +----------+   |  +---------+  +-----+         +--------+
                         |
+-----+   +----------+   |
| pty |---| terminal |---+
+-----+   +----------+
```

Calling `breach` without argument will default to the `new` command which spawns
`breach-session` and a `breach-screen`. The session will by default open a local 
HTTP server on a clean port for screens to connect (attach). The screen will be 
spawned with the newly created server URL as argument.

Calling `breach` with an URL will default to the `attach` command and will only 
spawn a new screen to attach to the specified URL.

Calling `breach` with the command `listen` will only spawn a session. Arguments
can be passed to choose the port and whether to listen locally or publicly. 

```
$ breach
$ breach [new] --port 1234
$ breach listen --public --port 1234
$ breach [attach] http://remote:8923
```

The terminals are emulated in the `session` and not the `screens`. Emulating in
the `screens` could have been more efficient (only pty data transiting) but 
would prevent retrieving history (unless emulating on both sides).


### Features:

- Cross buffer search
- New stack-based navigation
- Easy sharing (read-only and read-write) and pair programming


## Alternative Project

A new Terminal Multiplexer

breach-screen

