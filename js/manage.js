// 存储key
const STORE_KEY = {
    project: "test_robot_projects", // 项目
    module: "test_robot_modules", // 模块
    case: "test_robot_cases", // 用例
    event: "test_robot_events" // 事件
};

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


function init() {
    set_test_robot(STORE_KEY.project, []);
    set_test_robot(STORE_KEY.module, []);
    set_test_robot(STORE_KEY.event, []);
    set_test_robot(STORE_KEY.case, []);
}


function render_project() {
    get_test_robot(STORE_KEY.project, data => {
        if(data === undefined) {
            init();
        }
        $("#project-table-body").html(data.map(p => `
            <tr id="project-${p.id}">
                <td><a href="#" class="project-detail">${p.name}</a></td>
                <td>
                    <a href="#edit-module-modal" class="add-module">添加模块</a>
                    <a href="#edit-project-modal" class="edit-project">编辑</a>
                    <a href="#" class="move-up-project">上移</a>
                    <a href="#" class="del-project">删除</a>
                </td>
            </tr>
        `).join(""));
    })
}

function render_module(project_id) {
    get_test_robot(STORE_KEY.module, data => {
        $("#module-table-body").html(data
            .filter(m => m.project_id === project_id)
            .map(m => `
                <tr id="module-${m.id}">
                    <td><a href="#" class="module-detail">${m.name}</a></td>
                    <td>
                        <a href="#edit-case-modal" class="add-case">添加用例</a>
                        <a href="#edit-module-modal" class="edit-module">编辑</a>
                        <a href="#" class="move-up-module">上移</a>
                        <a href="#" class="del-module">删除</a>
                    </td>
                </tr>
            `).join(""))
    })
}

function render_case(module_id) {
    get_test_robot(STORE_KEY.case, data => {
        $("#case-table-body").html(data
            .filter(c => c.module_id === module_id)
            .map(c => `
                <tr id="case-${c.id}">
                    <td><a href="#" class="case-detail">${c.name}</a></td>
                    <td>${c.args_key.join(",")}</td>
                    <td>
                        <a href="#edit-event-modal" class="add-event">添加事件</a>
                        <a href="#edit-args-modal" class="add-args">添加用例参数</a>
                        <a href="#edit-case-modal" class="edit-case">编辑</a>
                        <a href="#" class="move-up-case">上移</a>
                        <a href="#" class="copy-case">复制</a>
                        <a href="#" class="del-case">删除</a>
                    </td>
                </tr>
            `).join(""))
    })
}

function render_event(case_id) {
    get_test_robot(STORE_KEY.event, data => {
        $("#event-table-body").html(data
            .filter(e => e.case_id === case_id)
            .map(e => `
                <tr id="event-${e.id}">
                    <td>${e.name}</td>
                    <td>${e.tag}</td>
                    <td>${e.n}</td>
                    <td>${e.opera}</td>
                    <td>${e.wait}</td>
                    <td>${e.value}</td>
                    <td>
                        <a href="#" class="edit-event">编辑</a>
                        <a href="#" class="move-up-event">上移</a>
                        <a href="#" class="copy-event">复制</a>
                        <a href="#" class="del-event">删除</a>
                    </td>
                </tr>
            `))
    })
}

function render_args(case_id) {
    get_test_robot(STORE_KEY.case, data => {
        let tmp = data.filter(c => c.id === case_id)[0];
        $("#args-table-head").html(`
            <tr>
                ${tmp.args_key.map(ak => `<th>${ak}</th>`).join("")}
                <th>操作</th>
            </tr>
        `);
        $("#args-table-body").html(tmp.args.map((as, i) => `
            <tr id="args-${i}">
                ${tmp.args_key.map(ak => `<td>${as[ak]}</td>`)}
                <td>
                    <a href="#edit-args-modal" class="edit-args">编辑</a>
                    <a href="#" class="move-up-args">上移</a>
                    <a href="#" class="copy-args">复制</a>
                    <a href="#" class="del-args">删除</a>
                </td>
            </tr>
        `));
    });
}

function exchange(data, id, prev_id, callback) {
    let index, prev_index;
    data.forEach((p, i) => {
        if (p.id === id) {
            index = i;
        } else if (p.id === prev_id) {
            prev_index = i;
        }
    });
    if (index !== undefined && prev_index !== undefined) {
        let tmp = data[index];
        data[index] = data[prev_index];
        data[prev_index] = tmp;
        callback()
    }
}

function delete_record(module_key, id, callback) {
    get_test_robot(module_key, data => {
        for (let i = 0; i < data.length; i++) {
            if (data[i].id === id) {
                data.splice(i, 1);
                break;
            }
        }
        set_test_robot(module_key, data, () => {
            callback();
        });
    })
}

function opera_get_id(dom) {
    return parseInt($(dom).parent().parent().attr("id").split("-")[1]);
}

$(document).ready(function () {

    render_project();
    $('.modal').modal();
    let project_id, module_id, case_id, event_id, project_new, module_new, case_new, args_index, args_new;

    $("#project-table-body").on("click", ".project-detail", function () {
        project_id = opera_get_id(this);
        render_module(project_id);
    }).on("click", ".edit-project", function () {
        project_new = false;
        project_id = opera_get_id(this);
        $("#project-name-input").val($(this).parent().prev().text());
        Materialize.updateTextFields();
    }).on("click", ".add-module", function () {
        $("#module-name-input").val("");
        project_id = opera_get_id(this);
        module_new = true;
    }).on("click", ".move-up-project", function () {
        let tr = $(this).parent().parent();
        if (tr.prev().length === 1) {
            get_test_robot(STORE_KEY.project, data => {
                let id = parseInt(tr.attr("id").split("-")[1]);
                let prev_id = parseInt(tr.prev().attr("id").split("-")[1]);
                exchange(data, id, prev_id, () => {
                    set_test_robot(STORE_KEY.project, data, function () {
                        render_project();
                    });
                });
            });
        }
    }).on("click", ".del-project", function () {
        if(confirm("确认删除？")) {
            project_id = opera_get_id(this);
            delete_record(STORE_KEY.project, project_id, () => render_project());
        }
    });

    $("#module-table-body").on("click", ".module-detail", function () {
        module_id = opera_get_id(this);
        render_case(module_id);
    }).on("click", ".edit-module", function () {
        module_new = false;
        module_id = opera_get_id(this);
        $("#module-name-input").val($(this).parent().prev().text());
        Materialize.updateTextFields();
    }).on("click", ".add-case", function () {
        case_new = true;
        module_id = opera_get_id(this);
    }).on("click", ".move-up-module", function () {
        let tr = $(this).parent().parent();
        if (tr.prev().length === 1) {
            get_test_robot(STORE_KEY.module, data => {
                let id = parseInt(tr.attr("id").split("-")[1]);
                let prev_id = parseInt(tr.prev().attr("id").split("-")[1]);
                exchange(data, id, prev_id, () => {
                    set_test_robot(STORE_KEY.module, data, () => {
                        render_module(project_id);
                    })
                })
            })
        }
    }).on("click", ".del-module", function () {
        if(confirm("确认删除?")) {
            module_id = opera_get_id(this);
            delete_record(STORE_KEY.module, module_id, () =>
                render_module(project_id));
        }
    });

    $("#case-table-body").on("click", ".case-detail", function (e) {
        e.preventDefault();
        case_id = opera_get_id(this);
        render_event(case_id);
        render_args(case_id);
    }).on("click", ".edit-case", function () {
        case_id = opera_get_id(this);
        case_new = false;
        $("#case-name-input").val($(this).parent().prev().prev().text());
        $("#case-args-input").val($(this).parent().prev().text());
        Materialize.updateTextFields();
    }).on("click", ".move-up-case", function () {
        let tr = $(this).parent().parent();
        if (tr.prev().length === 1) {
            get_test_robot(STORE_KEY.case, data => {
                let id = parseInt(tr.attr("id").split("-")[1]);
                let prev_id = parseInt(tr.prev().attr("id").split("-")[1]);
                exchange(data, id, prev_id, () => {
                    set_test_robot(STORE_KEY.case, data, () => {
                        render_case(module_id);
                    })
                })
            })
        }
    }).on("click", ".del-case", function () {
        if(confirm("确认删除?")) {
            case_id = opera_get_id(this);
            delete_record(STORE_KEY.case, case_id, () =>
                render_case(module_id));
        }
    }).on("click", ".add-args", function () {
        args_new = true;
        get_test_robot(STORE_KEY.case, data => {
            let tmp = data.filter(c => c.id === case_id)[0];
            $("#edit-args-modal-content").html(tmp.args_key.map((item, i) => `
                <div class="input-field col s6">
                    <input id="args-${i}-input" type="text">
                    <label for="args-${i}-input">${item}</label>
                </div>
            `).join(""));
            Materialize.updateTextFields();
        })
    });

    $("#args-table-body").on("click", ".edit-args", function () {
        args_new = false;
        get_test_robot(STORE_KEY.case, data => {
            let tmp = data.filter(c => c.id === case_id)[0];
            args_index = opera_get_id(this);
            $("#edit-args-modal-content").html(tmp.args_key.map((item, i) => `
                <div class="input-field col s6">
                    <input id="args-${i}-input" type="text" value="${tmp.args[args_index][item]}">
                    <label for="args-${i}-input">${item}</label>
                </div>
            `).join(""));
            Materialize.updateTextFields();
        })
    }).on("click", ".del-args", function () {
        get_test_robot(STORE_KEY.case, data => {
            let tmp = data.filter(c => c.id === case_id)[0];
            tmp.args.splice([opera_get_id(this)], 1);
            set_test_robot(STORE_KEY.case, data, function () {
                render_args(case_id);
            })
        });
    });

    $("#event-table-body").on("click", ".del-event", function () {
        if(confirm("确认删除?")) {
            event_id = opera_get_id(this);
            console.log(event_id);
            delete_record(STORE_KEY.event, event_id, () => {
                render_event(case_id);
            })
        }
    });

    $("#add_project").click(function () {
        project_new = true;
        $("#project-name-input").val("");
    });

    $("#submit-edit-project").click(function () {
        get_test_robot(STORE_KEY.project, data => {
            if (project_new) {
                data.push({
                    id: +new Date(),
                    name: $("#project-name-input").val()
                });
            } else {
                data.filter(p => p.id === project_id)[0].name = $("#project-name-input").val();
            }
            set_test_robot(STORE_KEY.project, data, function () {
                render_project();
            });
        });
    });

    $("#submit-edit-module").click(function () {
        get_test_robot(STORE_KEY.module, data => {
            if (module_new) {
                data.push({
                    id: +new Date(),
                    project_id: project_id,
                    name: $("#module-name-input").val()
                });
            } else {
                data.filter(m => m.id === module_id)[0].name = $("#module-name-input").val();
            }
            set_test_robot(STORE_KEY.module, data, function () {
                render_module(project_id);
            });
        });
    });

    $("#submit-edit-case").click(function () {
        get_test_robot(STORE_KEY.case, data => {
            let args_input = $("#case-args-input").val();
            if (case_new) {
                data.push({
                    id: +new Date(),
                    module_id: module_id,
                    name: $("#case-name-input").val(),
                    args_key: args_input.length > 0 ? args_input.split(",") : [],
                    args: []
                })
            } else {
                let tmp = data.filter(c => c.id === case_id)[0];
                tmp.name = $("#case-name-input").val();
                tmp.args_key = args_input.length > 0 ? args_input.split(",") : [];
            }
            set_test_robot(STORE_KEY.case, data, function () {
                render_case(module_id);
            });
        });
    });

    $("#submit-edit-args").click(function () {
        get_test_robot(STORE_KEY.case, data => {
            let tmp = data.filter(c => c.id === case_id)[0];
            let new_args = {};
            tmp.args_key.forEach((key, i) => {
                new_args[key] = $(`#args-${i}-input`).val();
            });
            if(args_new) {
                tmp.args.push(new_args);
            }else{
                tmp.args[args_index] = new_args;
            }
            set_test_robot(STORE_KEY.case, data, function () {
                render_args(case_id);
            })
        })
    });

});