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

function myrobot_scroll_position(dom) {
    let domposi = myrobot_getAbsPoint(dom);
    if (domposi.y < window.scrollY || domposi.y > (window.scrollY + window.innerHeight * 0.8) ||
        domposi.x < window.scrollX || domposi.x > (window.scrollX + window.innerWidth * 0.8)) {
        window.scrollTo(domposi.x - window.innerWidth / 2, domposi.y - window.innerHeight / 2);
    }
}

window.addEventListener("message", function(e) {
    if(e.data.type === "return_test_robot") {
        document.getElementById("test_content").contentWindow.postMessage({
            type: "inject_return_test_robot",
            data: e.data.data
        }, "*")
    }else if(e.data.type === "get_position") {
        console.log(e.data)
        let doc = document.getElementById("page_content").contentWindow.document;
        let dom = doc.querySelectorAll(e.data.tag)[e.data.n];
        console.log(dom);
        myrobot_scroll_position(dom);
        document.getElementById("test_content").contentWindow.postMessage({
            type: "return_get_position",
            x: dom.getBoundingClientRect().left + dom.getBoundingClientRect().width / 2 + window.screenLeft,
            y: dom.getBoundingClientRect().top + dom.getBoundingClientRect().height / 2 + window.screenTop + (window.outerHeight - window.innerHeight),
            opera: e.data.opera,
            value: e.data.value,
        }, "*");
    }
});