/**
 * {
 *     "projects": [
 *         {
 *             "id": "项目id",
 *             "name": "项目名"
 *         }
 *     ],
 *     "modules": [
 *         {
 *             "id": "模块id",
 *             "project_id": "项目id",
 *             "name": "模块名",
 *         }
 *     ],
 *     "cases": [
 *         {
 *             "id": "用例id",
 *             "module_id": "模块id",
 *             "name": "用例名"
 *         }
 *     ],
 *     "events": [
 *         {
 *             "id": "事件id",
 *             "case_id": "用例id",
 *             "name": "事件名",
 *             "tag": "选择器",
 *             "n": "选择器第n",
 *             "opera": "操作",
 *             "wait": "延时",
 *             "value": "设值"
 *         }
 *     ]
 * }
 */

const STORE_KEY = {
    project: "test_robot_projects",
    module: "test_robot_modules",
    case: "test_robot_cases",
    event: "test_robot_events"
};

// 获取数据存储
function get_test_robot(key, callback) {
    chrome.storage.local.get(key, function(res) {
        if (callback) callback(res[key])
    })
}

// 设置数据存储
function set_test_robot(key, value, callback) {
    chrome.storage.local.set({[key]: value}, function() {
        if (callback) callback()
    })
}

function get_project_module_case(project_id, callback) {
    chrome.storage.local.get([STORE_KEY.module, STORE_KEY.case], function(res) {
        let data = {};
        data.modules = res[STORE_KEY.module].filter(item => item.project_id === project_id);
        let module_ids = data.modules.map(m => m.id);
        data.cases = res[STORE_KEY.case].filter(item => module_ids.indexOf(item.module_id) !== -1);
        if(callback) callback(data);
    });
}

function render_projects(projects) {
    $("#projects")
        .html(projects
            .map((item,index) =>
                `<option value="${item.id}" selected=${index===0}>${item.name}</option>`)
            .join(""))
        .material_select();
}


$(document).ready(function () {
    // chrome.tabs.create({
    //     url: "/html/options.html"
    // });
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: "init_test_module"
        }, function (msg) {
            window.close();
        })
    });

    const SIM_DATA = {
        "test_robot_projects": [
            {
                "id": 1,
                "name": "测试项目",
            },
            {
                "id": 2,
                "name": "测试项目2",
            }
        ],
        "test_robot_modules": [
            {
                "id": 1,
                "project_id": 1,
                "name": "用户模块"
            },
            {
                "id": 2,
                "project_id": 1,
                "name": "文件夹模块"
            }
        ],
        "test_robot_cases": [
            {
                "id": 1,
                "module_id": 1,
                "name": "用例1"
            },
            {
                "id": 2,
                "module_id": 1,
                "name": "用例2"
            },
            {
                "id": 3,
                "module_id": 1,
                "name": "用例3"
            },
            {
                "id": 4,
                "module_id": 2,
                "name": "用例asd"
            }
        ],
        "test_robot_events": [
            {
                "id": 1,
                "case_id": 1,
                "name": "设值",
                "tag": "input",
                "n": 7,
                "opera": "value",
                "wait": 3,
                "value": "天气",
            },
            {
                "id": 2,
                "case_id": 1,
                "name": "点击搜索",
                "tag": "input",
                "n": 8,
                "opera": "click",
                "wait": 3,
                "value": "",
            }
        ]
    };

    for(let i in SIM_DATA) {
        set_test_robot(i, SIM_DATA[i]);
    }

    let this_project_id;

    get_test_robot(STORE_KEY.project, data => {
        if(data.length > 0) {
            this_project_id = data[0].id;
            render_projects(data);
            get_project_module_case(this_project_id, data => {
                $("#modules").html(data.modules.map(module => {
                    let cases = data.cases.filter(cs => cs.module_id === module.id);
                    return `<li>
                        <div class="collapsible-header">
                            <span class="new badge run_module" data-badge-caption="运行"></span>
                            <span class="new badge" data-badge-caption="用例">${cases.length}</span>
                            ${module.name}
                        </div>
                        <div class="collapsible-body">
                            <table class="bordered centered">
                                <tbody>
                                    ${cases.map(cs => `<tr>
                                        <td><a href="#" class="case" id="case${cs.id}">${cs.name}</a></td>
                                        <td><a href="#">运行</a></td>
                                    </tr>`).join("")}
                                </tbody>
                            </table>
                        </div>
                    </li>`;
                }).join(""));
            })
        }
    });

    $("select").material_select();

    $("#modules").on("click", ".case", function() {
        let case_id = parseInt(this.id.slice(4));
        get_test_robot(STORE_KEY.event, data => {
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
        });
        $("#dashboard").hide();
        $("#process").show();
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

    $(".run_module").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    $("#projects").change(function() {
        console.log($(this).val())
    })
})