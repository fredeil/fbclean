var fbclean = fbclean || {};
var extensionInfo = undefined;
if (self.options) {
    extensionInfo = {
        "version": self.options.version
    };
} else if (chrome) {
    var manifest = chrome.runtime.getManifest();
    extensionInfo = {
        "version": manifest.version
    };
}

fbclean.version = extensionInfo.version;
console.log("Load fbclean.js (" + fbclean.version + ")");

/* fbclean settings */
fbclean.setting = fbclean.setting || {};
fbclean.setting.isInit = false;

/* fbclean i13n */
fbclean.i13n = fbclean.i13n || {};
fbclean.i13n.logEvent = function (eventObj) {
    if (fbclean.setting.isAutoReport) {
        eventObj["request"] = "i13n";
        chrome.runtime.sendMessage(eventObj, function (response) {
        });
    }
};

chrome.storage.sync.get({
    "fbclean-remove-ads": true,
    "fbclean-remove-recommended-posts": true,
    "fbclean-collaspe-right-panel": true,
    "fbclean-remove-games": true,
    "fbclean-auto-report": true,
    "fbclean-remove-events": true,
}, function (items) {
    fbclean.setting.isRemoveAds = items["fbclean-remove-ads"];
    fbclean.setting.isRemoveSponsoredPosts = items["fbclean-remove-recommended-posts"];
    fbclean.setting.isCollaspeRightPanelContent = items["fbclean-collaspe-right-panel"];
    fbclean.setting.isRemoveGames = items["fbclean-remove-games"];
    fbclean.setting.isAutoReport = items["fbclean-auto-report"];
    fbclean.setting.isRemoveEvents = items["fbclean-remove-events"];
    fbclean.setting.isInit = true;
    fbclean.i13n.logEvent({ event: "fbcleanDidLoad" });
});

fbclean.hiding = fbclean.hiding || {};
fbclean.hiding.isSponsoredStoryOnNewsFeed = function (element) {
    if ((element.dataset.ft && JSON.parse(element.dataset.ft).mf_story_key) ||
        (element.dataset.testid && element.dataset.testid == "fbfeed_story")) {
        return true;
    }
    return false;
};

fbclean.hiding.isSponsoredADs = function (element) {
    if (element.className == "ego_section") {
        return true;
    }
    return false;
};

fbclean.hiding.isGameInChatBar = function (element) {
    return (element.id == "pagelet_canvas_nav_content");
};

fbclean.collaspe = fbclean.collaspe || {};
fbclean.collaspe.contentComponentFinder = function (element) {
    var header = element.querySelector(".uiHeaderTitle");
    var container = element.querySelector(".ego_unit_container");

    if (header && container) {
        return {
            "header": header,
            "container": container,
            "title": header
        };
    }

    return undefined;
};

fbclean.collaspe.contentHandler = function (event) {
};

fbclean.feature = fbclean.feature || {};

// Feature: learning ad links on news feed
fbclean.feature.machineLearningLinksOnNewsFeed = {
    "type": "learn",
    "judgeFunction": fbclean.hiding.isSponsoredStoryOnNewsFeed,
    "name": "machineLearningLinksOnNewsFeed",
    "description": "Learning from links"
};

// Feature: hide sponsored story on news feed
fbclean.feature.hideSponsoredStoryOnNewsFeed = {
    "type": "hide",
    "judgeFunction": fbclean.hiding.isSponsoredStoryOnNewsFeed,
    "name": "hideSponsoredStoryOnNewsFeed",
    "description": "Hide sponsored story on news feed"
};

// Feature: hide friends "is going to an event"
fbclean.feature.hideEvents = {
    "type": "hide",
    "judgeFunction": fbclean.hiding.isSponsoredStoryOnNewsFeed,
    "name": "hideEvents",
    "description": "Hide sponsored story on news feed"
};

// Feature: hide sponsored ADs
fbclean.feature.hideSponsoredADs = {
    "type": "hide",
    "judgeFunction": fbclean.hiding.isSponsoredADs,
    "name": "hideSponsoredADs",
    "description": "Hide sponsored AD on photo view and persional view"
};

// Feature: hide recommended game in chat bar
fbclean.feature.hideRecommendedGameInChatBar = {
    "type": "hide",
    "judgeFunction": fbclean.hiding.isGameInChatBar,
    //  "afterHidingHandler" : fbclean.hiding.adjustChatBodyHeight,
    "name": "hideRecommendedGameInChatBar",
    "description": "Hide recommended game in chat bar"
};

// Feature: collaspe contnet
fbclean.feature.collaspeSidebarContent = {
    "type": "collaspe",
    "componentFinder": fbclean.collaspe.contentComponentFinder,
    "collaspeHandler": fbclean.collaspe.contentHandler,
    "name": "collaspeSidebarContent",
    "description": "Collaspe sidebar content"
};

// Feature: collaspe recommended games
fbclean.feature.collaspeRecommendedGame = {
    "type": "collaspe",
    "componentFinder": undefined,
    "collaspeHandler": undefined,
    "name": "collaspeRecommendedGame",
    "description": "Collaspe recommended game"
};

/* fbclean hide element framework */
fbclean.framework = fbclean.framework || {};
fbclean.framework._hideElementByTargetChild = function (target, featureDesc) {
    var element = target;
    if (!target.dataset.fbclean) {
        while (element != null && element != undefined) {
            if (featureDesc.judgeFunction(element)) {
                if (featureDesc.type == "hide") {
                    target.dataset.fbclean = "done";
                    console.log("Hide something (" + featureDesc.name + ")");
                    fbclean.i13n.logEvent({
                        event: "AdSampleForLearning",
                        type: featureDesc.name,
                        content: element.innerHTML
                    });

                    if (featureDesc.name === "hideSponsoredStoryOnNewsFeed") 
                    {
                        var pageId = '';
                        var titleLink = element.querySelector('h6 [data-hovercard]');
                        if (!titleLink) {
                            titleLink = element.querySelector('h5 [data-hovercard]');
                        }

                        if (titleLink && titleLink.dataset['hovercard']) {
                            var link = titleLink.dataset['hovercard'];
                            if (link.indexOf('id=') >= 0) {
                                link = link.split('id=')[1];
                                link = link.split('&')[0];
                                pageId = link;
                            }
                        }

                        var postId = '';
                        var inputWithPostId = element.querySelector('input[name*=identifier]');
                        if (inputWithPostId && inputWithPostId.value) {
                            postId = inputWithPostId.value;
                        }

                        var fetchLink = function (link) {
                            var result = '';
                            var ctal = link;
                            if (ctal.indexOf('l.php?') >= 0) {
                                ctal = ctal.split('l.php?')[1];
                                if (ctal.indexOf('u=') >= 0) {
                                    ctal = ctal.split('u=')[1];
                                    ctal = ctal.split('&')[0];
                                    result = decodeURIComponent(ctal);
                                }
                            }
                            return result
                        };

                        var targetLink = '';
                        var callToActionBtn = element.querySelector('[data-lynx-mode][rel][role*=button]');
                        if (callToActionBtn && callToActionBtn.href) {
                            targetLink = fetchLink(callToActionBtn.href);
                        }

                        if (targetLink.length == 0) {
                            var links = element.querySelectorAll('[data-lynx-mode][rel]');
                            for (var al of links) {
                                if (al.classList.length > 0) {
                                    targetLink = fetchLink(al.href);
                                    if (targetLink.length > 0) {
                                        break;
                                    }
                                }
                            }
                        }

                        if (pageId.length * postId.length > 0) {
                            var e = {
                                event: "SponsoredPost",
                                page: pageId,
                                post: postId
                            };
                            if (targetLink.length > 0) {
                                e['link'] = targetLink;
                            }
                            fbclean.i13n.logEvent(e);
                            console.log(e)
                        }
                    }
                }
                break;
            }
            element = element.parentElement;
        }
    }
    if (!target.dataset.fbclean && featureDesc.type == "hide") {
        fbclean.i13n.logEvent({
            event: "CannotHideTargetElement",
            type: featureDesc.name
        });
        console.log("Done")
        target.dataset.fbclean = "done";
    }
};

fbclean.framework.hideElementsByTargetChildSelector = function (selectors, featureDesc) {
    var targetChilds = document.querySelectorAll(selectors);
    for (var i = 0; i < targetChilds.length; i++) {
        if (!targetChilds[i].dataset.fbclean) {
            fbclean.framework._hideElementByTargetChild(targetChilds[i], featureDesc);
        }
    }
};

fbclean.framework._setupCollaspeComponent = function (component, handler) {
    var header = component.header;
    var container = component.container;
    var title = component.title;

    if (!header.dataset.fbcleanCollaspe) {
        header.classList.add("fbcleanClickable");
        container.classList.add("fbcleanHide");
        if (title) {
            title.innerHTML = title.innerHTML + " ...";
        }
        header.dataset.fbcleanCollaspe = "true";
        header.fbcleanCollaspeContainer = container;
        header.onclick = function (event) {
            handler(event);
            if (this.dataset.fbcleanCollaspe == "true") {
                this.fbcleanCollaspeContainer.classList.remove("fbcleanHide");
                this.dataset.fbcleanCollaspe = "false";
            } else {
                this.fbcleanCollaspeContainer.classList.add("fbcleanHide");
                this.dataset.fbcleanCollaspe = "true";
            }
            fbclean.i13n.logEvent({
                event: "CollaspeDidTapped"
            });
        }
    }
};

fbclean.framework._collaspeElement = function (element, featureDesc) {
    var component = featureDesc.componentFinder(element);
    if (component) {
        fbclean.framework._setupCollaspeComponent(component, featureDesc.collaspeHandler);
        element.dataset.fbclean = "done";
    }
};

fbclean.framework.collaspeElementsBySelector = function (selector, featureDesc) {
    var targetAreas = document.querySelectorAll(selector);
    for (var i = 0; i < targetAreas.length; i++) {
        if (!targetAreas[i].dataset.fbclean) {
            fbclean.framework._collaspeElement(targetAreas[i], featureDesc);
        }
    }
};

/* Mutation observer */
var fbcleanObserver = new window.MutationObserver(function (mutation, observer) {
    if (fbclean.setting.isInit) {
        // hide sponsored story on newsfeed
        if (fbclean.setting.isRemoveSponsoredPosts) {
            fbclean.framework.hideElementsByTargetChildSelector(".uiStreamAdditionalLogging:not([data-fbclean])", fbclean.feature.hideSponsoredStoryOnNewsFeed);
            fbclean.framework.hideElementsByTargetChildSelector("h6+div>span>div>a[href^='https://l.facebook.com/l.php?']:not([data-fbclean])", fbclean.feature.hideSponsoredStoryOnNewsFeed);
            fbclean.framework.hideElementsByTargetChildSelector("h5+div>span>div>a[href^='https://l.facebook.com/l.php?']:not([data-fbclean])", fbclean.feature.hideSponsoredStoryOnNewsFeed);
            fbclean.framework.hideElementsByTargetChildSelector("h6+div>span>div>a[href^='#']:not([data-fbclean])", fbclean.feature.hideSponsoredStoryOnNewsFeed);
            fbclean.framework.hideElementsByTargetChildSelector("h5+div>span>div>a[href^='#']:not([data-fbclean])", fbclean.feature.hideSponsoredStoryOnNewsFeed);
            fbclean.framework.hideElementsByTargetChildSelector("h6+div>span>div>div>a[href^='#']:not([data-fbclean])", fbclean.feature.hideSponsoredStoryOnNewsFeed);
            fbclean.framework.hideElementsByTargetChildSelector("h5+div>span>div>div>a[href^='#']:not([data-fbclean])", fbclean.feature.hideSponsoredStoryOnNewsFeed);
        }

        // hide sponsored ADs
        if (fbclean.setting.isRemoveAds) {
            fbclean.framework.hideElementsByTargetChildSelector(".adsCategoryTitleLink:not([data-fbclean])", fbclean.feature.hideSponsoredADs);
            fbclean.framework.hideElementsByTargetChildSelector("a[href^='/campaign/landing.php']:not([data-fbclean])", fbclean.feature.hideSponsoredADs);
            fbclean.framework.hideElementsByTargetChildSelector("a[href^='/ad_campaign/landing.php']:not([data-fbclean])", fbclean.feature.hideSponsoredADs);
        }

        // collaspe sidebar content
        if (fbclean.setting.isCollaspeRightPanelContent) {
            fbclean.framework.collaspeElementsBySelector(".ego_section:not([data-fbclean]):not([style])", fbclean.feature.collaspeSidebarContent);
        }

        // hide recommended game in chat bar
        if (fbclean.setting.isRemoveGames) {
            fbclean.framework.hideElementsByTargetChildSelector("#pagelet_canvas_nav_content:not([data-fbclean])", fbclean.feature.hideRecommendedGameInChatBar);
        }

          // hide events in feed
        if (fbclean.setting.isRemoveEvents) {
            fbclean.framework.hideElementsByTargetChildSelector("a[href^='/events/?']:not([data-fbclean])", fbclean.feature.hideEvents);
            fbclean.framework.hideElementsByTargetChildSelector("a[href^='/events/?']:not([data-fbclean])", fbclean.feature.hideEvents);
        }
    }
});

fbcleanObserver.observe(document, {
    subtree: true,
    childList: true
});
