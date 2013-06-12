## Breach - Experimental Web Browser

Breach is a new experimental web browser based on Chrome. The goal of the 
project is to agressively experiment with new concepts in web browsing in order
to test their validity.

We will focus on concepts and feautres that large vendors are unable to
introduce as they would probably be too disruptive for their existing user base.

### Experiments

- Cloud-based synchronization of the cookie store and the tabs for seamless 
  cross-device session retrieval
- Merge of tabbing and history into a seachable "stack navigation"

### Architecture

Breach is based on the Chromium Embed Framework (CEF) and attemps to minimize
the amount of C++ code it uses in favor of Javascript.

The architecture of Breach is therefore divided in two:
- The Shell: C++ Wrapper of CEF with Javascript bindings exposed to priviledged
  windows and handling the insulated browsing windows stack.
- The Chrome: A set of UI windows executing HTML5/CSS/JS code. They have access 
  to the priviledged Shell API and can communicate through it. The UI elements 
  are four "Border Windows" and a "Glass"


```
CEF - Shell - Shell JS API - Border Views
                           - Glass
            - [Insulated Browsing Windows]
```

### The Shell


### The Chrome

#### UI Elements
