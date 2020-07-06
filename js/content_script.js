(function injectCustomJs() {
    let jsPath = 'js/inject.js';
    let temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.src = chrome.extension.getURL(jsPath);
    document.head.appendChild(temp);
})();

function init_test_module() {
    // let body = document.body.innerHTML;
    let url = window.location.href;
    // body = `<div class="teest_robot_content"
    // style="width: calc(100vw - 200px);height: 100vh;position: relative;overflow: scroll">${body}</div>`;
    // body += `<iframe src="${chrome.extension.getURL("html/options.html")}"
    // style="border: none;
    // border-left: solid 1px #ccc;
    // position: fixed;
    // top: 0;
    // right: 0;
    // z-index: 999;
    // width: 200px;
    // height: 100vh" id="test_content"></iframe>`;
    // document.body.innerHTML = body;
    // let dom = document.createElement("div");
    // dom.style.cssText = "width: calc(100vw - 200px); height: 100vh; position: relative; overflow: scroll";
    // for (let i = 0; i < document.body.children.length; i++) {
    //     let node = document.body.children[i];
    //     if (node.parentNode) {
    //         node.parentNode.replaceChild(dom, node)
    //     }
    //     // console.log(node)
    //     if (node.nodeType === 1) {
    //         dom.appendChild(node)
    //     }
    // }
    let main_iframe = document.createElement("iframe");
    main_iframe.src = url;
    main_iframe.style.cssText = "width: calc(100vw - 200px);height: 100vh;position: fixed; left: 0;overflow: scroll";
    main_iframe.id = "main_iframe";
    document.body.innerHTML = "";
    document.body.appendChild(main_iframe);

    let iframe = document.createElement("iframe");
    iframe.src = chrome.extension.getURL('html/options.html');
    iframe.style.cssText = "border: none; border-left: solid 1px #ccc; background: white; position: fixed; top: 0; right: 0; z-index: 9999; width: 200px; height: 100vh";
    iframe.id = "test_iframe";
    document.body.appendChild(iframe);

}

// 获取数据存储
function get_test_robot(key, callback) {
    chrome.storage.local.get(key, function (res) {
        if (callback) callback(res[key])
    })
}


// 设置数据存储
function set_test_robot(key, value, callback) {
    chrome.storage.local.set({[key]: value}, function () {
        if (callback) callback()
    })
}


function robot_make_select_canvass(dom) {
    let wind = document.getElementById("main_iframe").contentWindow;
    let doc = wind.document;
    myrobot_scroll_position(wind, dom);
    let canvas = doc.createElement("div");
    canvas.id = "robot_select";
    canvas.style.backgroundColor = "red";
    canvas.style.width = dom.offsetWidth + 4 + "px";
    canvas.style.height = dom.offsetHeight + 4 + "px";
    canvas.style.position = "fixed";
    canvas.style.opacity = "0.5";
    canvas.style.zIndex = 9998;
    canvas.style.left = parseInt(dom.getBoundingClientRect().left) - 2 + "px";
    canvas.style.top = parseInt(dom.getBoundingClientRect().top) - 2 + "px";
    doc.body.appendChild(canvas);
    setTimeout(function () {
        doc.getElementById("robot_select").remove();
    }, 1000);
}

function myrobot_getAbsPoint(dom) {
    let x = dom.offsetLeft;
    let y = dom.offsetTop;
    while (dom.offsetParent) {
        dom = dom.offsetParent;
        x += dom.offsetLeft;
        y += dom.offsetTop;
    }
    return {
        'x': x,
        'y': y
    };
}

function myrobot_scroll_position(window, dom) {
    let domposi = myrobot_getAbsPoint(dom);
    if (domposi.y < window.scrollY || domposi.y > (window.scrollY + window.innerHeight * 0.8) ||
        domposi.x < window.scrollX || domposi.x > (window.scrollX + window.innerWidth * 0.8)) {
        window.scrollTo(domposi.x - window.innerWidth / 2, domposi.y - window.innerHeight / 2);
    }
}


function check_dom_value(dom, opera, value) {
    if(dom.innerText === value) {
        return opera === "in";
    }else{
        for(let i = 0; i<dom.children.length;i++) {
            if(check_dom_value(dom.children[i], opera, value)){
                return opera === "in";
            }
        }
    }
    return opera !== "in";
}

function get_main_doc() {
    return document.getElementById("main_iframe").contentWindow.document;
}

init_test_module();

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === "init_test_module") {
        init_test_module();
    } else if (msg.type === "get_position") {
        let wind = document.getElementById("main_iframe").contentWindow;
        let posidom = wind.document.querySelectorAll(msg.tag)[msg.n];
        myrobot_scroll_position(wind, posidom);
        sendResponse({
            type: msg.type,
            x: posidom.getBoundingClientRect().left + posidom.getBoundingClientRect().width / 2 + window.screenLeft,
            y: posidom.getBoundingClientRect().top + posidom.getBoundingClientRect().height / 2 + window.screenTop + (window.outerHeight - window.innerHeight)
        });
    } else if (msg.type === "get_value") {
        sendResponse({
            type: msg.type,
            data: posidom.innerText
        })
    } else if (msg.type === "select_dom") {
        let doc = document.getElementById("main_iframe").contentWindow.document;
        let doms = doc.querySelectorAll(msg.selector);
        let nums = Array();
        for (let i = 0; i < doms.length; i++) {
            if (doms[i].offsetHeight > 0 && doms[i].offsetWidth > 0) {
                nums.push(i);
            }
        }
        sendResponse({
            type: msg.type,
            nums: nums
        })
    } else if (msg.type === "select_canvas_dom") {
        let doc = document.getElementById("main_iframe").contentWindow.document;
        robot_make_select_canvass(doc.querySelectorAll(msg.tag)[msg.n]);
    } else if (msg.type === "refresh_window") {
        document.getElementById("main_iframe").contentWindow.location.reload();
    } else if (msg.type === "check_dom") {
        let doc = document.getElementById("main_iframe").contentWindow.document;
        let dom = doc.querySelectorAll(msg.tag)[msg.n];
        sendResponse({
            type: msg.type,
            result: check_dom_value(dom, msg.check, msg.value)
        })
    } else if(msg.type === "start_direct_select") {
        let doc = get_main_doc();
    }
});