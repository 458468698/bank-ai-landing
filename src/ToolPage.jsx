import { useState, useRef, useEffect } from 'react'

// ============ Worker API 地址 ============
// 部署 Cloudflare Worker 后替换为你的 Worker URL
const API_BASE = 'https://bank-ai-proxy.wyymij.workers.dev'

// ============ 场景配置 ============
const SCENARIOS = [
  {
    id: 'situation-report',
    name: '情况说明',
    icon: '📋',
    desc: '监管回复、情况说明、风险提示等',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行监管要求和公文规范。你写的情况说明必须：1）符合银行公文格式标准；2）术语精准、用词严谨；3）逻辑清晰、数据准确；4）语气客观、不使用模糊表述。请直接输出正文内容，不要加标题重述。',
    fields: [
      { key: 'title', label: '事由', placeholder: '如：关于XX支行2025年一季度不良贷款率上升的情况说明', required: true, type: 'text' },
      { key: 'facts', label: '关键数据和事实', placeholder: '如：不良率从2.1%上升至2.8%，主要受XX行业影响...', required: true, type: 'textarea' },
      { key: 'recipient', label: '报送对象', placeholder: '如：分行风险管理部/监管科室', required: false, type: 'text' },
      { key: 'measures', label: '已采取/拟采取的措施', placeholder: '如：已加强贷后检查频次，拟调整XX行业授信政策', required: false, type: 'textarea' },
    ],
    buildUserPrompt: (data) => `请根据以下信息撰写一份正式的情况说明：

【事由】${data.title}
${data.recipient ? `【报送对象】${data.recipient}` : ''}
【关键事实】${data.facts}
${data.measures ? `【应对措施】${data.measures}` : ''}

要求：
1. 标准公文格式（标题、主送、正文、落款）
2. 先概述事实，再分析原因，最后提出措施
3. 措辞严谨，不使用模糊表述
4. 字数800-1500字`
  },
  {
    id: 'risk-report',
    name: '风险分析报告',
    icon: '📊',
    desc: '信贷风险分析、行业风险研判等',
    systemPrompt: '你是一名商业银行风险分析专家，精通银行风险管理体系和监管要求。你写的风险分析报告必须：1）框架完整，涵盖概述、数据分析、风险识别、评估、建议；2）风险等级判断使用标准术语（低/中/高/较高）；3）数据引用准确，趋势判断有依据；4）建议措施具体可执行。请直接输出正文内容。',
    fields: [
      { key: 'reportType', label: '报告类型', placeholder: '如：信贷风险分析报告/行业风险分析报告', required: true, type: 'text' },
      { key: 'target', label: '分析对象', placeholder: '如：XX行业/XX支行信贷资产', required: true, type: 'text' },
      { key: 'period', label: '分析期间', placeholder: '如：2025年一季度', required: true, type: 'text' },
      { key: 'indicators', label: '关键数据指标', placeholder: '如：不良率2.8%，拨备覆盖率150%，关注类贷款占比...', required: true, type: 'textarea' },
      { key: 'risks', label: '已知风险点', placeholder: '如：XX行业集中度偏高，担保链风险暴露', required: false, type: 'textarea' },
    ],
    buildUserPrompt: (data) => `请根据以下信息撰写一份风险分析报告：

【报告类型】${data.reportType}
【分析对象】${data.target}
【分析期间】${data.period}
【关键数据指标】${data.indicators}
${data.risks ? `【已知风险点】${data.risks}` : ''}

要求：
1. 包含：概述、数据分析、风险识别、风险评估、建议措施
2. 风险等级判断使用标准术语
3. 建议措施具体可执行
4. 字数1500-2500字`
  },
  {
    id: 'work-summary',
    name: '工作总结',
    icon: '📝',
    desc: '工作总结、述职报告、汇报材料等',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行各类总结汇报的规范和要求。你写的工作总结必须：1）成果部分用数据说话，避免空泛描述；2）不足部分客观诚恳，不回避问题；3）计划部分具体可衡量；4）符合银行内部汇报规范；5）语言正式但不刻板。请直接输出正文内容。',
    fields: [
      { key: 'docType', label: '文种', placeholder: '如：工作总结/述职报告/季度汇报', required: true, type: 'text' },
      { key: 'department', label: '汇报人/部门', placeholder: '如：风险管理部/XX支行', required: true, type: 'text' },
      { key: 'period', label: '汇报期间', placeholder: '如：2025年一季度', required: true, type: 'text' },
      { key: 'achievements', label: '主要工作成果', placeholder: '列出3-5项核心成果，尽量包含量化数据', required: true, type: 'textarea' },
      { key: 'issues', label: '存在的不足', placeholder: '如：不良率控制压力大，新发放贷款质量需关注', required: false, type: 'textarea' },
      { key: 'plans', label: '下一步计划', placeholder: '如：加强贷后管理、推进不良处置', required: false, type: 'textarea' },
    ],
    buildUserPrompt: (data) => `请根据以下信息撰写一份${data.docType}：

【文种】${data.docType}
【汇报人/部门】${data.department}
【汇报期间】${data.period}
【主要工作成果】${data.achievements}
${data.issues ? `【存在的不足】${data.issues}` : ''}
${data.plans ? `【下一步计划】${data.plans}` : ''}

要求：
1. 成果部分用数据说话，避免空泛描述
2. 不足部分客观诚恳
3. 计划部分具体可衡量
4. 符合银行内部汇报规范
5. 字数1000-2000字`
  },
]

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

// ============ 表单组件 ============
function ScenarioForm({ scenario, onGenerate, onBack, loading }) {
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
    </div>
  )
}

// ============ 结果展示组件（支持流式逐字显示） ============
function ResultView({ content, onReset, scenario, isStreaming }) {
  const [copied, setCopied] = useState(false)
  const contentRef = useRef(null)

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, isStreaming])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{scenario.icon}</span>
          <h3 className="text-lg font-bold text-gray-900">{scenario.name} - 生成结果</h3>
          {isStreaming && <span className="animate-pulse text-bank-600 text-sm ml-2">生成中...</span>}
        </div>
        <div className="flex gap-2">
          {!isStreaming && (
            <button
              onClick={handleCopy}
              className="bg-bank-100 hover:bg-bank-200 text-bank-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {copied ? '已复制' : '复制全文'}
            </button>
          )}
          <button
            onClick={onReset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            重新生成
          </button>
        </div>
      </div>
      <div
        ref={contentRef}
        className="bg-gray-50 rounded-xl p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 border border-gray-200 max-h-[60vh] overflow-y-auto"
      >
        {content}
        {isStreaming && <span className="inline-block w-2 h-4 bg-bank-600 animate-pulse ml-0.5 align-middle"></span>}
      </div>
      {!isStreaming && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          以上内容由AI生成，请结合实际情况修改后使用
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
  const abortRef = useRef(null)

  // 调用 Worker 代理 API（流式）
  const handleGenerate = async (formData) => {
    setLoading(true)
    setError('')
    setResult('')
    setIsStreaming(true)

    try {
      const userPrompt = selectedScenario.buildUserPrompt(formData)

      const controller = new AbortController()
      abortRef.current = controller

      const response = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: selectedScenario.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `请求失败 (${response.status})`)
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
        buffer = lines.pop() // 保留未完成的行

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
      if (err.name === 'AbortError') {
        // 用户取消
      } else if (err.message?.includes('fetch') || err.message?.includes('Failed')) {
        setError('网络连接失败，请检查网络后重试')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
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
        <div className="max-w-3xl mx-auto">
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
          />
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 默认 → 显示场景选择（无需 API Key）
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

        <div className="mt-8 bg-bank-50 border border-bank-200 rounded-xl p-4 text-center">
          <p className="text-bank-700 text-sm">
            AI 生成的底稿请结合实际情况修改后使用，确保内容准确合规
          </p>
        </div>
      </div>
    </div>
  )
}
