## Breach

A new Terminal Emulator

### Build

```
npm install
cd node_modules/pty.js
nw-gyp build 
```

### Architecture

Breach is based on node-webkit. 

- Node-webkit frontend and IPC communication with emulator.
- Emulator, spawned locally with IPC to parallelize emulation and rendering
- Socket based synchronization?

One instance / multi screens > desired behaviour: 
$ breach (creates ~/.breach-0)
$ breach (creates ~/.breach-1)
$ breach ~/.breach-0


