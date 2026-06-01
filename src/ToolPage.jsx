import { useState, useRef, useEffect, useCallback } from 'react'

// ============ DeepSeek API 配置 ============
const DEFAULT_API_KEY = 'sk-9517c7bdde2c411892b0768ade314d80'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const API_TIMEOUT_MS = 60000 // 60秒超时（公文较长）

function getApiKey() {
  try {
    return localStorage.getItem('bankai_api_key') || DEFAULT_API_KEY
  } catch {
    return DEFAULT_API_KEY
  }
}

function setApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem('bankai_api_key', key.trim())
    } else {
      localStorage.removeItem('bankai_api_key')
    }
  } catch {}
}

// ============ 公文格式指令（所有场景共用） ============
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

// ============ 场景配置 ============
const SCENARIOS = [
  {
    id: 'situation-report',
    name: '情况说明',
    icon: '📋',
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
    id: 'risk-report',
    name: '风险分析报告',
    icon: '📊',
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
  {
    id: 'work-summary',
    name: '工作总结',
    icon: '📝',
    desc: '工作总结、述职报告、汇报材料等',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行各类总结汇报的规范和要求。你写的工作总结必须：1）成果部分用数据说话，避免空泛描述；2）不足部分客观诚恳，不回避问题；3）计划部分具体可衡量；4）符合银行内部汇报规范；5）语言正式但不刻板。' + FORMAT_INSTRUCTION,
    fields: [
      { key: 'docType', label: '文种', placeholder: '如：工作总结/述职报告/季度汇报', required: true, type: 'text' },
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
]

// ============ 文本处理工具 ============
// 去除AI输出中的残留Markdown符号，生成干净纯文本
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')           // 去掉 # 标题标记
    .replace(/\*\*(.+?)\*\*/g, '$1')        // 去掉 **加粗**
    .replace(/\*(.+?)\*/g, '$1')            // 去掉 *斜体*
    .replace(/__(.+?)__/g, '$1')            // 去掉 __加粗__
    .replace(/_(.+?)_/g, '$1')              // 去掉 _斜体_
    .replace(/`(.+?)`/g, '$1')              // 去掉 `代码`
    .replace(/^[-*+]\s+/gm, '')             // 去掉无序列表标记
    .replace(/^>\s+/gm, '')                 // 去掉引用标记
    .replace(/~~(.+?)~~/g, '$1')            // 去掉 ~~删除线~~
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')     // 去掉链接，保留文字
    .replace(/\n{3,}/g, '\n\n')             // 多个空行合并为两个
    .trim()
}

// 解析公文结构，用于格式化预览
function parseDocument(text) {
  const cleanText = stripMarkdown(text)
  const lines = cleanText.split('\n')
  const elements = []
  let foundTitle = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      elements.push({ type: 'empty' })
      continue
    }

    // 标题检测：第一个非空行，或包含"关于...的"模式
    if (!foundTitle) {
      elements.push({ type: 'title', content: trimmed })
      foundTitle = true
      continue
    }

    // 主送对象：以"XX："结尾且很短
    if (/^.{2,10}[：]$/.test(trimmed) && elements.some(e => e.type === 'title')) {
      elements.push({ type: 'recipient', content: trimmed })
      continue
    }

    // 章节标题：一、二、三、
    if (/^[一二三四五六七八九十]+、/.test(trimmed)) {
      elements.push({ type: 'section', content: trimmed })
      continue
    }

    // 条节标题：（一）（二）（三）
    if (/^（[一二三四五六七八九十]+）/.test(trimmed)) {
      elements.push({ type: 'subsection', content: trimmed })
      continue
    }

    // 附件标记
    if (/^附件[：:]/.test(trimmed)) {
      elements.push({ type: 'attachment', content: trimmed })
      continue
    }

    // 落款：包含"年月日"或很短且在文末
    if (/\d{4}年\d{1,2}月\d{1,2}日/.test(trimmed)) {
      elements.push({ type: 'signature', content: trimmed })
      continue
    }

    // 普通正文
    elements.push({ type: 'body', content: trimmed })
  }

  return elements
}

// ============ 场景选择卡片 ============
function ScenarioCard({ scenario, onSelect }) {
  return (
    <button
      onClick={() => onSelect(scenario)}
      className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:border-bank-300 hover:shadow-lg transition-all text-left group"
    >
      <div className="text-3xl mb-3">{scenario.icon}</div>
      <h3 className="text-lg font-bold text-gray-900 group-hover:text-bank-600 transition-colors">{scenario.name}</h3>
      <p className="text-sm text-gray-500 mt-1">{scenario.desc}</p>
    </button>
  )
}

// ============ API Key 设置面板 ============
function ApiKeySettings({ onClose }) {
  const [key, setKey] = useState(() => {
    try { return localStorage.getItem('bankai_api_key') || '' } catch { return '' }
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    setKey('')
    setApiKey('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isCustom = key && key !== DEFAULT_API_KEY

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">⚙️ API 设置</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DeepSeek API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">
            留空则使用默认 Key。如默认 Key 余额不足，建议填入自己的 Key。
          </p>
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
          <button
            onClick={handleSave}
            className="flex-1 bg-bank-600 hover:bg-bank-700 text-white font-bold py-2 rounded-lg transition-colors"
          >
            {saved ? '✓ 已保存' : '保存设置'}
          </button>
          {isCustom && (
            <button
              onClick={handleClear}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
            >
              恢复默认
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ 表单组件 ============
function ScenarioForm({ scenario, onGenerate, onBack, loading, error }) {
  const [formData, setFormData] = useState(() => {
    const initial = {}
    scenario.fields.forEach(f => { initial[f.key] = '' })
    return initial
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onGenerate(formData)
  }

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

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
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all resize-y"
              />
            ) : (
              <input
                type="text"
                value={formData[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-bank-600 hover:bg-bank-700 disabled:bg-bank-400 text-white font-bold py-3 rounded-lg transition-colors text-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">&#9203;</span> AI 正在生成...
            </span>
          ) : '生成底稿'}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <p className="font-medium mb-1">生成失败</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

// ============ 公文格式预览组件 ============
function DocumentPreview({ content }) {
  const elements = parseDocument(content)

  const renderElement = (el, idx) => {
    switch (el.type) {
      case 'title':
        return (
          <div key={idx} className="doc-title" style={{
            fontFamily: '"SimSun", "宋体", serif',
            fontSize: '22pt',
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: '36pt',
            marginTop: '20pt',
            marginBottom: '12pt',
          }}>
            {el.content}
          </div>
        )
      case 'recipient':
        return (
          <div key={idx} style={{
            fontFamily: '"仿宋_GB2312", "FangSong_GB2312", "仿宋", "FangSong", serif',
            fontSize: '16pt',
            lineHeight: '28pt',
          }}>
            {el.content}
          </div>
        )
      case 'section':
        return (
          <div key={idx} className="doc-section" style={{
            fontFamily: '"SimHei", "黑体", sans-serif',
            fontSize: '16pt',
            fontWeight: 'normal',
            textAlign: 'center',
            lineHeight: '28pt',
            marginTop: '12pt',
            marginBottom: '4pt',
          }}>
            {el.content}
          </div>
        )
      case 'subsection':
        return (
          <div key={idx} className="doc-subsection" style={{
            fontFamily: '"楷体_GB2312", "KaiTi_GB2312", "楷体", "KaiTi", serif',
            fontSize: '16pt',
            fontWeight: 'bold',
            lineHeight: '28pt',
            textIndent: '2em',
          }}>
            {el.content}
          </div>
        )
      case 'attachment':
        return (
          <div key={idx} style={{
            fontFamily: '"仿宋_GB2312", "FangSong_GB2312", "仿宋", "FangSong", serif',
            fontSize: '16pt',
            lineHeight: '28pt',
            marginTop: '12pt',
            textIndent: '2em',
          }}>
            {el.content}
          </div>
        )
      case 'signature':
        return (
          <div key={idx} style={{
            fontFamily: '"仿宋_GB2312", "FangSong_GB2312", "仿宋", "FangSong", serif',
            fontSize: '16pt',
            lineHeight: '28pt',
            textAlign: 'right',
            marginTop: '24pt',
          }}>
            {el.content.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )
      case 'empty':
        return <div key={idx} style={{ height: '16pt' }} />
      case 'body':
      default:
        return (
          <div key={idx} className="doc-body" style={{
            fontFamily: '"仿宋_GB2312", "FangSong_GB2312", "仿宋", "FangSong", serif',
            fontSize: '16pt',
            fontWeight: 'normal',
            lineHeight: '28pt',
            textIndent: '2em',
            textAlign: 'justify',
          }}>
            {el.content}
          </div>
        )
    }
  }

  return (
    <div className="doc-preview-page" style={{
      background: 'white',
      padding: '3.7cm 2.8cm 3.5cm 2.8cm',
      minHeight: '297mm',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      margin: '0 auto',
      maxWidth: '210mm',
    }}>
      {elements.map(renderElement)}
    </div>
  )
}

// ============ 结果展示组件（支持公文预览+纯文本+打印） ============
function ResultView({ content, onReset, scenario, isStreaming }) {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('preview') // 'preview' | 'text'
  const contentRef = useRef(null)

  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, isStreaming])

  const cleanText = stripMarkdown(content)

  const handleCopyClean = () => {
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePrint = () => {
    const elements = parseDocument(content)
    const renderLine = (el) => {
      const base = `font-family: "仿宋_GB2312", "FangSong_GB2312", "仿宋", "FangSong", serif; font-size: 16pt; line-height: 28pt;`
      switch (el.type) {
        case 'title':
          return `<div style="font-family: SimSun,宋体,serif; font-size: 22pt; font-weight: bold; text-align: center; line-height: 36pt; margin-top: 20pt; margin-bottom: 12pt;">${el.content}</div>`
        case 'recipient':
          return `<div style="${base}">${el.content}</div>`
        case 'section':
          return `<div style="font-family: SimHei,黑体,sans-serif; font-size: 16pt; font-weight: normal; text-align: center; line-height: 28pt; margin-top: 12pt; margin-bottom: 4pt;">${el.content}</div>`
        case 'subsection':
          return `<div style="font-family: 楷体_GB2312,KaiTi_GB2312,楷体,KaiTi,serif; font-size: 16pt; font-weight: bold; line-height: 28pt; text-indent: 2em;">${el.content}</div>`
        case 'attachment':
          return `<div style="${base} margin-top: 12pt; text-indent: 2em;">${el.content}</div>`
        case 'signature':
          return `<div style="${base} text-align: right; margin-top: 24pt;">${el.content.replace(/\n/g, '<br>')}</div>`
        case 'empty':
          return `<div style="height: 16pt;"></div>`
        default:
          return `<div style="${base} text-indent: 2em; text-align: justify;">${el.content}</div>`
      }
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>公文打印</title>
<style>
  @page { size: A4; margin: 3.7cm 2.8cm 3.5cm 2.8cm; }
  body { margin: 0; padding: 0; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
${elements.map(renderLine).join('\n')}
<div style="text-align: center; font-family: 仿宋_GB2312,FangSong_GB2312,仿宋,FangSong,serif; font-size: 12pt; margin-top: 40pt; color: #999;">- 页码 -</div>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
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
              <button
                onClick={handleCopyClean}
                className="bg-bank-100 hover:bg-bank-200 text-bank-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {copied ? '✓ 已复制' : '📋 复制纯文本'}
              </button>
              <button
                onClick={handlePrint}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                🖨️ 打印公文
              </button>
            </>
          )}
          <button
            onClick={onReset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            重新生成
          </button>
        </div>
      </div>

      {/* 视图切换 */}
      {!isStreaming && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('preview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'preview' ? 'bg-white shadow text-bank-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 公文预览
          </button>
          <button
            onClick={() => setViewMode('text')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'text' ? 'bg-white shadow text-bank-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 纯文本
          </button>
        </div>
      )}

      {/* 公文格式预览 */}
      {viewMode === 'preview' && !isStreaming && (
        <div className="bg-gray-100 rounded-xl p-4 overflow-x-auto max-h-[75vh] overflow-y-auto">
          <DocumentPreview content={content} />
        </div>
      )}

      {/* 纯文本视图 */}
      {(viewMode === 'text' || isStreaming) && (
        <div
          ref={contentRef}
          className="bg-gray-50 rounded-xl p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 border border-gray-200 max-h-[60vh] overflow-y-auto"
        >
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

// ============ 主工具页面 ============
export default function ToolPage() {
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const abortRef = useRef(null)

  // 解析友好的错误信息
  function parseError(err, statusCode) {
    const msg = err.message || ''

    if (err.name === 'TypeError' || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return '无法连接到 DeepSeek 服务。可能原因：\n① 当前网络环境屏蔽了 api.deepseek.com\n② 公司防火墙限制了外部 API 访问\n③ 建议：用手机流量测试，或在API设置中填入自己的Key'
    }

    if (err.name === 'AbortError') {
      return '请求超时（60秒），公文内容较长，请稍后重试'
    }

    if (statusCode === 401) {
      return 'API Key 无效或已过期，请检查 Key 是否正确'
    }
    if (statusCode === 402 || statusCode === 429 || msg.includes('Insufficient Balance') || msg.includes('balance')) {
      return 'API Key 余额不足。请填入自己的 DeepSeek API Key 继续使用'
    }
    if (statusCode >= 500) {
      return 'DeepSeek 服务器暂时不可用，请稍后重试'
    }

    return msg || `请求异常 (HTTP ${statusCode || '?'})`
  }

  // 直接调用 DeepSeek API（流式）
  const handleGenerate = async (formData) => {
    setLoading(true)
    setError('')
    setResult('')
    setIsStreaming(true)

    let statusCode = null

    try {
      const userPrompt = selectedScenario.buildUserPrompt(formData)
      const apiKey = getApiKey()

      const controller = new AbortController()
      abortRef.current = controller

      const timeoutId = setTimeout(() => {
        controller.abort()
      }, API_TIMEOUT_MS)

      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
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

      // 流式读取 SSE
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
              if (delta) {
                fullText += delta
                setResult(fullText)
              }
            } catch {
              // 跳过无法解析的行
            }
          }
        }
      }

      setIsStreaming(false)
    } catch (err) {
      setIsStreaming(false)
      if (err.name === 'AbortError' && loading) {
        // 超时导致的 abort
      }
      setError(parseError(err, statusCode))
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  // 重新生成
  const handleReset = () => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    setResult('')
    setSelectedScenario(null)
    setError('')
    setIsStreaming(false)
  }

  // 有结果 → 显示结果
  if (result && selectedScenario) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <ResultView
            content={result}
            onReset={handleReset}
            scenario={selectedScenario}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    )
  }

  // 选了场景 → 显示表单
  if (selectedScenario) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-20">
        <div className="max-w-xl mx-auto">
          <ScenarioForm
            scenario={selectedScenario}
            onGenerate={handleGenerate}
            onBack={() => { setSelectedScenario(null); setError('') }}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    )
  }

  // 默认 → 显示场景选择
  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-bank-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">&#127974;</div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">选择你要写的材料</h1>
          <p className="text-gray-500 mt-2">3分钟出银行味底稿，复制就能交</p>
          <p className="text-bank-600 text-sm mt-1 font-medium">免费体验中，无需注册</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {SCENARIOS.map(s => (
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
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-500 hover:text-bank-600 text-sm flex items-center gap-1 transition-colors"
            >
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
