#ifndef BREACH_HANDLER_H_
#define BREACH_HANDLER_H_

#include <include/cef_client.h>

class Handler : public CefClient {
  public:
    Handler() {};
    ~Handler() {};

    IMPLEMENT_REFCOUNTING(Handler);
};

#endif
