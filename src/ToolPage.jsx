import { useState, useRef, useEffect } from 'react'

// ============ DeepSeek API 配置 ============
const DEFAULT_API_KEY = 'sk-9517c7bdde2c411892b0768ade314d80'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const API_TIMEOUT_MS = 60000

function getApiKey() {
  try { return localStorage.getItem('bankai_api_key') || DEFAULT_API_KEY } catch { return DEFAULT_API_KEY }
}
function setApiKey(key) {
  try { key && key.trim() ? localStorage.setItem('bankai_api_key', key.trim()) : localStorage.removeItem('bankai_api_key') } catch {}
}

// ============ 公文格式指令 ============
const FORMAT_INSTRUCTION = `

【输出格式要求——必须严格遵守】
1. 直接输出公文内容，绝对不要使用任何Markdown格式（禁止使用#、**、*、\`、-等符号）
2. 必须使用中文全角标点符号（，。；：""（）！？、《》），禁止使用英文半角标点
3. 章节编号规则：第一层用"一、二、三、"，第二层用"（一）（二）（三）"，第三层用"1. 2. 3."
4. 标题独占一行，标题与正文之间空一行
5. 章节标题独占一行，章节与上文之间空一行
6. 如有附件，在正文后空一行，左空2个汉字写"附件："后接附件名称；多个附件用数字序号
7. 正文结束后空两行，右对齐写落款（单位名称+日期）
8. 不要输出任何提示性文字（如"以下是..."、"请您..."等），只输出公文本身`

// ============ 场景分类 ============
const CATEGORIES = [
  { id: 'custom', name: '自定义', icon: '✏️' },
  { id: 'regulatory', name: '监管回复', icon: '🏛️' },
  { id: 'analysis', name: '分析研判', icon: '📊' },
  { id: 'regulation', name: '规章制度', icon: '📜' },
  { id: 'admin', name: '行政公文', icon: '📋' },
  { id: 'report', name: '汇报总结', icon: '📝' },
]

// ============ 场景配置（13种公文） ============
const SCENARIOS = [
  // ---- 自定义公文 ----
  {
    id: 'custom',
    name: '自定义公文',
    icon: '✏️',
    category: 'custom',
    desc: '任意公文类型，自定义要求',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行各类公文的撰写规范，包括但不限于：管理办法、实施细则、决定、批复、意见、决议、命令、批示、公告、通告、公示、承诺书、声明、协议、合同、制度、规程、规范、标准等。你写的公文必须：1）格式规范，符合银行公文行文标准；2）术语精准、用词严谨；3）逻辑清晰、层次分明；4）语气得体，符合行文方向（上行文/下行文/平行文）；5）根据用户指定的公文类型自动适配格式和行文风格。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'docType', label: '公文类型', placeholder: '如：管理办法/批复/决定/意见/公告/承诺书/公示/声明/实施细则...', required: true, type: 'text' },
      { key: 'title', label: '标题/事由', placeholder: '如：关于XX的批复 / XX管理办法', required: true, type: 'text' },
      { key: 'sender', label: '发文单位', placeholder: '如：XX银行XX分行/风险管理部', required: false, type: 'text' },
      { key: 'recipient', label: '主送/收文单位', placeholder: '如：各分支行/XX科室/监管分局', required: false, type: 'text' },
      { key: 'content', label: '核心内容/事由', placeholder: '详细描述公文要写的内容、背景、要点', required: true, type: 'textarea' },
      { key: 'customReqs', label: '其他要求', placeholder: '如：需包含附件清单、需引用XX监管文件、特定章节结构、试行期限等', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：800、1500、3000（留空则默认800-1500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数800-1500字'
      return `请根据以下信息撰写一份${data.docType}：

【公文类型】${data.docType}
【标题】${data.title}
${data.sender ? `【发文单位】${data.sender}\n` : ''}${data.recipient ? `【主送单位】${data.recipient}\n` : ''}【核心内容】${data.content}
${data.customReqs ? `【其他要求】${data.customReqs}\n` : ''}
要求：
1. 严格按照"${data.docType}"的公文格式和行文规范撰写
2. 术语精准、用词严谨
3. 逻辑清晰、层次分明
4. 语气得体，符合行文方向
5. ${wc}`
    }
  },

  // ---- 监管回复 ----
  {
    id: 'situation-report',
    name: '情况说明',
    icon: '📋',
    category: 'regulatory',
    desc: '监管回复、情况说明、风险提示等',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行监管要求和公文规范。你写的情况说明必须：1）符合银行公文格式标准；2）术语精准、用词严谨；3）逻辑清晰、数据准确；4）语气客观、不使用模糊表述。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '事由', placeholder: '如：关于XX支行2025年一季度不良贷款率上升的情况说明', required: true, type: 'text' },
      { key: 'facts', label: '关键数据和事实', placeholder: '如：不良率从2.1%上升至2.8%，主要受XX行业影响...', required: true, type: 'textarea' },
      { key: 'recipient', label: '报送对象', placeholder: '如：分行风险管理部/监管科室', required: false, type: 'text' },
      { key: 'measures', label: '已采取/拟采取的措施', placeholder: '如：已加强贷后检查频次，拟调整XX行业授信政策', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：800、1500（留空则默认800-1500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数800-1500字'
      return `请根据以下信息撰写一份正式的情况说明：

【事由】${data.title}
${data.recipient ? `【报送对象】${data.recipient}\n` : ''}【关键事实】${data.facts}
${data.measures ? `【应对措施】${data.measures}\n` : ''}
要求：
1. 标准公文格式（标题、主送、正文、落款）
2. 先概述事实，再分析原因，最后提出措施
3. 措辞严谨，不使用模糊表述
4. ${wc}`
    }
  },
  {
    id: 'investigation-report',
    name: '调查报告',
    icon: '🔍',
    category: 'regulatory',
    desc: '专项调查、事件调查、风险排查报告等',
    systemPrompt: '你是一名商业银行风险排查与调查专家，精通银行合规要求和调查报告规范。你写的调查报告必须：1）调查背景、过程、发现、结论、建议结构完整；2）事实描述客观中立，用数据说话；3）结论有依据，建议有操作性；4）措辞严谨规范。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '调查事由', placeholder: '如：关于XX客户关联交易违规的调查报告', required: true, type: 'text' },
      { key: 'background', label: '调查背景', placeholder: '如：接监管通知，要求对XX业务进行专项排查', required: true, type: 'textarea' },
      { key: 'findings', label: '调查发现/问题', placeholder: '如：发现XX笔贷款存在担保链问题，涉及金额XX万', required: true, type: 'textarea' },
      { key: 'conclusion', label: '初步结论', placeholder: '如：存在授信审批不合规、贷后管理不到位等问题', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：2000、3000（留空则默认1500-2500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数1500-2500字'
      return `请根据以下信息撰写一份调查报告：

【调查事由】${data.title}
【调查背景】${data.background}
【调查发现】${data.findings}
${data.conclusion ? `【初步结论】${data.conclusion}\n` : ''}
要求：
1. 包含：调查背景、调查范围与过程、调查发现、问题分析、处理建议
2. 事实描述客观中立，用数据说话
3. 结论有依据，建议有操作性
4. ${wc}`
    }
  },

  // ---- 分析研判 ----
  {
    id: 'risk-report',
    name: '风险分析报告',
    icon: '📊',
    category: 'analysis',
    desc: '信贷风险分析、行业风险研判等',
    systemPrompt: '你是一名商业银行风险分析专家，精通银行风险管理体系和监管要求。你写的风险分析报告必须：1）框架完整，涵盖概述、数据分析、风险识别、评估、建议；2）风险等级判断使用标准术语（低/中/高/较高）；3）数据引用准确，趋势判断有依据；4）建议措施具体可执行。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'reportType', label: '报告类型', placeholder: '如：信贷风险分析报告/行业风险分析报告', required: true, type: 'text' },
      { key: 'target', label: '分析对象', placeholder: '如：XX行业/XX支行信贷资产', required: true, type: 'text' },
      { key: 'period', label: '分析期间', placeholder: '如：2025年一季度', required: true, type: 'text' },
      { key: 'indicators', label: '关键数据指标', placeholder: '如：不良率2.8%，拨备覆盖率150%，关注类贷款占比...', required: true, type: 'textarea' },
      { key: 'risks', label: '已知风险点', placeholder: '如：XX行业集中度偏高，担保链风险暴露', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：2000、3000（留空则默认1500-2500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数1500-2500字'
      return `请根据以下信息撰写一份风险分析报告：

【报告类型】${data.reportType}
【分析对象】${data.target}
【分析期间】${data.period}
【关键数据指标】${data.indicators}
${data.risks ? `【已知风险点】${data.risks}\n` : ''}
要求：
1. 包含：概述、数据分析、风险识别、风险评估、建议措施
2. 风险等级判断使用标准术语
3. 建议措施具体可执行
4. ${wc}`
    }
  },

  // ---- 规章制度 ----
  {
    id: 'regulation',
    name: '管理办法',
    icon: '📜',
    category: 'regulation',
    desc: '业务管理办法、实施细则、操作规程等',
    systemPrompt: '你是一名商业银行制度文件起草专家，精通银行内部规章制度体系。你写的管理办法必须：1）结构完整：总则（目的、依据、适用范围）、组织职责、管理内容、操作流程、监督检查、附则；2）条款表述清晰、无歧义；3）职责分工明确，流程闭环；4）与监管要求一致；5）使用"应当""不得""严禁"等规范用语。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '制度名称', placeholder: '如：XX银行业务运营风险管理系统管理办法', required: true, type: 'text' },
      { key: 'purpose', label: '制定目的', placeholder: '如：规范XX业务操作流程，防范操作风险', required: true, type: 'textarea' },
      { key: 'scope', label: '适用范围', placeholder: '如：全行各分支行、各部门XX业务', required: true, type: 'text' },
      { key: 'keyPoints', label: '核心管理内容/要点', placeholder: '如：职责分工、审批流程、风险控制措施、报告机制、罚则', required: true, type: 'textarea' },
      { key: 'isTrial', label: '是否试行', placeholder: '如：是/否（留空默认否）', required: false, type: 'text' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：3000、5000（留空则默认3000-5000字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数3000-5000字'
      const trial = data.isTrial === '是' ? '标题标注"（试行）"' : ''
      return `请根据以下信息起草一份管理办法：

【制度名称】${data.title}
【制定目的】${data.purpose}
【适用范围】${data.scope}
【核心管理内容】${data.keyPoints}
${trial}
要求：
1. 包含：总则（目的、依据、适用范围）、组织职责、管理规则、操作流程、监督检查、罚则、附则
2. 条款表述清晰无歧义，使用"应当""不得""严禁"等规范用语
3. 职责分工明确，流程闭环
4. ${wc}`
    }
  },
  {
    id: 'implementation-plan',
    name: '实施方案',
    icon: '📑',
    category: 'regulation',
    desc: '工作方案、实施方案、推进计划等',
    systemPrompt: '你是一名商业银行项目管理专家，精通银行工作方案的策划与撰写。你写的实施方案必须：1）目标明确、可衡量；2）步骤清晰、时间节点具体；3）责任到人/部门；4）配套措施和保障机制到位；5）风险预判和应急预案。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '方案名称', placeholder: '如：XX支行2025年不良贷款处置实施方案', required: true, type: 'text' },
      { key: 'goal', label: '工作目标', placeholder: '如：年内处置不良贷款XX万元，不良率下降至X%', required: true, type: 'textarea' },
      { key: 'period', label: '实施时间', placeholder: '如：2025年3月-12月', required: true, type: 'text' },
      { key: 'scope', label: '实施范围', placeholder: '如：全行各支行信贷条线', required: true, type: 'text' },
      { key: 'keyActions', label: '主要举措', placeholder: '如：1.分类施策 2.批量转让 3.诉讼清收 4.核销', required: true, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：2000、3000（留空则默认1500-2500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数1500-2500字'
      return `请根据以下信息撰写一份实施方案：

【方案名称】${data.title}
【工作目标】${data.goal}
【实施时间】${data.period}
【实施范围】${data.scope}
【主要举措】${data.keyActions}
要求：
1. 包含：目标、组织领导、实施步骤（含时间节点）、责任分工、保障措施、考核机制
2. 目标明确可衡量，步骤清晰有时限
3. 责任到部门/岗位
4. ${wc}`
    }
  },

  // ---- 行政公文 ----
  {
    id: 'notice',
    name: '通知',
    icon: '📢',
    category: 'admin',
    desc: '工作通知、会议通知、制度印发通知等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"通知"类公文的撰写规范。你写的通知必须：1）标题格式规范（关于XX的通知）；2）正文先写通知事由，再写具体要求；3）要求清晰明确、可执行；4）必要时列明时间节点和责任人。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '通知事由', placeholder: '如：关于开展2025年度信贷资产风险分类工作的通知', required: true, type: 'text' },
      { key: 'content', label: '通知内容/要求', placeholder: '如：各支行需在6月30日前完成分类工作，重点排查...', required: true, type: 'textarea' },
      { key: 'deadline', label: '截止时间/时间节点', placeholder: '如：2025年6月30日', required: false, type: 'text' },
      { key: 'scope', label: '通知范围', placeholder: '如：各分支行、总行信贷管理部', required: false, type: 'text' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：800、1500（留空则默认500-1200字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数500-1200字'
      return `请根据以下信息撰写一份通知：

【通知事由】${data.title}
【通知内容】${data.content}
${data.deadline ? `【截止时间】${data.deadline}\n` : ''}${data.scope ? `【通知范围】${data.scope}\n` : ''}
要求：
1. 标题格式：关于XX的通知
2. 正文先写事由，再写具体要求
3. 要求清晰明确、可执行
4. ${wc}`
    }
  },
  {
    id: 'letter',
    name: '函件',
    icon: '✉️',
    category: 'admin',
    desc: '商洽函、询问函、答复函、催办函等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"函"类公文的撰写规范。你写的函件必须：1）标题格式规范（关于XX的函）；2）语气不卑不亢，符合平行文行文规范；3）事由清楚，诉求明确；4）用语得体规范。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '函件事由', placeholder: '如：关于协助查询XX客户账户信息的函', required: true, type: 'text' },
      { key: 'recipient', label: '收函单位', placeholder: '如：XX银行XX分行', required: true, type: 'text' },
      { key: 'content', label: '函件内容/诉求', placeholder: '如：因XX案件需要，请协助提供XX客户近半年交易流水', required: true, type: 'textarea' },
      { key: 'letterType', label: '函件类型', placeholder: '如：商洽函/询问函/答复函/催办函（留空默认商洽函）', required: false, type: 'text' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：500、800（留空则默认300-800字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数300-800字'
      return `请根据以下信息撰写一份函件：

【函件事由】${data.title}
【收函单位】${data.recipient}
【函件内容】${data.content}
${data.letterType ? `【函件类型】${data.letterType}\n` : ''}
要求：
1. 标题格式：关于XX的函
2. 语气不卑不亢，符合平行文规范
3. 事由清楚，诉求明确
4. 用语得体规范
5. ${wc}`
    }
  },
  {
    id: 'request',
    name: '请示',
    icon: '🙋',
    category: 'admin',
    desc: '请示批准、请示指示、请示审批等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"请示"类公文的撰写规范。你写的请示必须：1）一文一事，不夹带其他事项；2）请示理由充分、依据明确；3）请示事项具体清楚；4）语气恰当，用"妥否，请批示"等规范结尾。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '请示事由', placeholder: '如：关于增设XX社区支行的请示', required: true, type: 'text' },
      { key: 'reason', label: '请示理由/背景', placeholder: '如：该社区常住人口5万，周边无银行网点，金融服务需求旺盛', required: true, type: 'textarea' },
      { key: 'requestContent', label: '请示事项', placeholder: '如：拟在XX路XX号设立社区支行，面积约200平方米，配备人员5名', required: true, type: 'textarea' },
      { key: 'recipient', label: '主送单位', placeholder: '如：分行/总行', required: false, type: 'text' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：800、1500（留空则默认500-1200字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数500-1200字'
      return `请根据以下信息撰写一份请示：

【请示事由】${data.title}
【请示理由】${data.reason}
【请示事项】${data.requestContent}
${data.recipient ? `【主送单位】${data.recipient}\n` : ''}
要求：
1. 一文一事，不夹带其他事项
2. 理由充分，依据明确
3. 请示事项具体清楚
4. 语气恰当，用"妥否，请批示"等规范结尾
5. ${wc}`
    }
  },
  {
    id: 'bulletin',
    name: '通报',
    icon: '🔔',
    category: 'admin',
    desc: '表彰通报、批评通报、情况通报等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"通报"类公文的撰写规范。你写的通报必须：1）标题格式规范（关于XX的通报）；2）事实描述客观准确；3）定性分析有理有据；4）处理决定/要求明确具体；5）表彰用正面引导语气，批评用严肃规范语气。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '通报事由', placeholder: '如：关于XX支行违规办理业务的通报', required: true, type: 'text' },
      { key: 'bulletinType', label: '通报类型', placeholder: '如：表彰通报/批评通报/情况通报', required: true, type: 'text' },
      { key: 'facts', label: '通报事实', placeholder: '如：XX支行客户经理在办理XX业务时存在XX违规行为', required: true, type: 'textarea' },
      { key: 'decision', label: '处理决定/要求', placeholder: '如：给予XX行政处分，扣发绩效XX元，全行通报', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：800、1500（留空则默认500-1200字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数500-1200字'
      return `请根据以下信息撰写一份通报：

【通报事由】${data.title}
【通报类型】${data.bulletinType}
【通报事实】${data.facts}
${data.decision ? `【处理决定/要求】${data.decision}\n` : ''}
要求：
1. 标题格式：关于XX的通报
2. 事实描述客观准确
3. 定性分析有理有据
4. 处理决定/要求明确具体
5. ${wc}`
    }
  },
  {
    id: 'minutes',
    name: '会议纪要',
    icon: '📋',
    category: 'admin',
    desc: '专题会议纪要、协调会议纪要等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"会议纪要"的撰写规范。你写的会议纪要必须：1）格式规范：会议名称、时间、地点、主持人、参会人员、议题、议定事项；2）忠实反映会议内容，不得添枝加叶；3）议定事项明确具体、责任到人、有时限；4）用语简练规范。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'meetingName', label: '会议名称', placeholder: '如：XX支行2025年风险防控专题会议', required: true, type: 'text' },
      { key: 'meetingInfo', label: '会议基本信息', placeholder: '时间、地点、主持人、参会人员（如：2025年3月15日，支行会议室，张XX主持，各部门负责人参加）', required: true, type: 'text' },
      { key: 'topics', label: '会议议题', placeholder: '如：1.通报一季度风险情况 2.研究不良处置方案 3.部署二季度风控工作', required: true, type: 'textarea' },
      { key: 'decisions', label: '议定要点（已知）', placeholder: '如：1.成立不良处置专项小组 2.6月底前完成XX户不良清收', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：1000、2000（留空则默认800-1500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数800-1500字'
      return `请根据以下信息撰写一份会议纪要：

【会议名称】${data.meetingName}
【会议信息】${data.meetingInfo}
【会议议题】${data.topics}
${data.decisions ? `【议定要点】${data.decisions}\n` : ''}
要求：
1. 包含：会议名称、时间地点、参会人员、议题、议定事项
2. 忠实反映会议内容
3. 议定事项明确具体、责任到人、有时限
4. 用语简练规范
5. ${wc}`
    }
  },

  // ---- 汇报总结 ----
  {
    id: 'work-summary',
    name: '工作总结',
    icon: '📝',
    category: 'report',
    desc: '工作总结、季度总结、年度总结等',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行各类总结汇报的规范和要求。你写的工作总结必须：1）成果部分用数据说话，避免空泛描述；2）不足部分客观诚恳，不回避问题；3）计划部分具体可衡量；4）符合银行内部汇报规范；5）语言正式但不刻板。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'docType', label: '文种', placeholder: '如：工作总结/季度总结/年度总结', required: true, type: 'text' },
      { key: 'department', label: '汇报人/部门', placeholder: '如：风险管理部/XX支行', required: true, type: 'text' },
      { key: 'period', label: '汇报期间', placeholder: '如：2025年一季度', required: true, type: 'text' },
      { key: 'achievements', label: '主要工作成果', placeholder: '列出3-5项核心成果，尽量包含量化数据', required: true, type: 'textarea' },
      { key: 'issues', label: '存在的不足', placeholder: '如：不良率控制压力大，新发放贷款质量需关注', required: false, type: 'textarea' },
      { key: 'plans', label: '下一步计划', placeholder: '如：加强贷后管理、推进不良处置', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：1000、2000（留空则默认1000-2000字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数1000-2000字'
      return `请根据以下信息撰写一份${data.docType}：

【文种】${data.docType}
【汇报人/部门】${data.department}
【汇报期间】${data.period}
【主要工作成果】${data.achievements}
${data.issues ? `【存在的不足】${data.issues}\n` : ''}${data.plans ? `【下一步计划】${data.plans}\n` : ''}
要求：
1. 成果部分用数据说话，避免空泛描述
2. 不足部分客观诚恳
3. 计划部分具体可衡量
4. 符合银行内部汇报规范
5. ${wc}`
    }
  },
  {
    id: 'work-report',
    name: '工作报告',
    icon: '📊',
    category: 'report',
    desc: '专项工作报告、述职类报告等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"工作报告"类公文的撰写规范。你写的工作报告必须：1）向上级汇报工作进展或完成情况；2）内容全面、重点突出；3）数据翔实、分析到位；4）存在问题和建议有针对性；5）符合上行文规范。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'title', label: '报告事由', placeholder: '如：关于2025年上半年普惠金融工作推进情况的报告', required: true, type: 'text' },
      { key: 'department', label: '报告部门', placeholder: '如：普惠金融部/XX支行', required: true, type: 'text' },
      { key: 'progress', label: '工作进展/完成情况', placeholder: '如：新增普惠贷款XX万元，完成年度目标的XX%', required: true, type: 'textarea' },
      { key: 'problems', label: '存在问题', placeholder: '如：客户触达不足，产品竞争力待提升', required: false, type: 'textarea' },
      { key: 'suggestions', label: '工作建议', placeholder: '如：加大考核激励、优化审批流程', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：1500、2500（留空则默认1000-2000字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数1000-2000字'
      return `请根据以下信息撰写一份工作报告：

【报告事由】${data.title}
【报告部门】${data.department}
【工作进展】${data.progress}
${data.problems ? `【存在问题】${data.problems}\n` : ''}${data.suggestions ? `【工作建议】${data.suggestions}\n` : ''}
要求：
1. 向上级汇报工作进展或完成情况
2. 内容全面、重点突出
3. 数据翔实、分析到位
4. 存在问题和建议有针对性
5. ${wc}`
    }
  },
  {
    id: 'performance-report',
    name: '述职报告',
    icon: '🎯',
    category: 'report',
    desc: '个人述职、竞聘述职、年度述职等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"述职报告"的撰写规范。你写的述职报告必须：1）德能勤绩廉全面覆盖；2）业绩用数据和事实说话；3）自我评价客观中肯；4）不足剖析深入诚恳；5）改进方向明确具体；6）语言正式但有人情味。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'name', label: '述职人姓名/职务', placeholder: '如：张XX/XX支行副行长', required: true, type: 'text' },
      { key: 'period', label: '述职期间', placeholder: '如：2025年度', required: true, type: 'text' },
      { key: 'duties', label: '岗位职责', placeholder: '如：分管信贷业务和风险管理', required: true, type: 'text' },
      { key: 'achievements', label: '主要业绩', placeholder: '列出3-5项核心业绩，用量化数据', required: true, type: 'textarea' },
      { key: 'weaknesses', label: '自我剖析不足', placeholder: '如：创新意识不够强，对新业务学习需加强', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：1500、2500（留空则默认1500-2500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数1500-2500字'
      return `请根据以下信息撰写一份述职报告：

【述职人】${data.name}
【述职期间】${data.period}
【岗位职责】${data.duties}
【主要业绩】${data.achievements}
${data.weaknesses ? `【不足剖析】${data.weaknesses}\n` : ''}
要求：
1. 德能勤绩廉全面覆盖
2. 业绩用数据和事实说话
3. 自我评价客观中肯
4. 不足剖析深入诚恳，改进方向明确具体
5. ${wc}`
    }
  },
  {
    id: 'competitive-speech',
    name: '竞聘报告',
    icon: '🏆',
    category: 'report',
    desc: '竞聘上岗演讲稿、竞聘方案等',
    systemPrompt: '你是一名商业银行公文写作专家，精通"竞聘报告/演讲稿"的撰写。你写的竞聘报告必须：1）竞聘理由充分，展示个人优势；2）对岗位理解深刻到位；3）工作思路清晰、有创新点；4）目标具体可衡量；5）语气自信但不张扬，诚恳有感染力。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'target', label: '竞聘岗位', placeholder: '如：XX支行行长/信贷管理部总经理', required: true, type: 'text' },
      { key: 'name', label: '竞聘人姓名/现职务', placeholder: '如：李XX/现任XX支行副行长', required: true, type: 'text' },
      { key: 'advantages', label: '个人优势/竞聘理由', placeholder: '如：10年信贷经验，熟悉该区域市场，曾主导XX项目', required: true, type: 'textarea' },
      { key: 'vision', label: '工作思路/目标', placeholder: '如：1.强化风控 2.拓展普惠金融 3.提升人均产能', required: true, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '如：1500、2500（留空则默认1500-2500字）', required: false, type: 'text' },
    ],
    buildUserPrompt: (data) => {
      const wc = data.wordCount ? `字数控制在${data.wordCount}字左右` : '字数1500-2500字'
      return `请根据以下信息撰写一份竞聘报告：

【竞聘岗位】${data.target}
【竞聘人】${data.name}
【个人优势】${data.advantages}
【工作思路】${data.vision}
要求：
1. 竞聘理由充分，展示个人优势
2. 对岗位理解深刻到位
3. 工作思路清晰有创新点，目标具体可衡量
4. 语气自信不张扬，诚恳有感染力
5. ${wc}`
    }
  },
]

// ============ 文本处理 ============
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseDocument(text) {
  const cleanText = stripMarkdown(text)
  const lines = cleanText.split('\n')
  const elements = []
  let foundTitle = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) { elements.push({ type: 'empty' }); continue }

    if (!foundTitle) {
      elements.push({ type: 'title', content: trimmed })
      foundTitle = true
      continue
    }
    if (/^.{2,10}[：]$/.test(trimmed) && elements.some(e => e.type === 'title')) {
      elements.push({ type: 'recipient', content: trimmed }); continue
    }
    if (/^[一二三四五六七八九十]+、/.test(trimmed)) {
      elements.push({ type: 'section', content: trimmed }); continue
    }
    if (/^（[一二三四五六七八九十]+）/.test(trimmed)) {
      elements.push({ type: 'subsection', content: trimmed }); continue
    }
    if (/^附件[：:]/.test(trimmed)) {
      elements.push({ type: 'attachment', content: trimmed }); continue
    }
    if (/\d{4}年\d{1,2}月\d{1,2}日/.test(trimmed)) {
      elements.push({ type: 'signature', content: trimmed }); continue
    }
    elements.push({ type: 'body', content: trimmed })
  }
  return elements
}

// ============ 组件 ============
function ScenarioCard({ scenario, onSelect }) {
  return (
    <button
      onClick={() => onSelect(scenario)}
      className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:border-bank-300 hover:shadow-lg transition-all text-left group"
    >
      <div className="text-2xl mb-2">{scenario.icon}</div>
      <h3 className="text-base font-bold text-gray-900 group-hover:text-bank-600 transition-colors">{scenario.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{scenario.desc}</p>
    </button>
  )
}

function ApiKeySettings({ onClose }) {
  const [key, setKey] = useState(() => {
    try { return localStorage.getItem('bankai_api_key') || '' } catch { return '' }
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => { setApiKey(key); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const handleClear = () => { setKey(''); setApiKey(''); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const isCustom = key && key !== DEFAULT_API_KEY

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">⚙️ API 设置</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DeepSeek API Key</label>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-xxxxxxxxxxxxxxxx"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none" />
          <p className="text-xs text-gray-500 mt-1">留空则使用默认 Key。如默认 Key 余额不足，建议填入自己的 Key。</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <p className="font-medium mb-1">💡 如何获取自己的 Key？</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>访问 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-bank-600 underline">platform.deepseek.com</a></li>
            <li>注册/登录后进入「API Keys」页面</li>
            <li>创建新 Key 并复制到这里</li>
            <li>新用户有赠送额度，足够测试使用</li>
          </ol>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-bank-600 hover:bg-bank-700 text-white font-bold py-2 rounded-lg transition-colors">
            {saved ? '✓ 已保存' : '保存设置'}
          </button>
          {isCustom && (
            <button onClick={handleClear} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors">
              恢复默认
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ScenarioForm({ scenario, onGenerate, onBack, loading, error }) {
  const [formData, setFormData] = useState(() => {
    const initial = {}
    scenario.fields.forEach(f => { initial[f.key] = '' })
    return initial
  })

  const handleSubmit = (e) => { e.preventDefault(); onGenerate(formData) }
  const updateField = (key, value) => { setFormData(prev => ({ ...prev, [key]: value })) }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <button onClick={onBack} className="text-bank-600 hover:text-bank-700 font-medium mb-4 flex items-center gap-1">
        &larr; 返回选择场景
      </button>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">{scenario.icon}</span>
        <h3 className="text-xl font-bold text-gray-900">{scenario.name}</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {scenario.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea value={formData[field.key]} onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder} required={field.required} rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none resize-y" />
            ) : (
              <input type="text" value={formData[field.key]} onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder} required={field.required}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none" />
            )}
          </div>
        ))}
        <button type="submit" disabled={loading}
          className="w-full bg-bank-600 hover:bg-bank-700 disabled:bg-bank-400 text-white font-bold py-3 rounded-lg transition-colors text-lg">
          {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">&#9203;</span> AI 正在生成...</span> : '生成底稿'}
        </button>
      </form>
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <p className="font-medium mb-1">生成失败</p><p>{error}</p>
        </div>
      )}
    </div>
  )
}

function DocumentPreview({ content }) {
  const elements = parseDocument(content)
  const renderElement = (el, idx) => {
    switch (el.type) {
      case 'title': return <div key={idx} style={{ fontFamily: '"SimSun","宋体",serif', fontSize: '22pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '36pt', marginTop: '20pt', marginBottom: '12pt' }}>{el.content}</div>
      case 'recipient': return <div key={idx} style={{ fontFamily: '"仿宋_GB2312","FangSong_GB2312","仿宋","FangSong",serif', fontSize: '16pt', lineHeight: '28pt' }}>{el.content}</div>
      case 'section': return <div key={idx} style={{ fontFamily: '"SimHei","黑体",sans-serif', fontSize: '16pt', fontWeight: 'normal', textAlign: 'center', lineHeight: '28pt', marginTop: '12pt', marginBottom: '4pt' }}>{el.content}</div>
      case 'subsection': return <div key={idx} style={{ fontFamily: '"楷体_GB2312","KaiTi_GB2312","楷体","KaiTi",serif', fontSize: '16pt', fontWeight: 'bold', lineHeight: '28pt', textIndent: '2em' }}>{el.content}</div>
      case 'attachment': return <div key={idx} style={{ fontFamily: '"仿宋_GB2312","FangSong_GB2312","仿宋","FangSong",serif', fontSize: '16pt', lineHeight: '28pt', marginTop: '12pt', textIndent: '2em' }}>{el.content}</div>
      case 'signature': return <div key={idx} style={{ fontFamily: '"仿宋_GB2312","FangSong_GB2312","仿宋","FangSong",serif', fontSize: '16pt', lineHeight: '28pt', textAlign: 'right', marginTop: '24pt' }}>{el.content.split('\n').map((line, i) => <div key={i}>{line}</div>)}</div>
      case 'empty': return <div key={idx} style={{ height: '16pt' }} />
      default: return <div key={idx} style={{ fontFamily: '"仿宋_GB2312","FangSong_GB2312","仿宋","FangSong",serif', fontSize: '16pt', fontWeight: 'normal', lineHeight: '28pt', textIndent: '2em', textAlign: 'justify' }}>{el.content}</div>
    }
  }
  return (
    <div style={{ background: 'white', padding: '3.7cm 2.8cm 3.5cm 2.8cm', minHeight: '297mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', margin: '0 auto', maxWidth: '210mm' }}>
      {elements.map(renderElement)}
    </div>
  )
}

function ResultView({ content, onReset, scenario, isStreaming }) {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('preview')
  const contentRef = useRef(null)

  useEffect(() => {
    if (contentRef.current && isStreaming) contentRef.current.scrollTop = contentRef.current.scrollHeight
  }, [content, isStreaming])

  const cleanText = stripMarkdown(content)

  const handleCopyClean = () => {
    navigator.clipboard.writeText(cleanText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  const handlePrint = () => {
    const elements = parseDocument(content)
    const base = `font-family: "仿宋_GB2312","FangSong_GB2312","仿宋","FangSong",serif; font-size: 16pt; line-height: 28pt;`
    const renderLine = (el) => {
      switch (el.type) {
        case 'title': return `<div style="font-family: SimSun,宋体,serif; font-size: 22pt; font-weight: bold; text-align: center; line-height: 36pt; margin-top: 20pt; margin-bottom: 12pt;">${el.content}</div>`
        case 'recipient': return `<div style="${base}">${el.content}</div>`
        case 'section': return `<div style="font-family: SimHei,黑体,sans-serif; font-size: 16pt; font-weight: normal; text-align: center; line-height: 28pt; margin-top: 12pt; margin-bottom: 4pt;">${el.content}</div>`
        case 'subsection': return `<div style="font-family: 楷体_GB2312,KaiTi_GB2312,楷体,KaiTi,serif; font-size: 16pt; font-weight: bold; line-height: 28pt; text-indent: 2em;">${el.content}</div>`
        case 'attachment': return `<div style="${base} margin-top: 12pt; text-indent: 2em;">${el.content}</div>`
        case 'signature': return `<div style="${base} text-align: right; margin-top: 24pt;">${el.content.replace(/\n/g, '<br>')}</div>`
        case 'empty': return `<div style="height: 16pt;"></div>`
        default: return `<div style="${base} text-indent: 2em; text-align: justify;">${el.content}</div>`
      }
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>公文打印</title><style>@page { size: A4; margin: 3.7cm 2.8cm 3.5cm 2.8cm; } body { margin: 0; padding: 0; }</style></head><body>${elements.map(renderLine).join('\n')}</body></html>`
    const printWindow = window.open('', '_blank')
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); printWindow.onload = () => { printWindow.print() } }
  }

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{scenario.icon}</span>
          <h3 className="text-lg font-bold text-gray-900">{scenario.name}</h3>
          {isStreaming && <span className="animate-pulse text-bank-600 text-sm ml-2">生成中...</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isStreaming && (
            <>
              <button onClick={handleCopyClean} className="bg-bank-100 hover:bg-bank-200 text-bank-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                {copied ? '✓ 已复制' : '📋 复制纯文本'}
              </button>
              <button onClick={handlePrint} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                🖨️ 打印公文
              </button>
            </>
          )}
          <button onClick={onReset} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
            重新生成
          </button>
        </div>
      </div>
      {!isStreaming && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setViewMode('preview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${viewMode === 'preview' ? 'bg-white shadow text-bank-700' : 'text-gray-500 hover:text-gray-700'}`}>
            📄 公文预览
          </button>
          <button onClick={() => setViewMode('text')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${viewMode === 'text' ? 'bg-white shadow text-bank-700' : 'text-gray-500 hover:text-gray-700'}`}>
            📝 纯文本
          </button>
        </div>
      )}
      {viewMode === 'preview' && !isStreaming && (
        <div className="bg-gray-100 rounded-xl p-4 overflow-x-auto max-h-[75vh] overflow-y-auto">
          <DocumentPreview content={content} />
        </div>
      )}
      {(viewMode === 'text' || isStreaming) && (
        <div ref={contentRef} className="bg-gray-50 rounded-xl p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 border border-gray-200 max-h-[60vh] overflow-y-auto">
          {viewMode === 'text' && !isStreaming ? cleanText : content}
          {isStreaming && <span className="inline-block w-2 h-4 bg-bank-600 animate-pulse ml-0.5 align-middle"></span>}
        </div>
      )}
      {!isStreaming && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          以上内容由AI生成，请结合实际情况修改后使用 | "复制纯文本"可直接粘贴到Word，再用公文模板排版
        </p>
      )}
    </div>
  )
}

// ============ 主页面 ============
export default function ToolPage() {
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const abortRef = useRef(null)

  function parseError(err, statusCode) {
    const msg = err.message || ''
    if (err.name === 'TypeError' || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return '无法连接到 DeepSeek 服务。可能原因：\n① 当前网络环境屏蔽了 api.deepseek.com\n② 公司防火墙限制了外部 API 访问\n③ 建议：用手机流量测试，或在API设置中填入自己的Key'
    }
    if (err.name === 'AbortError') return '请求超时（60秒），公文内容较长，请稍后重试'
    if (statusCode === 401) return 'API Key 无效或已过期，请检查 Key 是否正确'
    if (statusCode === 402 || statusCode === 429 || msg.includes('Insufficient Balance') || msg.includes('balance')) {
      return 'API Key 余额不足。请填入自己的 DeepSeek API Key 继续使用'
    }
    if (statusCode >= 500) return 'DeepSeek 服务器暂时不可用，请稍后重试'
    return msg || `请求异常 (HTTP ${statusCode || '?'})`
  }

  const handleGenerate = async (formData) => {
    setLoading(true); setError(''); setResult(''); setIsStreaming(true)
    let statusCode = null
    try {
      const userPrompt = selectedScenario.buildUserPrompt(formData)
      const apiKey = getApiKey()
      const controller = new AbortController()
      abortRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: selectedScenario.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: true,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      statusCode = response.status
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error?.message || `HTTP ${response.status}`)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) { fullText += delta; setResult(fullText) }
            } catch {}
          }
        }
      }
      setIsStreaming(false)
    } catch (err) {
      setIsStreaming(false)
      setError(parseError(err, statusCode))
    } finally {
      setLoading(false); abortRef.current = null
    }
  }

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort()
    setResult(''); setSelectedScenario(null); setError(''); setIsStreaming(false)
  }

  // 有结果
  if (result && selectedScenario) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <ResultView content={result} onReset={handleReset} scenario={selectedScenario} isStreaming={isStreaming} />
        </div>
      </div>
    )
  }

  // 选了场景
  if (selectedScenario) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-20">
        <div className="max-w-xl mx-auto">
          <ScenarioForm scenario={selectedScenario} onGenerate={handleGenerate}
            onBack={() => { setSelectedScenario(null); setError('') }} loading={loading} error={error} />
        </div>
      </div>
    )
  }

  // 分类筛选
  const filteredScenarios = activeCategory === 'all'
    ? SCENARIOS
    : SCENARIOS.filter(s => s.category === activeCategory)

  // 主页
  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-bank-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">&#127974;</div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">选择你要写的材料</h1>
          <p className="text-gray-500 mt-2">3分钟出银行味底稿，复制就能交</p>
          <p className="text-bank-600 text-sm mt-1 font-medium">免费体验中，无需注册 · 已覆盖14种公文 · 支持自定义</p>
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <button onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all' ? 'bg-bank-600 text-white' : 'bg-white text-gray-600 hover:bg-bank-50 border border-gray-200'
            }`}>
            全部 ({SCENARIOS.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = SCENARIOS.filter(s => s.category === cat.id).length
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id ? 'bg-bank-600 text-white' : 'bg-white text-gray-600 hover:bg-bank-50 border border-gray-200'
                }`}>
                {cat.icon} {cat.name} ({count})
              </button>
            )
          })}
        </div>

        {/* 场景卡片 */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredScenarios.map(s => (
            <ScenarioCard key={s.id} scenario={s} onSelect={setSelectedScenario} />
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <div className="bg-bank-50 border border-bank-200 rounded-xl p-4 text-center">
            <p className="text-bank-700 text-sm">
              AI 生成的底稿请结合实际情况修改后使用，确保内容准确合规
            </p>
          </div>
          <div className="flex justify-center">
            <button onClick={() => setShowSettings(true)}
              className="text-gray-500 hover:text-bank-600 text-sm flex items-center gap-1 transition-colors">
              <span>⚙️</span> API 设置
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <ApiKeySettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
