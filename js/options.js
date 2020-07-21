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

Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "H+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

let data = {};

function record_case_run_result(record_data) {
    data.start_time = new Date().Format("yyyy-MM-dd HH:mm:ss");
    data.content = {
        project: {
            name: record_data.project,
            module: [{
                name: record_data.module,
                case: []
            }]
        },
    }
}

let RecordCase = {};

async function args_run(process, args, record_data) {
    RecordCase = null;
    record_case_run_result(record_data);
    if (args.length === 0) {
        RecordCase = {
            name: record_data.case,
            args: null,
            api: [],
            event: [],
        };
        await control_run(process);
    } else {
        for (let i = 0; i < args.length; i++) {
            let process_bak = JSON.parse(JSON.stringify(process));
            process_bak.forEach(pb => {
                if (pb.value && pb.value.startsWith("${") && pb.value.endsWith("}")) {
                    pb.value = args[i][pb.value.slice(2, -1)];
                }
            });
            if (i !== 0) {
                await sleep(process_bak.map(pb => pb.wait)
                    .reduce((a, b) => parseFloat(a) + parseFloat(b)));
            }
            RecordCase = {
                name: record_data.case,
                args: args[i],
                api: [],
                event: [],
            };
            await control_run(process_bak);
        }
    }
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
                RecordCase.event.push({
                    name: process[i].name,
                    detail: process[i],
                });
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
                RecordCase.event.push({
                    name: process[i].name,
                    detail: process[i],
                });
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
                    RecordCase.event.push({
                        name: process[i].name,
                        detail: process[i],
                        result: msg.result
                    });
                })
            }
        }
        await (() => {data.end_time = new Date().Format("yyyy-MM-dd HH:mm:ss")})();
        data.content.project.module[0].case.push(JSON.parse(JSON.stringify(RecordCase)));
        console.log(data);
        // await console.log(JSON.stringify(RecordCase));
    });
}


async function module_run(module_id) {
    await get_test_robot_batch([STORE_KEY.module, STORE_KEY.case, STORE_KEY.event], async function (data) {
        let module = data[STORE_KEY.module].filter(m => m.id === module_id)[0];
        let cases = data[STORE_KEY.case].filter(c => c.module_id === module.id);
        for (let i = 0; i < cases.length; i++) {
            let process = data[STORE_KEY.event].filter(e => e.case_id === cases[i].id);
            if (i > 0) {
                let last_process = data[STORE_KEY.event].filter(e => e.case_id === cases[i - 1].id);
                await sleep(last_process.map(pb => pb.wait)
                    .reduce((a, b) => parseFloat(a) + parseFloat(b)));
            }
            await args_run(process, cases[i].args);
        }
    })
}


async function project_run(project_id) {
    await get_test_robot_batch([STORE_KEY.project, STORE_KEY.module, STORE_KEY.case, STORE_KEY.event], async function (data) {
        let project = data[STORE_KEY.project].filter(p => p.id === project_id)[0];
        let modules = data[STORE_KEY.module].filter(m => m.project_id === project.id);
        for (let i = 0; i < modules.length; i++) {
            if (i > 0) {
                let cases = data[STORE_KEY.case].filter(c => c.module_id === modules[i - 1].id);
                let sleep_time = 0;
                for (let i = 0; i < cases.length; i++) {
                    sleep_time += data[STORE_KEY.event].filter(e => e.case_id === cases[i].id).map(e => e.wait)
                        .reduce((a, b) => parseFloat(a) + parseFloat(b)) * (cases[i].args.length > 0 ? cases[i].args.length : 1);
                }
                await sleep(sleep_time);
            }
            await module_run(modules[i].id);
        }
    })
}

function render_projects(projects, select_id) {
    $("#projects")
        .html(projects
            .map(p =>
                `<option value="${p.id}" selected=${p.id === select_id}>${p.name}</option>`)
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

function render_dashboard(project_id, callback) {
    let project;
    get_test_robot_batch([STORE_KEY.project, STORE_KEY.module, STORE_KEY.case], data => {
        let ps = data[STORE_KEY.project];
        if (ps.length > 0) {
            let this_project_id = project_id === undefined ? ps[0].id : project_id;
            project = ps.filter(p => p.id === this_project_id)[0];
            if (project_id === undefined) render_projects(ps, this_project_id);
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
            if (callback) callback(project);
        }
    });
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
    $("#selector_dom_item").html(nums
        .map(i => `<a href="#" class="collection-item select_item">${selector}&${i}</a>`)
        .join(""));
}

$(document).ready(function () {

    let this_case_id;
    let callback_type = "render_dashboard";
    let new_event_name = "test";
    let edit_event_id = undefined;

    let run_project_id;
    let run_project_name;
    let run_module_name;
    let run_case_name;

    render_dashboard(undefined, function (project) {
        run_project_id = project.id;
        run_project_name = project.name;
    });

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
        let module_id = parseInt(this.id.slice(6));
        module_run(module_id);
        e.preventDefault();
        e.stopPropagation();
    }).on("click", ".run_case", function () {
        this_case_id = parseInt(this.id.slice(7));
        callback_type = "run_events";
        get_test_robot_batch([STORE_KEY.module, STORE_KEY.case, STORE_KEY.event], data => {
            let tmp = data[STORE_KEY.case].filter(c => c.id === this_case_id)[0];
            run_case_name = tmp.name;
            run_module_name = data[STORE_KEY.module].filter(m => m.id === tmp.module_id)[0].name;
            args_run(data[STORE_KEY.event].filter(ev => ev.case_id === this_case_id), tmp.args,
                {project: run_project_name, module: run_module_name, case: run_case_name});
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
            $("#new_event_name").val(tmp.name);
            $("#modal1").modal("open");
            Materialize.updateTextFields();
        })
    });

    $("#add_event").click(function () {
        edit_event_id = undefined;
    });

    $("#new_event").click(function () {
        if (edit_event_id === undefined) {
            new_event_name = $("#new_event_name").val();
            $("#process").hide();
            $("#selector").show();
        } else {
            get_test_robot(STORE_KEY.event, data => {
                let tmp = data.filter(d => d.id === edit_event_id)[0];
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
        }
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
        render_dashboard(parseInt($(this).val()), function (project) {
            run_project_name = project.name;
            run_project_id = project.id;
        });
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

    $("#selected_dom").click(function () {
        $("#selector").show();
        $("#event").hide();
    });

    $("#select_opera").change(function () {
        if (["value", "check"].indexOf($(this).val()) !== -1) {
            $("#set_value_input").show();
            if ($(this).val() === "check") {
                $("#set_check_input").show();
            }
        } else {
            $("#set_check_input").hide();
            $("#set_value_input").hide();
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
    });

    $("#run-all").click(function () {
        project_run(run_project_id);
    });

});


chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === "SELECT_DOM") {
        render_select_dom_list(msg.tag, [msg.n]);
    } else if (msg.type === "API_EVENT") {
        // console.log(msg.content);
        RecordCase.api.push(msg.content);
    }
});