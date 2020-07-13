
let devtoolState;

chrome.runtime.onConnect.addListener(function(devToolsConnection) {

    let devToolsListener = function(msg, sender, sendResponse) {
        devtoolState = true;
    };

    devToolsConnection.onMessage.addListener(devToolsListener);

    devToolsConnection.onDisconnect.addListener(function() {
         devToolsConnection.onMessage.removeListener(devToolsListener);
         devtoolState = false;
    });

});


chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    d
});