// from breakout rooms bot

function getStoreObservable(store) {
  return new rxjs.Observable((observer) => {
    const unsubscribe = store.subscribe(function () {
      observer.next(store.getState());
    });
  });
};

function chatboxSend(msg) {
  const chatboxElement = document.getElementsByClassName(
    "chat-box__chat-textarea"
  )[0];
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  nativeTextAreaValueSetter.call(chatboxElement, msg);
  chatboxElement.dispatchEvent(new Event("input", { bubbles: true }));

  const oEvent = document.createEvent("KeyboardEvent");
  // Chromium Hack
  Object.defineProperty(oEvent, "keyCode", {
    get: function () {
      return this.keyCodeVal;
    },
  });
  Object.defineProperty(oEvent, "which", {
    get: function () {
      return this.keyCodeVal;
    },
  });

  const k = 13;

  oEvent.initKeyboardEvent(
    "keydown",
    true,
    true,
    document.defaultView,
    k,
    k,
    "",
    "",
    false,
    ""
  );

  oEvent.keyCodeVal = k;

  chatboxElement.dispatchEvent(oEvent);
};

// helper functions

var names = [];
function parseNameList(nameList) {
  names = nameList.split("\n").map((line) => line.split("\t", 2)[1]);
};

function inNameList(displayName) {
  // change this function
  const res = stringSimilarity.findBestMatch(displayName, names);
  return res.bestMatch.rating >= 0.5;
};

function admit(admitId) {
  console.log(`Admitting ${admitId}`);
  window.commandSocket.send(
    JSON.stringify({
      evt: 4113,
      body: { bHold: false, id: admitId },
      seq: 0,
    })
  );
};

// rxjs

var store$ = getStoreObservable(
  document.getElementById("root")._reactRootContainer._internalRoot.current
    .child.pendingProps.store
);

var waitingRoom$ = store$.pipe(
  rxjs.operators.map((s) => s.attendeesList.attendeesList),
  rxjs.operators.map((list) =>
    list.reduce((res, user) => {
      if (user.bHold && inNameList(user.displayName)) res.push(user.userId);
      return res;
    }, [])
  ),
  rxjs.operators.scan((acc, list) => {
    return {
      old: new Set(list),
      res: acc !== undefined && list.filter((userId) => !acc.old.has(userId)),
    };
  }, undefined),
  rxjs.operators.map((acc) => acc.res),
  rxjs.operators.distinctUntilChanged(),
  rxjs.operators.filter((res) => res.length > 0),
  rxjs.operators.flatMap((res) => rxjs.from(res))
);

var admitTimeSlice$ = rxjs.interval(10);
var admitTimeSliceQueue$ = rxjs
  .zip(waitingRoom$, admitTimeSlice$)
  .pipe(rxjs.operators.map(([s, _d]) => s));

var admitSubscription = admitTimeSliceQueue$.subscribe((userId) => {
  try {
    admit(userId);
    chatboxSend(`admitted ${userId}`);
  } catch {}
});

// init

var chatPaneButton = document.querySelector(
  '[aria-label^="open the chat pane"]'
);
if (chatPaneButton) {
  chatPaneButton.click();
}

setTimeout(() => {
  parseNameList(nameList);
  chatboxSend("active!");
}, 100);
