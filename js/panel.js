chrome.storage.local.get("test_robot_projects", function (res) {
    document.body.innerHTML = res["test_robot_projects"].map(p => p.name).join(",");
})