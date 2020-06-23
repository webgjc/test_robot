(function injectCustomJs() {
	let jsPath = 'js/inject.js';
	let temp = document.createElement('script');
	temp.setAttribute('type', 'text/javascript');
	temp.src = chrome.extension.getURL(jsPath);
	document.head.appendChild(temp);
})();

function init_test_module() {
    let url = window.location.href;
    document.body.innerHTML = `
    <iframe src="${url}" style="border: none;border-right: solid 1px #ccc;position:fixed;top:0px;left:0px;width:${window.innerWidth*0.8}px;height:${window.innerHeight}px" id="page_content"></iframe>
    <iframe src="${chrome.extension.getURL("html/options.html")}" style="border: none;border-right: solid 1px #ccc;position:fixed;top:0px;right:0px;width:${window.innerWidth*0.2-2}px;height:${window.innerHeight}px" id="test_content"></iframe>`;
}

// 获取数据存储
function get_test_robot(keys, callback) {
    chrome.storage.local.get(keys, function(res) {
        if (callback) callback(res)
    })
}


// 设置数据存储
function set_test_robot(key, value, callback) {
    chrome.storage.local.set({[key]: value}, function() {
        if (callback) callback()
    })
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === "init_test_module") {
        init_test_module();
    }
});

window.addEventListener("message", function(e) {
    if(e.data.type === "get_test_robot"){
        get_test_robot(e.data.keys, data => {
            window.postMessage({
                type: "return_test_robot",
                data: data
            }, "*");
        });
    }
}, false);