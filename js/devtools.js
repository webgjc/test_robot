// chrome.devtools.panels.create("TestRobot", "../images/alien.png", "../html/panel.html", function (panel) {
//     console.log('自定义面板创建成功！'); // 注意这个log一般看不到
// });


chrome.devtools.network.onRequestFinished.addListener(
    function (request) {
        if(request._resourceType === "xhr") {
            request.getContent(data => {
                chrome.runtime.sendMessage({
                    type: "API_EVENT",
                    content: {
                        url: request.request.url,
                        method: request.request.method,
                        data: data
                    }
                });
            })
        }
    });

// chrome.devtools.inspectedWindow.eval(`console.log("${request.request.url}", ${data})`);
// let backgroundPageConnection = chrome.runtime.connect({
//     name: "devtools-page"
// });
//
// backgroundPageConnection.onMessage.addListener(function (message) {
//     // Handle responses from the background page, if any
// });
//
// // Relay the tab ID to the background page
// chrome.runtime.sendMessage({
//     type: "OPEN_DEVTOOL",
//     tabId: chrome.devtools.inspectedWindow.tabId
// });


// chrome.devtools.panels.elements.createSidebarPane("Images", function(sidebar)
// {
// 	// sidebar.setPage('../sidebar.html'); // 指定加载某个页面
// 	sidebar.setExpression('document.querySelectorAll("img")', 'All Images'); // 通过表达式来指定
// 	//sidebar.setObject({aaa: 111, bbb: 'Hello World!'}); // 直接设置显示某个对象
// });

