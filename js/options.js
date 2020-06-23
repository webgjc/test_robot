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

// 运行流程事务
async function control_run(events, this_case_id) {
    let process = events.filter(item => item.case_id = this_case_id);
    console.log(process)
    for (let i = 0; i < process.length; i++) {
        await sleep(process[i].wait);
        if (process[i].opera === "click" || process[i].opera === "value" || process[i].opera === "mouseover") {
            window.parent.postMessage({
                type: "get_position",
                tag: process[i].tag,
                n: process[i].n,
                opera: process[i].opera,
                value: process[i].value,
            }, "*");
        }
    }
}


function render_projects(projects) {
    $("#projects")
        .html(projects
            .map((item, index) =>
                `<option value="${item.id}" selected=${index === 0}>${item.name}</option>`)
            .join(""))
        .material_select();
}

function get_test_robot(keys) {
    window.parent.postMessage({
        type: "get_test_robot",
        keys: keys
    }, "*");
}

function render_dashboard(data) {
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
                                <td><a href="#" class="runcase" id="runcase${cs.id}">运行</a></td>
                            </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </li>`;
        }).join(""));
    }
}

function render_events(data, case_id) {
    $("#events").html(data.filter(ev => ev.case_id === case_id)
        .map(ev => `<li>
            <div class="collapsible-header" id="event${ev.id}">
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
}

$(document).ready(function () {

    let this_case_id;
    let callback_type = "render_dashboard";
    get_test_robot([STORE_KEY.project, STORE_KEY.module, STORE_KEY.case]);


    window.addEventListener("message", function (e) {
        if (e.data.type === "inject_return_test_robot") {
            if (callback_type === "render_dashboard") {
                render_dashboard(e.data.data);
            } else if (callback_type === "render_events") {
                render_events(e.data.data[STORE_KEY.event], this_case_id);
            } else if (callback_type === "run_events") {
                control_run(e.data.data[STORE_KEY.event], this_case_id);
            }
        } else if (e.data.type === "return_get_position") {
            let postdata = {
                x: e.data.x,
                y: e.data.y,
                opera: e.data.opera,
                value: e.data.value
            };
            fetch("http://127.0.0.1:12580/webexec/", {
                method: "POST",
                body: JSON.stringify(postdata)
            })
        }
    }, false);

    $("select").material_select();

    $("#modules").on("click", ".case", function () {
        this_case_id = parseInt(this.id.slice(4));
        callback_type = "render_events";
        get_test_robot([STORE_KEY.event]);
        $("#dashboard").hide();
        $("#process").show();
    }).on("click", ".run_module", function (e) {
        e.preventDefault();
        e.stopPropagation();
    }).on("click", ".runcase", function () {
        this_case_id = parseInt(this.id.slice(7));
        callback_type = "run_events";
        get_test_robot([STORE_KEY.event]);
    });

    $("#new_event").click(function () {
        $("#process").hide();
        $("#selector").show();
    });

    $(".back_dashbaord").click(function () {
        $("#process").hide();
        $("#selector").hide();
        $("#event").hide();
        $("#dashboard").show();
    });

    $(".select_item").click(function () {
        $("#selector").hide();
        $("#event").show();
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

    connect_client(function () {
        console.log(1);
    })
});