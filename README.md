## Breach

A new Terminal Multiplexer

### Features

- Simplified modal navigation
- Cross buffer search
- Easy session sharing (pair programming) and broadcasting

### Architecture

```
+-----+   +-------+
| pty |---| vt.js |---+                         +--------+
+-----+   +-------+   |                     +---| screen |
+-----+   +-------+   |   +---------+       |   +--------+
| pty |---| vt.js |---+---| session | <===> +
+-----+   +-------+   |   +---------+       |   +--------+
+-----+   +-------+   |        |            +---| screen |
| pty |---| vt.js |---+     +-----+             +--------+
+-----+   +-------+         | srv |---+
                            +-----+   |         +--------+
                                      +---------| screen |
                                                +--------+
```
Running breach generally spawns two programs: a screen simply in charge of
connecting to a session and forwarding the data it receives to its own output; 
and a session which acts as the actual multiplexer as well as a server.

The session sends VT100 character sequences directly to the screen. Running
locally, a screen would therefore just forward these sequences directly to the
terminal it runs in. 
