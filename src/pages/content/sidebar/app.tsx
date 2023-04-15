import { useEffect, useRef, useState } from "react";

import RegPrompts from "@src/pages/options/main/RegPrompts";
import PromptSelector from "./components/PromptSelector";
import { divToMarkdown } from "@common/markdown";
import { getCurrentTime } from "@src/pages/options/utils";
import { GPTGroup, GPTPageHandler } from "../inject/page";
import { PDFProcess } from "../inject/pdfprocess";
import { MarkdownButton } from "../inject/mdbutton";
import { MT, sendMessage } from "@src/common/message";
import { storage } from "@src/common";
import { SelectionParser } from "../inject/selparser";
import { isFatherHasClass } from "@src/common/element";
import { REGEX_GPT_ID } from "@src/common/url";
import { track } from "@src/common/track";

interface Styles {
  container: React.CSSProperties;
  content: React.CSSProperties;
  contentVisible: React.CSSProperties;
  contentUnVisible: React.CSSProperties;
}

const styles: Styles = {
  container: {
    // position: "fixed",
    // top: "25%",
    // right: -25,
    // transform: "translateY(-50%)",
    width: 50,
    height: 50,
    backgroundColor: "#F5F5F5",
    boxShadow: "0px 0px 5px 0px rgba(0,0,0,0.3)",
    borderRadius: 25,
    // display: "flex",
    // justifyContent: "flex-end",
    alignItems: "center",
    cursor: "pointer",
  },
  content: {
    overflowY: "auto",
    display: "none",
    boxShadow: "0px 0px 5px 0px rgba(0,0,0,0.3)",
  },
  contentUnVisible: {
    display: "none",
  },
  contentVisible: {
    display: "flex",
    flexDirection: "column",
  },
};

const Sidebar: React.FC = () => {
  const [contentVisible, setContentVisible] = useState(false);

  const [promptHint, setPromptHint] = useState(false);
  const [textareaPos, setTextareaPos] = useState({ x: 0, y: 0 });
  const [promptFilter, setPromptFilter] = useState("");
  const [selectIndex, setSelectIndex] = useState(0);
  const [selectDown, setSelectDown] = useState(false);
  const hintRef = useRef(false);
  const indexRef = useRef(0);
  const textareaRef = useRef<any>();

  useEffect(() => {
    const handler = new GPTPageHandler();
    handler.addChatProcessor(new PDFProcess());
    const mdbt = new MarkdownButton();
    const selparser = new SelectionParser();

    handler.addMessageProcessor(MT.PARSE_SELECTION, selparser);
    handler.addEventListener("response", mdbt);
    handler.addEventListener("newpage", mdbt);

    // 创建一个 MutationObserver 实例
    const observer = new MutationObserver(function (mutations) {
      // onSwitchPage
      // onResponse

      mutations.forEach(function (mutation) {
        if (
          mutation.target &&
          (mutation.target as HTMLElement).tagName != "TEXTAREA" &&
          isFatherHasClass(mutation.target, "group") &&
          isFatherHasClass(mutation.target, "result-streaming") &&
          isFatherHasClass(mutation.target, "text-base")
        ) {
          // 获取所有 .group 类的元素
          const groups = document.querySelectorAll(".group");

          // 获取最后一个 .group 类的元素
          const group_node = groups[groups.length - 1];
          handler.onProgress(new GPTGroup(group_node as HTMLDivElement));
        }

        if (mutation.target instanceof HTMLElement) {
          if (mutation.target.classList) {
            let markdown_node = null;
            if (
              mutation.type == "attributes" &&
              mutation.attributeName == "class" && // 保证跟 button 切换时 display 样式改变无关
              mutation.target.classList.contains("markdown") &&
              !mutation.target.classList.contains("result-streaming") // 保证不是在加载中
            ) {
              console.log(mutation);
              markdown_node = mutation.target;
              console.log("End response");
              const group_node =
                markdown_node!.parentElement!.parentElement!.parentElement!
                  .parentElement!.parentElement!;
              handler.onResponse(new GPTGroup(group_node as HTMLDivElement));
              return;
            } else if (
              mutation.target.firstElementChild &&
              mutation.target.firstElementChild.firstElementChild &&
              mutation.removedNodes.length == 0 &&
              mutation.target.firstElementChild.firstElementChild.classList.contains(
                "markdown"
              ) &&
              !mutation.target.firstElementChild.firstElementChild.classList.contains(
                "result-streaming"
              ) // 保证不是在加载中
            ) {
              const div_flex_node = mutation.target;
              markdown_node = div_flex_node.querySelector(".markdown");
              const group_node =
                markdown_node!.parentElement!.parentElement!.parentElement!
                  .parentElement!.parentElement!;
              console.log("End response v2");
              handler.onResponse(new GPTGroup(group_node as HTMLDivElement));
            } else if (mutation.target.textContent == "Stop generating") {
              mutation.target
                .querySelector("button")
                ?.addEventListener("click", () => {
                  handler.onStopGeneration();
                });
              console.log(mutation);
              return;
            } else if (
              mutation.type == "childList" &&
              mutation.target.querySelector('textarea[tabindex="0"]')
            ) {
              const textarea = mutation.target.querySelector(
                'textarea[tabindex="0"]'
              );
              if (textareaRef.current !== textarea) {
                const el = textarea as HTMLTextAreaElement;
                el.addEventListener("keydown", (e) => {
                  if (hintRef.current) {
                    if (e.key === "ArrowDown") {
                      indexRef.current++;
                      setSelectIndex(indexRef.current);
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === "ArrowUp") {
                      indexRef.current--;
                      setSelectIndex(indexRef.current);
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === "Tab") {
                      setSelectDown(true);
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === "Enter") {
                      setSelectDown(true);
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }
                });
                el.addEventListener("submit", (e) => {
                  if (hintRef.current) {
                    setSelectDown(true);
                    e.preventDefault();
                    e.stopPropagation();
                  }
                });

                el.addEventListener("input", (e) => {
                  const value = (e.target as HTMLTextAreaElement).value;
                  const el = e.target as HTMLTextAreaElement;
                  setTextareaPos({
                    x: el.getBoundingClientRect().x,
                    y:
                      document.body.clientHeight - el.getBoundingClientRect().y,
                  });
                  if (value.startsWith("/")) {
                    setPromptHint(true);
                    setSelectIndex(0);
                    indexRef.current = 0;
                    hintRef.current = true;
                    setPromptFilter(value.substring(1));
                  } else {
                    setPromptHint(false);
                    hintRef.current = false;
                  }
                });
              }
              textareaRef.current = textarea;
              setTextareaPos({
                x: textarea.getBoundingClientRect().x,
                y:
                  document.body.clientHeight -
                  textarea.getBoundingClientRect().y,
              });
              console.log("onTextareaCreate");
              handler.onTextareaCreate(textarea as HTMLTextAreaElement);
              sendMessage<string, string>({ type: MT.REGISTER_GPT });
            } else if (mutation.target.tagName.toLowerCase() == "nav") {
              console.log("onSwitchPage");
              console.log(mutation);
              handler.onSwitchPage();
            } else {
              // console.log(mutation)
            }
          }
        }
      });
    });

    // 配置 MutationObserver 监听选项
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      characterDataOldValue: true,
    };

    // 开始监听目标元素变化
    observer.observe(document.body, config);
  }, []);

  const handleMouseEnter = () => {
    setContentVisible(true);
  };

  const handleMouseLeave = () => {
    setContentVisible(false);
  };

  const prepareText = (onlyResponse: boolean = false) => {
    const res = document.querySelectorAll(".group .text-base");
    return Array.from(res)
      .map((item) => {
        if (item.querySelector(".markdown")) {
          return (
            "## Response\n\n" +
            divToMarkdown(item.querySelector(".markdown")) +
            "\n\n---"
          );
        } else if (item.querySelector(".whitespace-pre-wrap")) {
          if (onlyResponse) {
            return "";
          }
          return (
            "# Prompt\n\n" +
            item.querySelector(".whitespace-pre-wrap").textContent
          );
        }
      })
      .join("\n\n");
  };

  const savePageById = (id: string) => {
    console.log(id);
    storage.get<string[]>("chatgptHistoryIds", []).then((historyIds) => {
      const markdown = prepareText();
      if (!historyIds.includes(id)) {
        historyIds.push(id);
      }
      let title = "";
      if (document.querySelector(".bg-gray-800")) {
        title = document.querySelector(".bg-gray-800").textContent;
      }

      const res = { chatgptHistoryIds: historyIds };
      res[id] = {
        chatid: id,
        content: markdown,
        title: title,
      };

      storage.sets(res).then(() => {
        console.log("Saved");
      });
    });
  };

  return (
    <>
      <div
        id="prompt-hint"
        style={{
          display: promptHint ? undefined : "none",
          position: "absolute",
          left: textareaPos.x + "px",
          bottom: textareaPos.y + 24 + "px",
        }}
        className="flex flex-col-reverse overflow-y-auto p-1 h-3/5"
      >
        <PromptSelector
          selectIndex={selectIndex}
          selectDone={selectDown}
          filter={promptFilter}
          onSelect={(prompt) => {
            textareaRef.current.value = prompt;
            setPromptFilter("");
            setSelectDown(false);
            indexRef.current = 0;
            setSelectIndex(0);
            setPromptHint(false);
            textareaRef.current.focus();
          }}
        />
      </div>
      <div id="sticky-button" className="absolute top-4 right-4 text-sm">
        <div className="flex flex-row">
          <div
            onClick={() => {
              navigator.clipboard.writeText(prepareText());
              track("Click sidebar-copy-all button", {});
            }}
            className="w-20 py-2 pointer-events-auto bg-white m-2 rounded-md px-2 text-xs text-slate-700 shadow-sm ring-1 ring-slate-700/10 hover:bg-slate-50"
          >
            Copy All
          </div>
          <div
            onClick={() => {
              navigator.clipboard.writeText(prepareText(true));
              track("Click sidebar-copy-answer button", {});
            }}
            className="w-24 py-2 pointer-events-auto bg-white m-2 rounded-md px-2 text-xs text-slate-700 shadow-sm ring-1 ring-slate-700/10 hover:bg-slate-50"
          >
            Copy Answer
          </div>
        </div>
        <div className="flex flex-row">
          <div
            onClick={() => {
              track("Click sidebar-export button", {});
              const blob = new Blob([prepareText()], {
                type: "text/plain;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              function download(id: string) {
                link.href = url;
                link.download = `chat-${getCurrentTime()}-${id}.md`;
                link.click();
                URL.revokeObjectURL(url);
              }

              const match = document.URL.match(REGEX_GPT_ID);
              if (match) {
                download(match[1]);
              } else {
                sendMessage<string, string>({ type: MT.GET_RESPONSE_ID }).then(
                  (message) => {
                    if (message.code === 200) {
                      download(message.payload);
                    }
                  }
                );
              }
            }}
            className="w-20 py-2 pointer-events-auto bg-white mx-2 my-1 rounded-md px-2 text-xs text-slate-700 shadow-sm ring-1 ring-slate-700/10 hover:bg-slate-50"
          >
            Export
          </div>
          <div
            onClick={() => {
              track("Click sidebar-save-dialogue button", {});
              const match = document.URL.match(REGEX_GPT_ID);
              console.log(match);
              if (match) {
                savePageById(match[1]);
              } else {
                sendMessage<string, string>({ type: MT.GET_RESPONSE_ID }).then(
                  (message) => {
                    if (message.code === 200) {
                      savePageById(message.payload);
                    }
                  }
                );
              }
            }}
            className="w-24 py-2 pointer-events-auto bg-white mx-2 my-1 rounded-md px-2 text-xs text-slate-700 shadow-sm ring-1 ring-slate-700/10 hover:bg-slate-50"
          >
            Save Dialogue
          </div>
        </div>
      </div>
      <div
        id="reg-prompt-sidebar"
        className="fixed right-[-25px] top-32"
        style={styles.container}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="fixed right-0 top-32 mr-1 w-1/3 h-auto"
          style={{
            ...styles.content,
            ...(contentVisible && styles.contentVisible),
          }}
        >
          <RegPrompts
            sidebar
            onSelectChange={(prompt) => {
              storage.set("currentRegPrompt", prompt);
            }}
          ></RegPrompts>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
