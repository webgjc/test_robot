const STORE_KEY = {
    project: "test_robot_projects",
    module: "test_robot_modules",
    case: "test_robot_cases",
    event: "test_robot_events"
};

const local_client_host = "http://127.0.0.1:12580/";

function connect_client(callback) {
    fetch(local_client_host)
        .then(() => {
            callback();
        })
        .catch(() => {
            alert("本地WEB客户端连接失败");
        });
}

// 等待
function sleep(s) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, s * 1000);
    })
}

function connect(callback) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        callback(tabs[0].id)
    });
}

function send_msg(msg, callback) {
    connect((tab_id) => {
        chrome.tabs.sendMessage(tab_id, msg, (res) => {
            callback(res);
        });
    })
}

// 运行流程事务
async function control_run(process) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, async function (tabs) {
        for (let i = 0; i < process.length; i++) {
            await sleep(process[i].wait);
            if (process[i].opera === "click" || process[i].opera === "value") {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "get_position",
                    tag: process[i].tag,
                    n: process[i].n,
                }, function (msg) {
                    let postdata = {
                        x: msg.x,
                        y: msg.y,
                        opera: process[i].opera,
                        value: process[i].value
                    };
                    connect_client(() => {
                        fetch("http://127.0.0.1:12580/webexec/", {
                            method: "POST",
                            body: JSON.stringify(postdata)
                        })
                    });
                })
            } else if (process[i].opera === "refresh") {
                send_msg({
                    type: "refresh_window"
                })
            } else if (process[i].opera === "check") {
                send_msg({
                    type: "check_dom",
                    tag: process[i].tag,
                    n: process[i].n,
                    check: process[i].check,
                    value: process[i].value
                }, function (msg) {
                    alert(msg.result);
                })
            }
        }
    });
}


function render_projects(projects) {
    $("#projects")
        .html(projects
            .map((item, index) =>
                `<option value="${item.id}" selected=${index === 0}>${item.name}</option>`)
            .join(""))
        .material_select();
}

// function get_test_robot(keys) {
//     window.parent.postMessage({
//         type: "get_test_robot",
//         keys: keys
//     }, "*");
// }

// 批量获取数据存储
function get_test_robot_batch(keys, callback) {
    chrome.storage.local.get(keys, function (res) {
        if (callback) callback(res)
    })
}

// 获取数据存储
function get_test_robot(key, callback) {
    chrome.storage.local.get(key, function (res) {
        if (callback) callback(res[key])
    })
}

// 设置数据存储
function set_test_robot(key, value, callback) {
    chrome.storage.local.set({
        [key]: value
    }, function () {
        if (callback) callback()
    })
}

function render_dashboard() {
    get_test_robot_batch([STORE_KEY.project, STORE_KEY.module, STORE_KEY.case], data => {
        let ps = data[STORE_KEY.project];
        if (ps.length > 0) {
            let this_project_id = ps[0].id;
            render_projects(ps);
            let modules = data[STORE_KEY.module].filter(m => m.project_id === this_project_id);
            let module_ids = modules.map(m => m.id);
            let mdata = {
                modules: modules,
                cases: data[STORE_KEY.case].filter(c => module_ids.indexOf(c.module_id) !== -1)
            };
            $("#modules").html(mdata.modules.map(module => {
                let cases = mdata.cases.filter(cs => cs.module_id === module.id);
                return `<li>
                    <div class="collapsible-header">
                        <span class="new badge run_module" data-badge-caption="运行" id="module${module.id}"></span>
                        <span class="new badge" data-badge-caption="用例">${cases.length}</span>
                        ${module.name}
                    </div>
                    <div class="collapsible-body">
                        <table class="bordered centered">
                            <tbody>
                                ${cases.map(cs => `<tr>
                                    <td><a href="#" class="case" id="case${cs.id}">${cs.name}</a></td>
                                    <td><a href="#" class="run_case" id="runcase${cs.id}">运行</a></td>
                                </tr>`).join("")}
                            </tbody>
                        </table>
                    </div>
                </li>`;
            }).join(""));
        }
    })
}

function render_events(case_id) {
    get_test_robot(STORE_KEY.event, data => {
        $("#events").html(data.filter(ev => ev.case_id === case_id)
            .map(ev => `<li>
            <div class="collapsible-header" id="event-${ev.id}">
                ${ev.name}
            </div>
            <div class="collapsible-body">
                <div class="row process_item_detail">
                    <div class="col s6">筛选器：${ev.tag}</div>
                    <div class="col s6">第n个：${ev.n}</div>
                </div>
                <div class="row process_item_detail">
                    <div class="col s6">操作：${ev.opera}</div>
                    <div class="col s6">延时：${ev.wait}</div>
                </div>
                <div class="row process_item_detail">
                    <div class="col s12">操赋值：${ev.value}</div>
                </div>
                <div class="row process_item_detail" style="margin-bottom: 10px;">
                    <a href="# ">
                        <div class="col process_test_run">运行</div>
                    </a>
                    <a href="#">
                        <div class="col process_edit">编辑</div>
                    </a>
                    <a href="#">
                        <div class="col process_del">删除</div>
                    </a>
                </div>
            </div>
        </li>`).join(""));
    });
}

function render_select_dom_list(selector, nums) {
    console.log(nums);
    $("#selector_dom_item").html(nums
        .map(i => `<a href="#" class="collection-item select_item">${selector}&${i}</a>`)
        .join(""));
}

$(document).ready(function () {

    let this_case_id;
    let callback_type = "render_dashboard";
    let new_event_name = "test";
    let edit_event_id = undefined;
    render_dashboard();

    $('.modal').modal();
    $("select").material_select();

    // $("#dashboard").hide();
    // $("#process").hide();
    // $("#selector").show();

    // window.addEventListener("message", function (e) {
    //     if (e.data.type === "return_get_position") {
    //         let postdata = {
    //             x: e.data.x,
    //             y: e.data.y,
    //             opera: e.data.opera,
    //             value: e.data.value
    //         };
    //         fetch("http://127.0.0.1:12580/webexec/", {
    //             method: "POST",
    //             body: JSON.stringify(postdata)
    //         })
    //     } else if (e.data.type === "select_dom_list") {
    //         render_select_dom_list(e.data.selector, e.data.nums);
    //     } else if (e.data.type === "add_new_event_finish") {
    //         console.log("add_new_event_finish");
    //     }
    // }, false);

    $("#modules").on("click", ".case", function () {
        this_case_id = parseInt(this.id.slice(4));
        render_events(this_case_id);
        $("#dashboard").hide();
        $("#process").show();
    }).on("click", ".run_module", function (e) {
        e.preventDefault();
        e.stopPropagation();
    }).on("click", ".run_case", function () {
        this_case_id = parseInt(this.id.slice(7));
        callback_type = "run_events";
        get_test_robot(STORE_KEY.event, data => {
            control_run(data.filter(ev => ev.case_id === this_case_id));
        });
    });

    $("#events").on("click", ".process_del", function () {
        let event_id = parseInt($(this).parent().parent().parent().prev().attr("id").split("-")[1]);
        get_test_robot(STORE_KEY.event, data => {
            for (let i = 0; i < data.length; i++) {
                if (data[i].id === event_id) {
                    data.splice(i, 1);
                    break;
                }
            }
            set_test_robot(STORE_KEY.event, data, () => render_events(this_case_id));
        })
    }).on("click", ".process_test_run", function () {
        let event_id = parseInt($(this).parent().parent().parent().prev().attr("id").split("-")[1]);
        get_test_robot(STORE_KEY.event, data => control_run(data.filter(d => d.id === event_id)));
    }).on("click", ".process_edit", function () {
        let event_id = parseInt($(this).parent().parent().parent().prev().attr("id").split("-")[1]);
        edit_event_id = event_id;
        get_test_robot(STORE_KEY.event, data => {
            let tmp = data.filter(d => d.id === event_id)[0];
            $("#process").hide();
            $("#event").show();
            $("#selected_dom").text(`已选元素：${tmp.tag}&${tmp.n}`).attr("data", `${tmp.tag}&${tmp.n}`);
            $("#select_opera").val(tmp.opera);
            $("#set_value").val(tmp.value);
            $('#select_opera').material_select();
            Materialize.updateTextFields();
            if (["value", "check"].indexOf(tmp.opera) !== -1) {
                $("#set_value_input").show();
                if (tmp.opera === "check") {
                    $("#set_check_input").show();
                }
            } else {
                $("#set_value_input").hide();
                $("#select_check_opera").hide();
            }
        })
    });

    $("#new_event").click(function () {
        new_event_name = $("#new_event_name").val();
        edit_event_id = undefined;
        $("#process").hide();
        $("#selector").show();
    });

    $(".back_dashbaord").click(function () {
        $("#process").hide();
        $("#selector").hide();
        $("#event").hide();
        $("#dashboard").show();
    });

    $(".back_process").click(function () {
        $("#selector").hide();
        $("#event").hide();
        $("#dashboard").hide();
        $("#process").show();
    });

    $("#projects").change(function () {
        console.log($(this).val())
    });

    $("#queryselect").change(function () {
        let vl = $(this).val();
        connect(function (tab_id) {
            chrome.tabs.sendMessage(tab_id, {
                type: "select_dom",
                selector: vl,
            }, function (msg) {
                render_select_dom_list(vl, msg.nums);
            })
        });
    });

    $("#selector_dom_item").on("mouseover", ".select_item", function () {
        let info = $(this).text().split("&");
        send_msg({
            type: "select_canvas_dom",
            tag: info[0],
            n: parseInt(info[1])
        })
    });

    $("#selector_dom_item").on("click", ".select_item", function () {
        $("#selected_dom").text(`已选元素：${$(this).text()}`);
        $("#selected_dom").attr("data", $(this).text());
        $("#selector").hide();
        $("#event").show();
    });

    $("#select_opera").change(function () {
        if (["value", "check"].indexOf($(this).val()) !== -1) {
            $("#set_value_input").show();
            if ($(this).val() === "check") {
                $("#set_check_input").show();
            }
        } else {
            $("#set_value_input").hide();
            $("#select_check_opera").hide();
        }
    });

    $("#submit_event").click(function () {
        let selector = $("#selected_dom").attr("data").split("&");
        get_test_robot(STORE_KEY.event, data => {
            let tmp = {
                "id": +new Date(),
                "case_id": this_case_id,
                "name": new_event_name,
                "tag": selector[0],
                "n": selector[1],
                "opera": $("#select_opera").val(),
                "wait": $("#num_wait").val(),
                "value": ["value", "check"].indexOf($("#select_opera").val()) !== -1 ? $("#set_value").val() : "",
                "check": $("#select_opera").val() === "check" ? $("#select_check_opera").val() : "",
            };
            if (edit_event_id === undefined) {
                data.push(tmp);
            } else {
                for (let i = 0; i < data.length; i++) {
                    if (data[i].id === edit_event_id) {
                        data[i] = tmp;
                    }
                }
            }
            set_test_robot(STORE_KEY.event, data, () => {
                render_events(this_case_id);
            });

        });
    });
    
    $(".direct_select").click(function () {
        send_msg({
            type: "start_direct_select"
        })
    })

});