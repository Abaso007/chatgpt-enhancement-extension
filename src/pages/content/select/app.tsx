import clsx from "clsx";
import style from "./app.module.css";
import {
  ExMessage,
  MT,
  PARSE_SELECTION,
  PARSE_SELECTION_RESULT,
  addMessageListener,
  sendMessage,
  storage,
} from "@src/common";
import { REGEX_GPTURL, getPureUrl } from "@src/common/url";
import { useEffect, useRef, useState } from "react";
import PromptSelector from "./components/PromptSelector";
import { isFatherHasClass, isFatherHasId } from "@src/common/element";
import { getCurrentTime } from "@src/pages/options/utils";
import { divToMarkdown } from "@src/common/markdown";

interface Styles {
  container: React.CSSProperties;
  content: React.CSSProperties;
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
};

const SelectAnalayse: React.FC = () => {
  const [hideResponse, setHideResponse] = useState(false);
  const [promptHint, setPromptHint] = useState(false);
  const [selectPos, setSelectPos] = useState({ x: 0, y: 0 });

  const [selectIndex, setSelectIndex] = useState(0);
  const [selectDown, setSelectDown] = useState(false);
  const hintRef = useRef(false);
  const indexRef = useRef(0);

  const [status, setStatus] = useState<
    "none" | "wait" | "onresponse" | "error"
  >("none");
  const [oldResponse, setOldResponse] = useState<
    PARSE_SELECTION_RESULT["payload"][]
  >([]);
  const [response, setResponse] = useState<PARSE_SELECTION_RESULT["payload"][]>(
    []
  );
  const [latestResponse, setLatestResponse] =
    useState<PARSE_SELECTION_RESULT["payload"]>(null);

  const [latestError, setLatestError] =
    useState<PARSE_SELECTION_RESULT["payload"]>(null);
  const responseRef = useRef(response);
  const htmlRef = useRef<HTMLDivElement>();
  const statusRef = useRef(status);

  useEffect(() => {
    const pureUrl = getPureUrl();
    storage
      .get<PARSE_SELECTION_RESULT["payload"][]>(pureUrl, [])
      .then((oldResponse) => {
        setOldResponse(oldResponse);
        console.log("old response", oldResponse);
      })
      .catch(() => {
        console.log("old response something error");
      });

    addMessageListener(
      (message: PARSE_SELECTION_RESULT, sender, sendResponse) => {
        console.log("recieve response", message);
        if (message.payload.streaming) {
          setStatus("onresponse");
          statusRef.current = "onresponse";
          setLatestResponse(message.payload);
        } else {
          setStatus("none");
          statusRef.current = "none";
          responseRef.current = responseRef.current.concat(message.payload);
          setResponse(responseRef.current);
          setLatestResponse(null);
          saveResponse();
        }
        if (htmlRef.current) {
          htmlRef.current.scrollTop = htmlRef.current.scrollHeight;
        }
      }
    );

    document.body.addEventListener("keydown", (e) => {
      if (hintRef.current) {
        if (e.key === "ArrowDown") {
          console.log(e.key);
          indexRef.current++;
          setSelectIndex(indexRef.current);
          e.preventDefault();
          e.stopPropagation();
        } else if (e.key === "ArrowUp") {
          console.log(e.key);
          indexRef.current--;
          setSelectIndex(indexRef.current);
          e.preventDefault();
          e.stopPropagation();
        } else if (e.key === "Tab") {
          console.log(e.key);
          setSelectDown(true);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });
    document.body.addEventListener("mousedown", (e) => {
      if (!isFatherHasId((e as any).target as Node, "extension-prompt-hint")) {
        setSelectDown(false);
        indexRef.current = 0;
        setSelectIndex(0);
        setPromptHint(false);
      }
      console.log(e);
    });

    const saveResponse = () => {
      const pureUrl = getPureUrl();

      storage
        .get<PARSE_SELECTION_RESULT["payload"][]>(pureUrl, [])
        .then((oldResponse) => {
          let newResponse = responseRef.current;
          if (oldResponse.length > 0) {
            const latestTimestampe =
              oldResponse[oldResponse.length - 1].timestamp;
            newResponse = response.filter(
              (item) => item.timestamp > latestTimestampe
            );
          }
          const savedResponse = oldResponse.concat(...newResponse);
          console.log(pureUrl, savedResponse);
          storage.set(pureUrl, savedResponse).then(() => {
            console.log("Saved");
          });
        });
    };

    document.body.addEventListener("keydown", (e) => {
      console.log(e, statusRef.current);
      if (statusRef.current === "none") {
        if (e.key === "c") {
          const sel = document.getSelection();
          console.log("getSelection");
          if (sel && !sel.isCollapsed) {
            console.log("sendmessage");
            const content = sel.getRangeAt(0).cloneContents().textContent;
            sendQuestion(content);
          }
        } else if (e.key === "x") {
          const sel = document.getSelection();
          if (!sel || sel.isCollapsed) {
            return;
          }
          const range = sel.getRangeAt(0);

          const rect = range.getBoundingClientRect();
          const newPos = {
            x: rect.x,
            y: window.innerHeight - window.pageYOffset - rect.top,
          };
          setSelectPos(newPos);
          console.log(rect);
          console.log(newPos);
          setPromptHint(true);
          setSelectIndex(0);
          indexRef.current = 0;
          hintRef.current = true;
        }
      }
    });
  }, []);

  const sendQuestion = (content: string, prompt?: string) => {
    sendMessage<PARSE_SELECTION["payload"], any>({
      type: MT.PARSE_SELECTION,
      payload: {
        content: content,
        prompt: prompt,
      },
    })
      .then((message) => {
        if (message.code === 200) {
          setStatus("wait");
          statusRef.current = "wait";
        } else {
          const number = latestError ? latestError.toTab : 0;
          setLatestError({
            timestamp: new Date().getTime(),
            content:
              "<b>Reason: </b>" +
              message.msg +
              ", please create a chatgpt page" +
              `<p><i>(${new Date()})</i></p>`,
            prompt: "Failed to get response",
            toTab: number + 1,
          });
        }
      })
      .catch(() => {
        setStatus("error");
        setLatestError({
          timestamp: new Date().getTime(),
          content:
            "<b>Reason: </b>" +
            "Cannot connect background, please refresh this page.",
          prompt: "Failed to get response",
        });
      });

    setHideResponse(false);
    setSelectDown(false);
    indexRef.current = 0;
    setSelectIndex(0);
    setPromptHint(false);
  };

  const allResponse: PARSE_SELECTION_RESULT["payload"][] = []
    .concat(oldResponse, response, latestResponse, latestError)
    .filter((item) => item);
  return (
    <>
      <div
        id="extension-prompt-hint"
        style={{
          display: promptHint ? undefined : "none",
          position: "absolute",
          left: selectPos.x + "px",
          bottom: selectPos.y + "px",
        }}
        className="z-[10000000] flex flex-col-reverse overflow-y-auto p-1 h-2/5"
      >
        <PromptSelector
          selectIndex={selectIndex}
          selectDone={selectDown}
          filter={""}
          onSelect={(prompt) => {
            const sel = document.getSelection();
            console.log("getSelection");
            if (sel && !sel.isCollapsed) {
              console.log("sendmessage");
              const content = sel.getRangeAt(0).cloneContents().textContent;
              sendQuestion(content, prompt);
            }
          }}
        />
      </div>

      {!REGEX_GPTURL.test(document.URL) && allResponse.length > 0 && (
        <div>
          {hideResponse ? (
            <div
              className="fixed right-[-25px] top-32"
              style={styles.container}
              onClick={() => {
                setHideResponse(false);
              }}
            ></div>
          ) : (
            <div
              style={{
                maxHeight: "60%",
              }}
              className="z-[10000000] fixed text-gray-700 overflow-y-auto top-0 right-0 w-1/5 border-4 border-gray-200 m-2 rounded"
            >
              <div
                ref={htmlRef}
                className={clsx(
                  "divide-y bg-white w-full overflow-y-auto",
                  style["markdown-response"]
                )}
              >
                {allResponse.map((item, index) => {
                  if (!item) {
                    return <></>;
                  }
                  return (
                    <div key={index} className="w-full h-full">
                      <div className="text-base  px-2 gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex m-auto">
                        <div
                          dangerouslySetInnerHTML={{ __html: item.prompt }}
                        ></div>
                      </div>
                      <div className="bg-gray-50 px-2  text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex m-auto">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: item.content,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-row float-right">
                <div
                  onClick={() => {
                    const pureUrl = getPureUrl();
                    storage.remove(pureUrl).then(() => {
                      setOldResponse([]);
                      setResponse([]);
                      setLatestError(null);
                    });
                  }}
                  className="pointer-events-auto bg-white py-1 flex-none rounded-md px-2 py-[0.3125rem] font-medium text-slate-700 shadow-sm ring-1 ring-slate-700/10 hover:bg-slate-50"
                >
                  clear
                </div>
                <div
                  onClick={() => {
                    const text = []
                      .concat(oldResponse, response)
                      .map((item) => {
                        const divP = document.createElement("div");
                        divP.innerHTML = item.prompt;
                        const divC = document.createElement("div");
                        divC.innerHTML = item.content;
                        return divToMarkdown(divP) + "\n" + divToMarkdown(divC);
                      })
                      .join("\n");
                    navigator.clipboard.writeText(text);
                  }}
                  className="pointer-events-auto bg-white py-1 flex-none rounded-md px-2 py-[0.3125rem] font-medium text-slate-700 shadow-sm ring-1 ring-slate-700/10 hover:bg-slate-50"
                >
                  copy
                </div>
                <div
                  onClick={() => {
                    setHideResponse(true);
                  }}
                  className="pointer-events-auto bg-white py-1 flex-none rounded-md px-2 py-[0.3125rem] font-medium text-slate-700 shadow-sm ring-1 ring-slate-700/10 hover:bg-slate-50"
                >
                  hide
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SelectAnalayse;
