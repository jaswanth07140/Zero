"use strict";
/* Zero Sidekick service worker: open the side panel on toolbar click. */
chrome.runtime.onInstalled.addListener(function(){
  try{
    chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(function(){});
  }catch(e){}
});
chrome.action.onClicked.addListener(function(tab){
  try{
    chrome.sidePanel.open({tabId:tab.id}).catch(function(){});
  }catch(e){}
});
