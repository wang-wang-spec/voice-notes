import { Folder, NoteAnalysis } from "./types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callDeepSeek(
  messages: ChatMessage[],
  maxTokens = 2048
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: maxTokens,
      temperature: 0.1,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function extractJSON(text: string): object | null {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}
  // Try markdown code block
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1].trim()); } catch {}
  }
  // Try to find JSON object or array
  const objMatch = text.match(/\{[\s\S]*\}/);
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch {}
  }
  return null;
}

const EMOJI_POOL = ["🚀", "💡", "🎯", "📖", "✅", "❤️", "🎵", "🏃", "💰", "🔧", "🌟", "🎨", "🎮", "🍔", "✈️", "🏠", "💼", "📱", "🎓", "🌍"];
const COLOR_POOL = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4"];

/**
 * Unified note analysis: categorization + time extraction + todo extraction + auto-create folders.
 * One API call does it all.
 */
export async function analyzeNote(
  content: string,
  folders: Folder[]
): Promise<NoteAnalysis> {
  const empty: NoteAnalysis = {
    folderIds: [],
    newFolders: [],
    recordedAt: null,
    timeSummary: "",
    todos: [],
    sentiment: "neutral",
  };

  if (!DEEPSEEK_API_KEY) return empty;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dayOfWeek = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][today.getDay()];

  const folderList = folders.length > 0
    ? folders.map((f) => `- id: "${f.id}" | name: "${f.name}"`).join("\n")
    : "(暂无文件夹)";

  const systemPrompt = `你是一个智能笔记分析助手。分析用户的笔记，一次性完成以下所有任务。

**任务1: 分类 (folder_ids + new_folders)**
重要：根据笔记的【核心主题】来匹配文件夹，而不是根据个别词汇。
- 理解笔记在说什么事情，匹配语义最接近的文件夹
- 例如："小红书更新了拼豆帖子"→核心主题是"拼豆"（手工），不是"股票"
- 例如："流量没有之前高"说的是社交媒体流量，不是资金流量
- 例如："股票涨了"→才是匹配"股票"文件夹
- 可以匹配多个文件夹（如同时涉及工作和学习）
- 如果内容涉及一个已有文件夹明确不涵盖的新主题，才建议创建新文件夹
- 新文件夹名简洁（2-4个字），自动配合适的 emoji 和颜色
- emoji要反映文件夹主题，不要受笔记情绪影响。如"心情"→😊，"工作"→💼，"学习"→📖，"运动"→🏃
- 生活感悟、心情等难以归类的，folder_ids 可以为空数组

**任务2: 时间提取 (recorded_at + time_summary)**
- 从内容中提取实际发生/讨论的时间
- "昨天"→昨天日期, "上周五"→上周五日期, "下周"→下周日期
- 今天日期是 ${todayStr} (${dayOfWeek})
- 如果没提到具体时间，recorded_at 用今天的日期

**任务3: 心情检测 (sentiment + comfort_message)**
- 判断笔记的情绪倾向: "positive"（积极开心）、"neutral"（中性）、"negative"（消极沮丧焦虑）
- 如果sentiment是"negative"，生成一句简短温暖的安慰/笑话，帮助用户转换心情
- 笑话要有趣但不过分，安慰要真诚但不肉麻，20字以内
- 心情类笔记（表达情绪感受、吐槽、抱怨、开心事），如果还没有"心情"文件夹，建议创建

**任务4: 待办提取 (todos)**
- 识别所有可执行的事项/任务/承诺
- 提取截止日期（如果有的话）
- 只提取真正需要行动的事项（如"研究一下"、"要xxx"、"需要xxx"），不提取已经完成或纯描述性的内容

**输出格式（纯JSON，不要markdown包裹）:**
{
  "folder_ids": ["existing-id-1"],
  "new_folders": [{"name": "产品", "icon": "🚀", "color": "#3b82f6"}],
  "recorded_at": "2026-06-08",
  "time_summary": "昨天下午",
  "sentiment": "neutral",
  "comfort_message": "",
  "todos": [{"content": "下周一启动开发", "due_date": "2026-06-15"}, {"content": "整理文档", "due_date": null}]
}`;

  const result = await callDeepSeek([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `已有文件夹:\n${folderList}\n\n笔记内容: "${content}"\n\n请分析。只返回JSON。`,
    },
  ]);

  try {
    const parsed = extractJSON(result) as any;
    if (!parsed) return empty;

    const sentiment = ["positive", "neutral", "negative"].includes(parsed.sentiment)
      ? parsed.sentiment : "neutral";

    return {
      folderIds: Array.isArray(parsed.folder_ids) ? parsed.folder_ids : [],
      newFolders: Array.isArray(parsed.new_folders) ? parsed.new_folders.map((f: any) => ({
        name: String(f.name || "新主题"),
        icon: String(f.icon || EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)]),
        color: String(f.color || COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]),
      })) : [],
      recordedAt: parsed.recorded_at || todayStr,
      timeSummary: parsed.time_summary || "今天",
      sentiment,
      comfortMessage: typeof parsed.comfort_message === "string" ? parsed.comfort_message : undefined,
      todos: Array.isArray(parsed.todos) ? parsed.todos.map((t: any) => ({
        content: String(t.content || ""),
        dueDate: t.due_date || null,
      })).filter((t: any) => t.content) : [],
    };
  } catch {
    return empty;
  }
}

/**
 * Smart search: find notes relevant to a natural language query.
 */
export async function searchNotesWithAI(
  query: string,
  notesWithFolders: Array<{
    id: string;
    content: string;
    folders: Folder[];
    createdAt: string;
  }>
): Promise<Array<{ noteId: string; reason: string }>> {
  if (notesWithFolders.length === 0) return [];

  const notesList = notesWithFolders
    .map((n) => {
      const folderNames = n.folders.map((f) => f.name).join(",") || "未分类";
      return `- id: "${n.id}" | folders: ${folderNames} | date: ${n.createdAt.slice(0, 10)} | content: "${n.content.slice(0, 200)}"`;
    })
    .join("\n");

  const result = await callDeepSeek([
    {
      role: "system",
      content: `你是一个智能搜索助手。根据用户自然语言查询找到最相关的笔记。

规则:
- 只返回JSON数组: [{"note_id": "xxx", "reason": "相关原因(<=10字)"}]
- 按语义相关性、主题、关键词、时间匹配
- 最多返回10条，按相关度排序
- 无结果返回: []`,
    },
    {
      role: "user",
      content: `查询: "${query}"\n\n所有笔记:\n${notesList}\n\n找最相关的笔记。只返回JSON数组。`,
    },
  ]);

  try {
    const parsed = extractJSON(result) as any[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      noteId: String(item.note_id || ""),
      reason: String(item.reason || "相关"),
    }));
  } catch {
    return [];
  }
}

/**
 * Extract expense info (kept separate for backward compat, used only for expense folders).
 */
export async function extractExpenseInfo(
  content: string
): Promise<{ amount: number; category: string } | null> {
  const result = await callDeepSeek([
    {
      role: "system",
      content: `你是记账助手。提取消费金额和类别。
规则: 只返回JSON: {"amount": 数字, "category": "餐饮/购物/交通/住房/娱乐/服饰/数码/教育/医疗/人情/日用/其他"}
多个物品时金额加总。无法判断返回 {"amount": 0, "category": "其他"}`,
    },
    {
      role: "user",
      content: `笔记: "${content}"\n提取消费信息。只返回JSON。`,
    },
  ]);

  try {
    const parsed = extractJSON(result) as any;
    if (!parsed || !parsed.amount || parsed.amount <= 0) return null;
    return { amount: parsed.amount, category: parsed.category || "其他" };
  } catch {
    return null;
  }
}
