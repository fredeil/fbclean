var browser = chrome;

let load = () => {
    let settingBtn = document.querySelector("a#settingLink");
    settingBtn.textContent = browser.i18n.getMessage("extSettings");
    settingBtn.onclick = (e) => {
        e.preventDefault();
        browser.tabs.create({
            url: browser.runtime.getURL("options.html")
        });
    };
};

window.onload = load;
