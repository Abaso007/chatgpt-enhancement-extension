import { Readability } from "@mozilla/readability";
import {
  ExMessage,
  FAIL_MSG,
  MT,
  PARSE_SELECTION,
  PARSE_SELECTION_RESULT,
  SUCCEED_MSG,
  addMessageListener,
  sendMessage,
  sendTabMessage,
} from "@src/common/message";
import reloadOnUpdate from "virtual:reload-on-update-in-background-script";

reloadOnUpdate("pages/background");

/**
 * Extension reloading is necessary because the browser automatically caches the css.
 * If you do not use the css of the content script, please delete it.
 */
reloadOnUpdate("pages/content/style.scss");

console.log("background loaded 2023-04-11-20-33");

const inMemory = {};

const status: { tabid?: number } = {};

addMessageListener<any, any>((message, sender, sendResponse) => {
  console.log(message);
  if (message.type === MT.GET_RESPONSE_ID) {
    if (sender.tab && inMemory[sender.tab.id]) {
      sendResponse({
        type: "return-new-id",
        payload: inMemory[sender.tab.id],
        code: 200,
      });
    } else {
      sendResponse({
        type: "return-new-id",
        payload: "",
        code: 404,
      });
    }
  } else if (message.type === MT.REGISTER_GPT) {
    status["tabid"] = sender.tab.id;
  } else if (message.type === MT.GET_GPT_TABID) {
    if (status["tabid"]) {
      sendResponse({
        type: MT.GET_GPT_TABID,
        payload: status["tabid"],
        code: 200,
      });
    } else {
      sendResponse({
        type: MT.GET_GPT_TABID,
        payload: -1,
        code: 404,
      });
    }
  } else if (message.type === MT.PARSE_SELECTION) {
    const gptTabId = status["tabid"];
    const typedMsg = message as PARSE_SELECTION;
    typedMsg.payload.fromTab = sender.tab.id;

    if (gptTabId) {
      sendTabMessage<PARSE_SELECTION["payload"], any>(gptTabId, message).then(
        (message) => {
          console.log("send page question");
        }
      );
      sendResponse(SUCCEED_MSG());
    } else {
      sendResponse(FAIL_MSG("no chatgpt page found", 404));
    }
  } else if (message.type === MT.PARSE_SELECTION_RESULT) {
    const typedMsg = message as PARSE_SELECTION_RESULT;
    if (typedMsg.payload.toTab) {
      sendTabMessage<PARSE_SELECTION_RESULT["payload"], string>(
        typedMsg.payload.toTab,
        message
      ).then((message) => {
        console.log("response success", message);
      });
    }
  } else {
    sendResponse(FAIL_MSG(`no handler for ${message.type}`));
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log(details);
    const res = details.url.split("/");
    inMemory[details.tabId] = res[res.length - 1];
  },
  { urls: ["*://chat.openai.com/backend-api/conversation/gen_title/*"] },
  []
);
// "https://chat.openai.com/backend-api/conversation/gen_title/65fa6a69-a848-4c7d-be51-798fa5d60ed0"

chrome.contextMenus.create({
  title: "ChatGPT Enhancement",
  id: "ask",
  contexts: ["selection"],
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Code to execute when the context menu is clicked
  const gptTabId = status["tabid"];
  const queryOptions = { active: true, lastFocusedWindow: true };
  if (gptTabId) {
    if (info.pageUrl.startsWith("chrome-extension")) {
      const typedMsg: PARSE_SELECTION = {
        code: 200,
        type: MT.PARSE_SELECTION,
        payload: { content: info.selectionText },
      };

      sendTabMessage<PARSE_SELECTION["payload"], any>(gptTabId, typedMsg).then(
        (message) => {
          console.log("send page question");
        }
      );
    } else {
      // `tab` will either be a `tabs.Tab` instance or `undefined`.
      chrome.tabs.query(queryOptions).then((tabs) => {
        const typedMsg: PARSE_SELECTION = {
          code: 200,
          type: MT.PARSE_SELECTION,
          payload: { content: info.selectionText, fromTab: tabs[0].id },
        };

        sendTabMessage<PARSE_SELECTION["payload"], any>(
          gptTabId,
          typedMsg
        ).then((message) => {
          console.log("send page question");
        });
      });
    }
  }
  console.log(info, tab);
});
