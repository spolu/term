## Breach - Experimental Web Browser

The goal of this project is to experiment with new concepts in web browsing. The
initial two main experiments are:

- Globally synchronized (server) cookie store and tabs for seamless 
  session retrieval
- Merge of tabs and history into a seachable stack navigation

### Architecture

Breach is based on the Chromium Embed Framework (CEF) and attemps to minimize
the amount of C++ code. The whole UI and a maximum amount of UI are deported
to javascript.

```
Shell - Shell API - Navigation View
                  - Glass
                  - [Browsing Windows]
```

