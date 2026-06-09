"use client";

import { useState, useRef, useCallback } from "react";
import { showToast } from "./Toast";

interface QuickCaptureProps {
  onNoteCreated: () => void;
}

export default function QuickCapture({ onNoteCreated }: QuickCaptureProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleSubmit = useCallback(async () => {
    const content = text.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, source: "text" }),
      });

      if (!res.ok) throw new Error("Failed to create note");

      const data = await res.json();
      setText("");

      const folderName = data.folders?.[0]?.name
        || data.folder?.name
        || (data.newFoldersCreated?.length > 0 ? data.newFoldersCreated[0].name : null)
        || "未分类";

      if (data.comfortMessage) {
        showToast(`💝 ${data.comfortMessage}`, "info");
      } else if (data.sentiment === "positive") {
        showToast(`😊 已归类到「${folderName}」`, "success");
      } else {
        showToast(`已归类到「${folderName}」`, "success");
      }

      if (data.newFoldersCreated?.length > 0) {
        const names = data.newFoldersCreated.map((f: { name: string }) => f.name).join("、");
        setTimeout(() => {
          showToast(`✨ 已自动创建文件夹「${names}」`, "info");
        }, data.comfortMessage ? 2500 : 0);
      }

      onNoteCreated();
    } catch {
      showToast("保存失败，请重试", "error");
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }, [text, isSubmitting, onNoteCreated]);

  const toggleVoice = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("你的浏览器不支持语音识别，请用 Chrome", "error");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText((prev) => prev + transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky top-0 z-30 px-4 py-4">
      <div className="max-w-3xl mx-auto">
        {/* Glowing ring when listening */}
        <div className={`relative rounded-2xl transition-all duration-300 ${
          isListening
            ? "ring-2 ring-red-300 ring-offset-2 ring-offset-[#faf8f5]"
            : "ring-1 ring-[#f0ede8] hover:ring-[#e5e0d8]"
        } glass-card p-4`}>
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="随时记录你想说的话…"
                rows={2}
                className="w-full resize-none bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-[#b8b0a8] text-[#2d2a26] leading-relaxed"
                disabled={isSubmitting}
                autoFocus
              />
              {isListening && (
                <div className="absolute right-2 top-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="text-xs text-red-500 font-medium animate-pulse">聆听中</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mic button */}
              <button
                onClick={toggleVoice}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 cursor-pointer ${
                  isListening
                    ? "bg-red-50 text-red-500 ring-1 ring-red-200"
                    : "bg-[#f5f3f0] text-[#8b8580] hover:bg-[#efe9e3] hover:text-[#6c5ce7]"
                }`}
                title={isListening ? "停止录音" : "语音输入"}
              >
                🎤
              </button>

              {/* Send button */}
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || isSubmitting}
                className="btn-primary px-5 h-10 text-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    发送
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
